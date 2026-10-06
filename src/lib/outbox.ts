import NetInfo from "@react-native-community/netinfo";
import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";
import { AppState } from "react-native";

import { isOffline } from "./network";

/**
 * A persisted FIFO of writes waiting for the server (the "outbox"). Screens apply a change on the device
 * at once and enqueue it here; the queue replays it when there is a connection and a signed-in owner.
 * Generic: features register a handler per op kind, which throws the server's error when it fails.
 *
 * Rules: one flush at a time; ops of other accounts never run (they're dropped when someone else signs
 * in); a failed op blocks the ops behind it (they may depend on it) and waits min(2s·2^n, 5min) with
 * jitter; classify() decides whether an error means done, try again, or give up.
 */

export interface OutboxOp<P = unknown> {
  id: string;
  kind: string;
  /** The auth user the op belongs to; only that user's session may send it. */
  owner: string;
  payload: P;
  /** A newer op with the same key replaces a waiting one instead of queueing twice. */
  dedupeKey?: string;
  createdAt: number;
  /** Tries so far (drives the backoff). */
  attempts: number;
  /** Server-side failures (not counting "no connection"); past MAX_FAILURES the op is dropped. */
  failures: number;
  nextAt: number;
}

export type OutboxHandler<P = unknown> = (payload: P, op: OutboxOp<P>) => Promise<void>;
export type Outcome = "done" | "retry" | "drop";

const QUEUE_KEY = "al-manara:outbox:v1";
const USER_KEY = "al-manara:outbox:user:v1";
const OWNED_KEY = "al-manara:outbox:owned:v1";
export const BASE_DELAY_MS = 2000;
export const MAX_DELAY_MS = 5 * 60 * 1000;
export const MAX_FAILURES = 8;

// ── Error classification ─────────────────────────────────────────────────────

interface ErrorLike {
  code?: unknown;
  status?: unknown;
  message?: unknown;
  name?: unknown;
}

/** No response from the server at all (fetch failed, timed out, offline). */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (!error || typeof error !== "object") return true;
  const { code, status, message } = error as ErrorLike;
  if (typeof status === "number" && status > 0) return false;
  if (typeof code === "string" && code !== "") return false;
  // supabase-js reports a failed fetch as { code: "", status: 0, message: "TypeError: Network request failed" }.
  if (typeof message === "string" && /network|fetch|timed? ?out|abort/i.test(message)) return true;
  // A plain Error with no code is a bug in a handler, not the connection: it must count toward the
  // failure limit, or it would block the queue forever.
  return !(error instanceof Error);
}

/** What to do with an op whose handler threw `error`. */
export function classify(error: unknown): Outcome {
  if (isNetworkError(error)) return "retry";
  const { code, status, message } = error as ErrorLike;
  const text = typeof message === "string" ? message : "";
  // Unexpected (codeless) errors are retried, but count as failures, so they drop after the limit.
  if ((code === undefined || code === "") && status === undefined) return "retry";
  // Already on the server (the same row was sent before): the op did its job.
  if (code === "23505") return "done";
  // An expired session refreshes itself; try again after.
  if (code === "PGRST301" || code === "PGRST303" || /jwt expired/i.test(text) || status === 401) return "retry";
  // RLS, missing parent row: sending it again can't help.
  if (code === "42501" || code === "23503") return "drop";
  if (typeof status === "number" && (status >= 500 || status === 408 || status === 429)) return "retry";
  // Connection, transaction-conflict, resource and shutdown classes of Postgres errors are temporary.
  if (typeof code === "string" && /^(08|40|53|57)/.test(code)) return "retry";
  return "drop";
}

/** min(2s·2^n, 5min), ±20% so many devices don't come back at the same moment. */
export function backoffDelay(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(BASE_DELAY_MS * 2 ** Math.max(0, attempt), MAX_DELAY_MS);
  return Math.round(base * (0.8 + 0.4 * random()));
}

// ── State ────────────────────────────────────────────────────────────────────

let queue: OutboxOp[] | null = null;
let user: string | null = null;
let online = true;
let started = false;
let flushing: Promise<void> | null = null;
let again = false;
let againForce = false;
let inFlight: string | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const handlers = new Map<string, OutboxHandler<never>>();
const listeners = new Set<() => void>();
const settledListeners = new Set<(op: OutboxOp, outcome: Outcome) => void>();
const drainedListeners = new Set<() => void>();

function load(): OutboxOp[] {
  if (queue) return queue;
  try {
    const parsed = JSON.parse(Storage.getItemSync(QUEUE_KEY) ?? "[]") as unknown;
    queue = Array.isArray(parsed) ? (parsed as OutboxOp[]) : [];
  } catch {
    queue = [];
  }
  return queue;
}

function persist() {
  try {
    Storage.setItemSync(QUEUE_KEY, JSON.stringify(load()));
  } catch {
    // Kept in memory for this session.
  }
}

let status = { pending: 0, failing: false };

function notify() {
  const mine = load().filter((op) => op.owner === user);
  const failing = mine.some((op) => op.attempts > 0);
  if (mine.length !== status.pending || failing !== status.failing) status = { pending: mine.length, failing };
  listeners.forEach((listener) => listener());
}

let idCounter = 0;

function newId(): string {
  idCounter += 1;
  return `${Date.now().toString(36)}-${idCounter.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ── Public API ───────────────────────────────────────────────────────────────

/** How a kind of op reaches the server. Throw the server's error (with `status` when known) to fail. */
export function registerHandler<P>(kind: string, handler: OutboxHandler<P>) {
  handlers.set(kind, handler as OutboxHandler<never>);
}

export interface EnqueueInput<P> {
  kind: string;
  owner: string;
  payload: P;
  dedupeKey?: string;
}

/** Queues an op (or replaces the waiting one with the same dedupeKey) and tries to send it. */
export function enqueue<P>(input: EnqueueInput<P>): OutboxOp<P> {
  const ops = load();
  const op: OutboxOp<P> = { id: newId(), createdAt: Date.now(), attempts: 0, failures: 0, nextAt: 0, ...input };
  const index = input.dedupeKey
    ? ops.findIndex((entry) => entry.dedupeKey === input.dedupeKey && entry.owner === input.owner && entry.id !== inFlight)
    : -1;
  if (index >= 0) ops[index] = op;
  else ops.push(op);
  persist();
  notify();
  void flushOutbox();
  return op;
}

/** The waiting ops of `owner` (default: the signed-in user), oldest first. */
export function pendingOps(owner: string | null = user): OutboxOp[] {
  return owner ? load().filter((op) => op.owner === owner) : [];
}

export function pendingCount(owner: string | null = user): number {
  return pendingOps(owner).length;
}

/** Called when an op leaves the queue: "done" (on the server) or "drop" (rejected for good). */
export function onSettled(listener: (op: OutboxOp, outcome: Outcome) => void): () => void {
  settledListeners.add(listener);
  return () => settledListeners.delete(listener);
}

/** Called when a flush that sent something leaves nothing of the current user waiting. */
export function onDrained(listener: () => void): () => void {
  drainedListeners.add(listener);
  return () => drainedListeners.delete(listener);
}

/**
 * Who is signed in (null after sign-out: their ops wait for them). A different account signing in
 * drops the previous account's ops and its cached snapshots.
 */
export function setOutboxUser(userId: string | null) {
  if (userId) {
    let last: string | null = null;
    try {
      last = Storage.getItemSync(USER_KEY);
    } catch {
      // Treated as a new account below.
    }
    const ops = load();
    const kept = ops.filter((op) => op.owner === userId || op.id === inFlight);
    if (kept.length !== ops.length) {
      queue = kept;
      persist();
    }
    if (last !== userId) {
      if (last) clearOwned();
      try {
        Storage.setItemSync(USER_KEY, userId);
      } catch {
        // Next sign-in compares again.
      }
    }
  }
  user = userId;
  notify();
  // Signed in (or the session reloaded): a good moment to send what's waiting.
  if (userId) void flushOutbox({ force: true });
}

export function outboxUser(): string | null {
  return user;
}

/** Sends what's waiting now. `force` ignores the backoff (the connection or session just came back). */
export function flushOutbox(options?: { force?: boolean }): Promise<void> {
  if (flushing) {
    again = true;
    if (options?.force) againForce = true;
    return flushing;
  }
  flushing = (async () => {
    let force = !!options?.force;
    do {
      again = false;
      await run(force);
      force = againForce;
      againForce = false;
    } while (again);
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/** Tries to send everything within `timeoutMs`; resolves with how many ops are still waiting. */
export async function waitForSync(timeoutMs: number): Promise<number> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  await Promise.race([
    flushOutbox({ force: true }),
    new Promise<void>((resolve) => {
      timeout = setTimeout(resolve, timeoutMs);
    }),
  ]);
  if (timeout) clearTimeout(timeout);
  return pendingCount();
}

/** Drops every op (all accounts) and the cached snapshots. */
export function clearOutbox() {
  queue = [];
  persist();
  clearOwned();
  if (timer) clearTimeout(timer);
  timer = null;
  notify();
}

/** Sync badge state for the signed-in user: ops waiting, and whether any has failed at least once. */
export function useSyncStatus(): { pending: number; failing: boolean } {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => status,
  );
}

/** Wires the triggers (back online, app foreground) once; call from the root layout. */
export function startOutbox() {
  if (started) return;
  started = true;
  NetInfo.addEventListener((state) => {
    const wasOnline = online;
    online = !isOffline(state);
    if (online && !wasOnline) void flushOutbox({ force: true });
  });
  AppState.addEventListener("change", (next) => {
    if (next === "active") void flushOutbox({ force: true });
  });
  void flushOutbox({ force: true });
}

// ── Flush ────────────────────────────────────────────────────────────────────

function schedule(delay: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(
    () => {
      timer = null;
      void flushOutbox();
    },
    Math.max(0, delay),
  );
}

function emitSettled(op: OutboxOp, outcome: Outcome) {
  settledListeners.forEach((listener) => {
    try {
      listener(op, outcome);
    } catch {
      // A listener's bug mustn't stop the queue.
    }
  });
}

async function run(force: boolean) {
  let sent = 0;
  for (;;) {
    if (!user || !online) return;
    const owner = user;
    // Ops of a kind nobody registered yet (its feature isn't loaded) wait without blocking others.
    const op = load().find((entry) => entry.owner === owner && handlers.has(entry.kind));
    if (!op) break;
    const now = Date.now();
    if (!force && op.nextAt > now) {
      schedule(op.nextAt - now);
      return;
    }
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    inFlight = op.id;
    let outcome: Outcome = "done";
    let error: unknown = null;
    try {
      await handlers.get(op.kind)!(op.payload as never, op as OutboxOp<never>);
    } catch (caught) {
      error = caught;
      outcome = classify(caught);
    }
    inFlight = null;
    // Cleared or replaced while it was being sent.
    const current = load().find((entry) => entry.id === op.id);
    if (!current) continue;

    if (outcome === "retry") {
      current.attempts += 1;
      if (!isNetworkError(error)) current.failures += 1;
      if (current.failures > MAX_FAILURES) outcome = "drop";
      else {
        current.nextAt = Date.now() + backoffDelay(current.attempts - 1);
        persist();
        notify();
        schedule(current.nextAt - Date.now());
        return;
      }
    }
    if (outcome === "drop" && __DEV__) console.warn(`[outbox] dropped ${op.kind}`, error);
    queue = load().filter((entry) => entry.id !== op.id);
    persist();
    notify();
    sent += 1;
    force = false;
    emitSettled(current, outcome);
  }
  if (sent > 0 && pendingCount() === 0) drainedListeners.forEach((listener) => listener());
}

// ── Per-account caches ───────────────────────────────────────────────────────

function ownedKeys(): string[] {
  try {
    const parsed = JSON.parse(Storage.getItemSync(OWNED_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

/** Reads a cache entry that belongs to the signed-in account (cleared when another account signs in). */
export function readOwned<T>(key: string): T | null {
  try {
    return JSON.parse(Storage.getItemSync(key) ?? "null") as T | null;
  } catch {
    return null;
  }
}

export function writeOwned(key: string, value: unknown) {
  try {
    Storage.setItemSync(key, JSON.stringify(value));
    const keys = ownedKeys();
    if (!keys.includes(key)) Storage.setItemSync(OWNED_KEY, JSON.stringify([...keys, key]));
  } catch {
    // The cache is only a convenience.
  }
}

function clearOwned() {
  try {
    for (const key of ownedKeys()) Storage.removeItemSync(key);
    Storage.removeItemSync(OWNED_KEY);
  } catch {
    // Best effort.
  }
}

/** Forgets the in-memory state so a test can reload it from storage. */
export function resetOutboxForTests() {
  if (timer) clearTimeout(timer);
  queue = null;
  user = null;
  online = true;
  started = false;
  flushing = null;
  again = false;
  againForce = false;
  inFlight = null;
  timer = null;
  handlers.clear();
  settledListeners.clear();
  drainedListeners.clear();
  status = { pending: 0, failing: false };
}

/** For handlers: throws a `{ error, status }` response's error with its HTTP status, for classify(). */
export function throwIfError({ error, status }: { error: unknown; status: number }) {
  if (error) throw Object.assign({}, error, { status });
}
