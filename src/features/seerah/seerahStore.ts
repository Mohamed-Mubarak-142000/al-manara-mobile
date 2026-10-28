import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";

/** Where the reader stopped and the chapters read to the end, kept on this device like the website's. */
const KEY = "al-manara:seerah:v1";

export interface SeerahState {
  last: { event: string; beat: number } | null;
  read: string[];
  /** The scenes' sounds, off until the reader turns them on; haptics follow the system setting. */
  sounds: boolean;
  /** Chapters whose questions were all answered. */
  badges: string[];
}

const DEFAULT_STATE: SeerahState = { last: null, read: [], sounds: false, badges: [] };

function normalize(value: unknown): SeerahState {
  if (!value || typeof value !== "object") return DEFAULT_STATE;
  const raw = value as Partial<SeerahState>;
  const last =
    raw.last && typeof raw.last.event === "string" && Number.isInteger(raw.last.beat) && raw.last.beat >= 0
      ? { event: raw.last.event, beat: raw.last.beat }
      : null;
  return {
    last,
    read: Array.isArray(raw.read) ? raw.read.filter((id): id is string => typeof id === "string") : [],
    sounds: raw.sounds === true,
    badges: Array.isArray(raw.badges) ? raw.badges.filter((id): id is string => typeof id === "string") : [],
  };
}

let cached: SeerahState | null = null;
const listeners = new Set<() => void>();

function read(): SeerahState {
  if (cached) return cached;
  try {
    cached = normalize(JSON.parse(Storage.getItemSync(KEY) ?? "null"));
  } catch {
    cached = DEFAULT_STATE;
  }
  return cached;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updateSeerah(change: (current: SeerahState) => SeerahState) {
  cached = change(read());
  try {
    Storage.setItemSync(KEY, JSON.stringify(cached));
  } catch {
    // Keep the in-memory state.
  }
  listeners.forEach((notify) => notify());
}

export function useSeerah(): SeerahState {
  return useSyncExternalStore(subscribe, read);
}

export function seerahSoundsOn(): boolean {
  return read().sounds;
}
