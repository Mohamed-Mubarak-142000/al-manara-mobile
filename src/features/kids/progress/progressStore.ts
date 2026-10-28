import { useSyncExternalStore } from "react";

import * as actions from "@/core/kids/progressActions";
import type { ProgressChange } from "@/core/kids/progressActions";
import { diffWrites, type KidsWrite } from "@/core/kids/pushDiff";
import { DEFAULT_KIDS_PROGRESS, type KidsProgressState } from "@/core/kids/progressTypes";
import { loadRemoteProgress, type GameRecord } from "@/core/kids/remoteProgress";
import { currentUserIdNow } from "@/features/account/accountStore";
import type { CompanionAnimal } from "@/lib/database.types";
import { enqueue, onDrained, pendingOps, readOwned, writeOwned } from "@/lib/outbox";
import { supabase } from "@/lib/supabase";

import { KIDS_PROGRESS_OP, type KidsProgressPayload } from "./sync";

/**
 * The website's KidsProgressProvider store, for the app. The state is rebuilt from the same normalized
 * tables (loadRemoteProgress) and every change is written back as the same idempotent upserts
 * (remoteWriter), so a child's journey, stars, gems and chests are shared with the website.
 *
 * App additions: the last state of each child is kept on the device (the garden opens offline), and the
 * writes go through the app's outbox, so progress made offline reaches the account when the phone is back
 * online. While writes are waiting, a fresh server read is held back so it can't undo what isn't sent yet.
 */

export type ProgressStatus = "ready" | "loading" | "error";

interface Snapshot {
  state: KidsProgressState;
  status: ProgressStatus;
  learnerId: string | null;
}

const OP = KIDS_PROGRESS_OP;
const cacheKey = (learnerId: string) => `al-manara:kids-progress:v1:${learnerId}`;
const REFRESH_MS = 30_000;

let snapshot: Snapshot = { state: DEFAULT_KIDS_PROGRESS, status: "loading", learnerId: null };
const listeners = new Set<() => void>();
let lastRefresh = 0;
let refreshWaiting = false;

function set(next: Snapshot) {
  snapshot = next;
  listeners.forEach((notify) => notify());
}

function readCache(learnerId: string): KidsProgressState | null {
  const cached = readOwned<KidsProgressState>(cacheKey(learnerId));
  // An older or broken entry is ignored: the server copy replaces it.
  return cached && cached.version === 2 && typeof cached.memorizedAyahsBySurah === "object"
    ? { ...DEFAULT_KIDS_PROGRESS, ...cached }
    : null;
}

function hasPendingWrites(learnerId: string): boolean {
  return pendingOps().some((op) => op.kind === OP && (op.payload as { learnerId?: string }).learnerId === learnerId);
}

async function refresh(learnerId: string) {
  if (!supabase) return;
  if (hasPendingWrites(learnerId)) {
    refreshWaiting = true;
    return;
  }
  lastRefresh = Date.now();
  try {
    const state = await loadRemoteProgress(supabase, learnerId);
    if (snapshot.learnerId !== learnerId || hasPendingWrites(learnerId)) return;
    set({ state, status: "ready", learnerId });
    writeOwned(cacheKey(learnerId), state);
  } catch {
    // Offline: keep what the device has; without anything saved yet the gate shows a retry.
    if (snapshot.learnerId === learnerId && snapshot.status === "loading") set({ ...snapshot, status: "error" });
    lastRefresh = 0;
  }
}

onDrained(() => {
  if (!refreshWaiting || !snapshot.learnerId) return;
  refreshWaiting = false;
  void refresh(snapshot.learnerId);
});

function commit(change: ProgressChange | null) {
  if (!change) return;
  const { learnerId, state: previous } = snapshot;
  set({ ...snapshot, state: change.state });
  if (!learnerId) return;
  writeOwned(cacheKey(learnerId), change.state);
  queue(learnerId, diffWrites(previous, change.state, change.games));
}

function queue(learnerId: string, writes: KidsWrite[]) {
  const owner = currentUserIdNow();
  if (!owner || writes.length === 0) return;
  enqueue<KidsProgressPayload>({ kind: OP, owner, payload: { learnerId, writes } });
}

export const kidsProgress = {
  /** Switches to a child's progress: what the device has at once, then the account's copy. */
  connect(learnerId: string | null) {
    if (snapshot.learnerId === learnerId) {
      if (learnerId && (snapshot.status === "error" || Date.now() - lastRefresh > REFRESH_MS)) {
        if (snapshot.status === "error") set({ ...snapshot, status: "loading" });
        void refresh(learnerId);
      }
      return;
    }
    if (!learnerId) {
      set({ state: DEFAULT_KIDS_PROGRESS, status: "ready", learnerId: null });
      return;
    }
    const cached = readCache(learnerId);
    set({ state: cached ?? DEFAULT_KIDS_PROGRESS, status: cached ? "ready" : "loading", learnerId });
    void refresh(learnerId);
  },
  retry() {
    if (!snapshot.learnerId) return;
    set({ ...snapshot, status: "loading" });
    void refresh(snapshot.learnerId);
  },
  setAyahMemorized(surahId: number, numberInSurah: number, memorized: boolean) {
    commit(actions.setAyahsMemorized(snapshot.state, surahId, [numberInSurah], memorized));
  },
  setAyahsMemorized(surahId: number, ayahs: number[], memorized: boolean) {
    commit(actions.setAyahsMemorized(snapshot.state, surahId, ayahs, memorized));
  },
  /** With `surahId`, a passing score opens the next surah. */
  recordQuizResult(correct: number, total: number, surahId?: number) {
    commit(actions.recordQuizResult(snapshot.state, correct, total, surahId));
  },
  recordGame(record: GameRecord) {
    commit(actions.recordGame(snapshot.state, record));
  },
  recordListenCompletion(surahId: number) {
    commit(actions.recordListenCompletion(snapshot.state, surahId));
  },
  markSurahReviewed(surahId: number) {
    commit(actions.markSurahReviewed(snapshot.state, surahId));
  },
  chooseCompanion(animal: CompanionAnimal) {
    commit(actions.chooseCompanion(snapshot.state, animal));
  },
  toggleEquip(itemId: string) {
    commit(actions.toggleEquip(snapshot.state, itemId));
  },
  /** False when the item is already owned or the balance is short. */
  buyItem(itemId: string): boolean {
    const change = actions.buyItem(snapshot.state, itemId);
    commit(change);
    return change !== null;
  },
  /** Opens an earned chest and returns what was inside (an item id or `gems-<n>`). */
  openChest(chestId: string): string | null {
    const { change, reward } = actions.openChest(snapshot.state, chestId);
    commit(change);
    return reward;
  },
  resetProgress() {
    const { learnerId } = snapshot;
    const cleared = actions.resetProgress(snapshot.state);
    set({ ...snapshot, state: cleared });
    if (!learnerId) return;
    writeOwned(cacheKey(learnerId), cleared);
    queue(learnerId, [{ op: "reset" }, { op: "setProfile", companion: cleared.companion }]);
  },
  getState(): KidsProgressState {
    return snapshot.state;
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The website's useKidsProgress(): the state, its loading status, and the actions. */
export function useKidsProgress() {
  const current = useSyncExternalStore(subscribe, () => snapshot);
  return { state: current.state, status: current.status, synced: current.learnerId !== null, ...kidsProgress };
}

/** Just the state (most pages only read it). */
export function useKidsState(): KidsProgressState {
  return useSyncExternalStore(subscribe, () => snapshot.state);
}
