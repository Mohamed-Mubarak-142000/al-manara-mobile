import type { KhatmaRow } from "@/lib/database.types";

import type { KhatmaWithLog } from "./types";

/**
 * The khatma's changes as pure steps, applied the same way on this device (guest, or a signed-in
 * learner before the server confirms) and replayed over the server's state while they wait to sync.
 * Each step is idempotent, mirroring the server's rules: one log row per khatma and day, and the
 * position moves only from where the step expected it to be.
 */

export interface KhatmaSnapshot {
  current: Omit<KhatmaWithLog, "finished"> | null;
  /** How many khatmas this learner has finished. */
  finished: number;
}

export type KhatmaOp =
  | { type: "create"; row: KhatmaRow }
  | { type: "complete"; khatmaId: string; day: string; from: number; to: number; finished: boolean; at: string }
  | { type: "archive"; khatmaId: string };

export const EMPTY_KHATMA: KhatmaSnapshot = { current: null, finished: 0 };

export function reduceKhatma(state: KhatmaSnapshot, op: KhatmaOp): KhatmaSnapshot {
  switch (op.type) {
    case "create":
      // Already there (the server has it, or it was applied before): nothing changes.
      if (state.current?.khatma.id === op.row.id) return state;
      return { ...state, current: { khatma: op.row, log: [] } };
    case "complete": {
      const current = state.current;
      if (!current || current.khatma.id !== op.khatmaId) return state;
      if (current.log.some((entry) => entry.day === op.day)) return state;
      const log = [{ day: op.day, from_ayah: op.from, to_ayah: op.to }, ...current.log];
      if (current.khatma.position !== op.from) return { ...state, current: { ...current, log } };
      const khatma: KhatmaRow = {
        ...current.khatma,
        position: op.to,
        ...(op.finished && { status: "completed" as const, completed_at: op.at }),
      };
      return { current: { khatma, log }, finished: state.finished + (op.finished ? 1 : 0) };
    }
    case "archive":
      if (!state.current || state.current.khatma.id !== op.khatmaId) return state;
      return { ...state, current: null };
  }
}

/** The server's state with the steps still waiting to sync applied on top. */
export function rebaseKhatma(base: KhatmaSnapshot, pending: KhatmaOp[]): KhatmaSnapshot {
  return pending.reduce(reduceKhatma, base);
}

export function withFinished(snapshot: KhatmaSnapshot): KhatmaWithLog | null {
  return snapshot.current ? { ...snapshot.current, finished: snapshot.finished } : null;
}
