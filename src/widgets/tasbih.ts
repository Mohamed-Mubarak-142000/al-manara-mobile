import { TOAST_ADHKAR, type ToastDhikr } from "@/core/adhkar/toastAdhkar";

/*
 * The tasbih widget's state: which dhikr it shows and the tap count toward a 33 or 100 target. Kept
 * as plain functions (no storage, no widget code) so the rules are testable.
 */

export const TASBIH_TARGETS = [33, 100] as const;
export type TasbihTarget = (typeof TASBIH_TARGETS)[number];
export type TasbihAction = "TASBIH_TAP" | "TASBIH_RESET" | "TASBIH_TARGET";
export const TASBIH_ACTIONS: readonly TasbihAction[] = ["TASBIH_TAP", "TASBIH_RESET", "TASBIH_TARGET"];

export interface TasbihState {
  /** The dhikr being counted, or null to follow the hourly rotation. */
  id: string | null;
  count: number;
  target: TasbihTarget;
  /** Hour index (see hourIndex) of the last change: a chosen dhikr stays for that hour even at 0. */
  hour: number;
}

export const INITIAL_TASBIH: TasbihState = { id: null, count: 0, target: 33, hour: -1 };

/** Local hours since the epoch, so the rotation moves every hour and differs day to day. */
export function hourIndex(now: Date): number {
  return Math.floor((now.getTime() - now.getTimezoneOffset() * 60_000) / 3_600_000);
}

export function rotatingDhikr(now: Date): ToastDhikr {
  return TOAST_ADHKAR[hourIndex(now) % TOAST_ADHKAR.length]!;
}

export function currentDhikr(state: TasbihState, now: Date): ToastDhikr {
  const pinned = state.id && (state.count > 0 || state.hour === hourIndex(now));
  return (pinned && TOAST_ADHKAR.find((dhikr) => dhikr.id === state.id)) || rotatingDhikr(now);
}

export function isComplete(state: TasbihState): boolean {
  return state.count >= state.target;
}

/** Tap counts one; a tap after the target is reached starts a fresh round on the next dhikr. */
export function applyTasbih(state: TasbihState, action: TasbihAction, now: Date): TasbihState {
  const hour = hourIndex(now);
  const dhikr = currentDhikr(state, now);
  switch (action) {
    case "TASBIH_TAP": {
      if (isComplete(state)) {
        const index = TOAST_ADHKAR.findIndex((item) => item.id === dhikr.id);
        return { ...state, id: TOAST_ADHKAR[(index + 1) % TOAST_ADHKAR.length]!.id, count: 0, hour };
      }
      return { ...state, id: dhikr.id, count: state.count + 1, hour };
    }
    case "TASBIH_RESET":
      return { ...state, count: 0, id: dhikr.id, hour };
    case "TASBIH_TARGET":
      return { ...state, target: state.target === 33 ? 100 : 33, hour };
  }
}

/** Repairs whatever was saved (older shape, bad values) into a valid state. */
export function normalizeTasbih(saved: Partial<TasbihState> | null): TasbihState {
  if (!saved) return INITIAL_TASBIH;
  return {
    id: typeof saved.id === "string" ? saved.id : null,
    count: Number.isInteger(saved.count) && saved.count! > 0 ? saved.count! : 0,
    target: saved.target === 100 ? 100 : 33,
    hour: typeof saved.hour === "number" ? saved.hour : -1,
  };
}
