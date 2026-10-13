// Ported from eslam-platform/src/features/tasbih/tasbihStore.ts — keep in sync by hand. The rules only:
// the app's store (features/tasbih/tasbihStore.ts) saves the state, and the zod schema is replaced by
// normalizeTasbih so the module stays dependency-free and testable.
import { PRESET_ADHKAR, TASBIH_THEMES, type Dhikr, type TasbihThemeId } from "./tasbihData";

/** Per dhikr: the count in the current round, the finished rounds, and the chosen target. */
export interface TasbihSession {
  count: number;
  rounds: number;
  target: number;
}

export interface TasbihState {
  dhikrId: string;
  sessions: Record<string, TasbihSession>;
  custom: Dhikr[];
  theme: TasbihThemeId;
  vibrate: boolean;
  /** Every tap ever, and today's taps (reset when the local date changes). */
  total: number;
  today: { date: string; count: number };
}

export const MAX_CUSTOM = 50;
export const MAX_TEXT = 300;
export const MAX_TARGET = 100_000;

export const DEFAULT_TASBIH: TasbihState = {
  dhikrId: PRESET_ADHKAR[0]!.id,
  sessions: {},
  custom: [],
  theme: "emerald",
  vibrate: true,
  total: 0,
  today: { date: "", count: 0 },
};

export type TasbihAction =
  | { type: "tap" }
  | { type: "select"; id: string }
  | { type: "target"; target: number }
  | { type: "reset" }
  | { type: "add"; id: string; text: string; target: number }
  | { type: "remove"; id: string }
  | { type: "theme"; theme: TasbihThemeId }
  | { type: "vibrate" };

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function allAdhkar(state: TasbihState): Dhikr[] {
  return [...state.custom, ...PRESET_ADHKAR];
}

export function currentDhikr(state: TasbihState): Dhikr {
  const list = allAdhkar(state);
  return list.find((dhikr) => dhikr.id === state.dhikrId) ?? list[list.length - PRESET_ADHKAR.length]!;
}

export function sessionOf(state: TasbihState, dhikr: Dhikr): TasbihSession {
  return state.sessions[dhikr.id] ?? { count: 0, rounds: 0, target: dhikr.target };
}

/** Today's taps, or 0 when the last tap was on another day. */
export function todayCount(state: TasbihState, now = new Date()): number {
  return state.today.date === localDate(now) ? state.today.count : 0;
}

/** Whether the next tap finishes a round of the current dhikr. */
export function tapCompletesRound(state: TasbihState): boolean {
  const session = sessionOf(state, currentDhikr(state));
  return session.target > 0 && session.count + 1 >= session.target;
}

/** A target within range: a whole number from 0 (open) to MAX_TARGET. */
function clampTarget(target: number): number {
  return Number.isFinite(target) ? Math.max(0, Math.min(Math.floor(target), MAX_TARGET)) : 0;
}

/** "٣٣", "۳۳" or "33" → 33 when it is a count from 1 to MAX_TARGET, otherwise null. */
export function parseTarget(text: string): number | null {
  const ascii = text
    .trim()
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
  if (!/^\d{1,6}$/.test(ascii)) return null;
  const value = Number(ascii);
  return value >= 1 ? Math.min(value, MAX_TARGET) : null;
}

export function applyTasbih(state: TasbihState, action: TasbihAction, now = new Date()): TasbihState {
  const dhikr = currentDhikr(state);
  const session = sessionOf(state, dhikr);
  switch (action.type) {
    case "tap": {
      const count = session.count + 1;
      const completed = session.target > 0 && count >= session.target;
      const today = localDate(now);
      return {
        ...state,
        sessions: {
          ...state.sessions,
          [dhikr.id]: { ...session, count: completed ? 0 : count, rounds: session.rounds + (completed ? 1 : 0) },
        },
        total: state.total + 1,
        today: { date: today, count: (state.today.date === today ? state.today.count : 0) + 1 },
      };
    }
    case "select":
      return allAdhkar(state).some((entry) => entry.id === action.id) ? { ...state, dhikrId: action.id } : state;
    case "target":
      return { ...state, sessions: { ...state.sessions, [dhikr.id]: { ...session, count: 0, target: clampTarget(action.target) } } };
    case "reset":
      return { ...state, sessions: { ...state.sessions, [dhikr.id]: { ...session, count: 0, rounds: 0 } } };
    case "add": {
      const text = action.text.trim().slice(0, MAX_TEXT);
      if (!text) return state;
      return {
        ...state,
        custom: [{ id: action.id, text, target: clampTarget(action.target) }, ...state.custom].slice(0, MAX_CUSTOM),
        dhikrId: action.id,
      };
    }
    case "remove": {
      const sessions = Object.fromEntries(Object.entries(state.sessions).filter(([id]) => id !== action.id));
      return {
        ...state,
        custom: state.custom.filter((item) => item.id !== action.id),
        sessions,
        dhikrId: state.dhikrId === action.id ? PRESET_ADHKAR[0]!.id : state.dhikrId,
      };
    }
    case "theme":
      return { ...state, theme: action.theme };
    case "vibrate":
      return { ...state, vibrate: !state.vibrate };
  }
}

const count = (value: unknown) => (typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0);

/** Repairs whatever was saved (older shape, bad values) into a valid state, like the website's schema. */
export function normalizeTasbih(saved: unknown): TasbihState {
  if (!saved || typeof saved !== "object") return DEFAULT_TASBIH;
  const raw = saved as Partial<Record<keyof TasbihState, unknown>>;
  const sessions: Record<string, TasbihSession> = {};
  if (raw.sessions && typeof raw.sessions === "object") {
    for (const [id, value] of Object.entries(raw.sessions as Record<string, Partial<TasbihSession>>)) {
      if (value && typeof value === "object") {
        sessions[id] = { count: count(value.count), rounds: count(value.rounds), target: clampTarget(count(value.target)) };
      }
    }
  }
  const custom = Array.isArray(raw.custom)
    ? (raw.custom as Partial<Dhikr>[])
        .filter((entry) => entry && typeof entry.id === "string" && typeof entry.text === "string" && entry.text.trim())
        .map((entry) => ({ id: entry.id!, text: entry.text!.slice(0, MAX_TEXT), target: clampTarget(count(entry.target)) }))
        .slice(0, MAX_CUSTOM)
    : [];
  const today = raw.today as Partial<TasbihState["today"]> | undefined;
  return {
    dhikrId: typeof raw.dhikrId === "string" ? raw.dhikrId : DEFAULT_TASBIH.dhikrId,
    sessions,
    custom,
    theme: TASBIH_THEMES.some((theme) => theme.id === raw.theme) ? (raw.theme as TasbihThemeId) : DEFAULT_TASBIH.theme,
    vibrate: typeof raw.vibrate === "boolean" ? raw.vibrate : true,
    total: count(raw.total),
    today: { date: typeof today?.date === "string" ? today.date : "", count: count(today?.count) },
  };
}
