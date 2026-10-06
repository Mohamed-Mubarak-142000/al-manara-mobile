import * as Crypto from "expo-crypto";
import Storage from "expo-sqlite/kv-store";
import { useEffect, useSyncExternalStore } from "react";

import { nextPortion, pagesForDuration, TOTAL_AYAHS } from "@/core/khatma/schedule";
import { planDay } from "@/core/plan/schedule";
import { activeLearnerId, activeLearnerIdNow, currentUserIdNow, useAccount } from "@/features/account/accountStore";
import { recordActivity } from "@/features/journey/progress";
import { mushafBoundaries } from "@/features/mushaf/mushaf";
import { track } from "@/lib/telemetry";
import type { KhatmaRow, KhatmaUnit } from "@/lib/database.types";
import { enqueue, onDrained, onSettled, pendingOps, readOwned, writeOwned } from "@/lib/outbox";
import { supabase } from "@/lib/supabase";

import { EMPTY_KHATMA, rebaseKhatma, reduceKhatma, withFinished, type KhatmaOp, type KhatmaSnapshot } from "./reducer";
import { KHATMA_OP, type KhatmaSyncPayload } from "./sync";
import type { KhatmaWithLog } from "./types";

/**
 * The current khatma, with the website's rules (features/khatma/actions.ts). Signed in: the learner's
 * own khatmas/khatma_log rows, so it follows them to the website. Guest: the same shape on this device.
 *
 * Local-first: a step applies on the device at once and goes through the outbox, so it works offline
 * and syncs when the connection is back. What's shown = the last server state seen (kept per learner
 * on the device) with the steps still waiting replayed on top.
 */

export type KhatmaState =
  | { status: "loading" }
  | { status: "ready"; current: KhatmaWithLog | null; owner: string | null }
  /** Signed in, never loaded on this device, and the server can't be reached: we don't know yet. */
  | { status: "unavailable"; owner: string };

export interface NewKhatma {
  mode: "amount" | "duration";
  unit: KhatmaUnit;
  perSession: number;
  targetDay: string;
  days: number[];
}

export type KhatmaResult = { ok: true } | { ok: false; error: string };

const LOCAL_KEY = "al-manara:khatma:v1";
const snapshotKey = (learnerId: string) => `al-manara:khatma:snap:v1:${learnerId}`;
const NO_KHATMA = "لا توجد ختمة جارية.";

let state: KhatmaState = { status: "loading" };
const listeners = new Set<() => void>();

function set(next: KhatmaState) {
  state = next;
  listeners.forEach((notify) => notify());
}

// ── Guest storage ────────────────────────────────────────────────────────────

function readLocal(): KhatmaSnapshot {
  try {
    return (JSON.parse(Storage.getItemSync(LOCAL_KEY) ?? "null") as KhatmaSnapshot | null) ?? EMPTY_KHATMA;
  } catch {
    return EMPTY_KHATMA;
  }
}

function writeLocal(next: KhatmaSnapshot) {
  Storage.setItemSync(LOCAL_KEY, JSON.stringify(next));
  if (viewing === null) set({ status: "ready", current: withFinished(next), owner: null });
}

// ── Account storage (the website's loadCurrentKhatma) ────────────────────────

/** Throws when the server can't be reached, so a failed load never reads as "no khatma". */
async function loadRemote(learnerId: string): Promise<KhatmaSnapshot> {
  if (!supabase) throw new Error("no backend");
  const [current, completed] = await Promise.all([
    supabase
      .from("khatmas")
      .select("*")
      .eq("learner_id", learnerId)
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("khatmas").select("id", { count: "exact", head: true }).eq("learner_id", learnerId).not("completed_at", "is", null),
  ]);
  if (current.error) throw current.error;
  if (completed.error) throw completed.error;
  const finished = completed.count ?? 0;
  if (!current.data) return { current: null, finished };
  const log = await supabase
    .from("khatma_log")
    .select("day, from_ayah, to_ayah")
    .eq("khatma_id", current.data.id)
    .order("day", { ascending: false })
    .limit(400);
  if (log.error) throw log.error;
  return { current: { khatma: current.data, log: log.data ?? [] }, finished };
}

/** The last server state seen per learner (memory, then the device cache). */
const bases = new Map<string, KhatmaSnapshot>();

function baseFor(learnerId: string): KhatmaSnapshot | null {
  const cached = bases.get(learnerId) ?? readOwned<KhatmaSnapshot>(snapshotKey(learnerId));
  if (cached) bases.set(learnerId, cached);
  return cached;
}

function saveBase(learnerId: string, snapshot: KhatmaSnapshot) {
  bases.set(learnerId, snapshot);
  writeOwned(snapshotKey(learnerId), snapshot);
}

function pendingFor(learnerId: string): KhatmaOp[] {
  return pendingOps()
    .filter((op) => op.kind === KHATMA_OP && (op.payload as KhatmaSyncPayload).learnerId === learnerId)
    .map((op) => op.payload as KhatmaSyncPayload);
}

/** What the learner sees: the server's state plus their waiting steps, or null when nothing is known. */
function displayed(learnerId: string): KhatmaSnapshot | null {
  const base = baseFor(learnerId);
  const pending = pendingFor(learnerId);
  if (!base && pending.length === 0) return null;
  return rebaseKhatma(base ?? EMPTY_KHATMA, pending);
}

/** Whose khatma the screens are showing: a learner id, null for the guest, undefined before the first load. */
let viewing: string | null | undefined;
/** Bumped whenever a step leaves the outbox, so a load that raced it is redone. */
let settledSeq = 0;

function publish(learnerId: string, failed = false) {
  if (viewing !== learnerId) return;
  const shown = displayed(learnerId);
  if (shown) set({ status: "ready", current: withFinished(shown), owner: learnerId });
  else set(failed ? { status: "unavailable", owner: learnerId } : { status: "loading" });
}

async function refresh(learnerId: string | null): Promise<void> {
  viewing = learnerId;
  if (!learnerId) {
    set({ status: "ready", current: withFinished(readLocal()), owner: null });
    return;
  }
  publish(learnerId);
  const seq = settledSeq;
  try {
    const remote = await loadRemote(learnerId);
    // A step reached the server while this was loading; the answer may predate it.
    if (seq !== settledSeq) return refresh(learnerId);
    saveBase(learnerId, remote);
    publish(learnerId);
  } catch {
    // Offline or the server failed: keep showing what this device knows.
    publish(learnerId, true);
  }
}

onSettled((op, outcome) => {
  if (op.kind !== KHATMA_OP) return;
  settledSeq += 1;
  const payload = op.payload as KhatmaSyncPayload;
  const base = baseFor(payload.learnerId);
  // Confirmed: it's part of the server's state now. Rejected: it just disappears from the view.
  if (outcome === "done" && base) saveBase(payload.learnerId, reduceKhatma(base, payload));
  publish(payload.learnerId);
});

onDrained(() => {
  if (viewing) void refresh(viewing);
});

/** The khatma for whoever is using the app now (the active learner, or the guest). */
export function useKhatma(): KhatmaState {
  const learnerId = activeLearnerId(useAccount());
  useEffect(() => {
    if (viewing !== learnerId) void refresh(learnerId);
  }, [learnerId]);
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}

/** Reloads the signed-in learner's khatma from the server (e.g. a "retry" button). */
export function reloadKhatma() {
  return refresh(activeLearnerIdNow());
}

/** Who an action is for: the signed-in learner (with the account that owns the sync), or the guest. */
function actor(): { learnerId: string; userId: string } | null {
  const learnerId = activeLearnerIdNow();
  const userId = currentUserIdNow();
  return supabase && learnerId && userId ? { learnerId, userId } : null;
}

/** Applies a step: on the device for the guest, or through the outbox for a learner. */
function apply(op: KhatmaOp, who: { learnerId: string; userId: string } | null) {
  if (!who) {
    writeLocal(reduceKhatma(readLocal(), op));
    return;
  }
  const createdAt = op.type === "archive" ? displayed(who.learnerId)?.current?.khatma.created_at : undefined;
  enqueue<KhatmaSyncPayload>({ kind: KHATMA_OP, owner: who.userId, payload: { ...op, learnerId: who.learnerId, createdAt } });
  // Shown at once if it's on screen; otherwise the next load replays it from the outbox.
  publish(who.learnerId);
}

function currentFor(who: { learnerId: string } | null): KhatmaSnapshot | null {
  return who ? displayed(who.learnerId) : readLocal();
}

/** The validation of the website's createKhatmaAction schema. */
function validate(input: NewKhatma): { unit: KhatmaUnit; perSession: number } | string {
  if (input.days.length === 0) return "اختر يومًا واحدًا على الأقل للقراءة";
  if (input.mode === "duration") {
    if (!input.targetDay) return "اختر تاريخ الختم";
    if (input.targetDay < planDay()) return "اختر تاريخًا قادمًا";
    const pages = pagesForDuration(planDay(), input.targetDay, input.days);
    if (pages === null) return "لا يوم قراءة قبل هذا التاريخ، اختر تاريخًا أبعد أو أيامًا أكثر.";
    return { unit: "pages", perSession: pages };
  }
  return { unit: input.unit, perSession: input.perSession };
}

export const khatma = {
  async create(input: NewKhatma): Promise<KhatmaResult> {
    const amount = validate(input);
    if (typeof amount === "string") return { ok: false, error: amount };
    track("khatma_started", { unit: amount.unit, perSession: amount.perSession });
    const who = actor();
    const row: KhatmaRow = {
      id: Crypto.randomUUID(),
      learner_id: who?.learnerId ?? "guest",
      unit: amount.unit,
      per_session: amount.perSession,
      mode: input.mode,
      target_day: input.mode === "duration" ? input.targetDay : null,
      days: [...new Set(input.days)].sort(),
      position: 0,
      status: "active",
      created_at: new Date().toISOString(),
      completed_at: null,
    };
    apply({ type: "create", row }, who);
    return { ok: true };
  },

  /** Marks today's portion read and moves on; the last one finishes the khatma. Safe to press twice. */
  async completeToday(): Promise<KhatmaResult> {
    const who = actor();
    const current = currentFor(who)?.current;
    if (!current || current.khatma.status !== "active") return { ok: false, error: NO_KHATMA };
    const today = planDay();
    if (current.log.some((entry) => entry.day === today)) return { ok: true };
    const portion = nextPortion(current.khatma, mushafBoundaries());
    if (!portion) return { ok: true };
    track("khatma_day_read");
    if (who) recordActivity(who.learnerId);
    apply(
      {
        type: "complete",
        khatmaId: current.khatma.id,
        day: today,
        from: portion.from,
        to: portion.to,
        finished: portion.to >= TOTAL_AYAHS,
        at: new Date().toISOString(),
      },
      who,
    );
    return { ok: true };
  },

  /** Ends the current khatma (kept in history on the account) so a new one can begin. */
  async archive(): Promise<KhatmaResult> {
    const who = actor();
    const current = currentFor(who)?.current;
    if (!current) return { ok: true };
    apply({ type: "archive", khatmaId: current.khatma.id }, who);
    return { ok: true };
  },
};
