// Ported from eslam-platform/src/features/umrah/umrahStore.ts — keep in sync by hand. The state and its
// rules only: the app's store (features/umrah/umrahStore.ts) saves it, and the zod schema is replaced
// by normalizeUmrah so the module stays dependency-free and testable.
import { MIQATS, UMRAH_STEPS } from "./umrahGuide";

export const ROUNDS = 7;
export const MIN_SCALE = 0.9;
export const MAX_SCALE = 1.4;

export interface UmrahState {
  /** The step on screen, and the steps marked done. */
  step: string;
  done: string[];
  /** Where the pilgrim sets out from, for the miqat. */
  origin: string;
  /** Rounds finished, kept so a restart in the middle of tawaf or sa'i loses nothing. */
  tawaf: number;
  sai: number;
  /** Text size for reading on the move. */
  scale: number;
}

export const DEFAULT_UMRAH: UmrahState = { step: "prepare", done: [], origin: "egypt", tawaf: 0, sai: 0, scale: 1 };

const rounds = (value: unknown) => (typeof value === "number" && Number.isInteger(value) ? Math.max(0, Math.min(ROUNDS, value)) : 0);

/** Repairs whatever was saved (older shape, bad values) into a valid state, like the website's schema. */
export function normalizeUmrah(saved: unknown): UmrahState {
  if (!saved || typeof saved !== "object") return DEFAULT_UMRAH;
  const raw = saved as Partial<Record<keyof UmrahState, unknown>>;
  const stepIds = new Set(UMRAH_STEPS.map((step) => step.id));
  return {
    step: typeof raw.step === "string" && stepIds.has(raw.step) ? raw.step : DEFAULT_UMRAH.step,
    done: Array.isArray(raw.done) ? [...new Set(raw.done.filter((id): id is string => typeof id === "string" && stepIds.has(id)))] : [],
    origin: MIQATS.some((miqat) => miqat.id === raw.origin) ? (raw.origin as string) : DEFAULT_UMRAH.origin,
    tawaf: rounds(raw.tawaf),
    sai: rounds(raw.sai),
    scale: typeof raw.scale === "number" && Number.isFinite(raw.scale) ? Math.max(MIN_SCALE, Math.min(MAX_SCALE, raw.scale)) : 1,
  };
}

/** Moves to a step; "التالي" also marks the step being left as done. */
export function goToStep(state: UmrahState, id: string, markDone: boolean): UmrahState {
  const leaving = state.step;
  return {
    ...state,
    step: id,
    done: markDone && !state.done.includes(leaving) ? [...state.done, leaving] : state.done,
  };
}

/** One text-size step up or down, within the range. */
export function stepScale(scale: number, direction: 1 | -1): number {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, +(scale + direction * 0.1).toFixed(1)));
}

/** Rounds after a change, kept within 0–7. */
export function setRounds(value: number): number {
  return rounds(value);
}

/** Where the sa'i walker stands: Safa before odd rounds, Marwa after them; the seventh ends at Marwa. */
export function saiAtMarwa(count: number): boolean {
  return count % 2 === 1;
}

/** "رَمَل" is for the first three rounds of tawaf (for men). */
export function isRamalRound(count: number): boolean {
  return Math.min(count + 1, ROUNDS) <= 3;
}
