import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";

/** Today's tap counts per dhikr id. Resets itself on a new day, like the website's counters. */
type Progress = { day: string; counts: Record<string, number> };

const KEY = "al-manara:adhkar-progress:v1";
let cached: Progress | null = null;
const listeners = new Set<() => void>();

function today(): string {
  return new Date().toDateString();
}

function read(): Progress {
  if (cached && cached.day === today()) return cached;
  try {
    const saved = JSON.parse(Storage.getItemSync(KEY) ?? "null") as Progress | null;
    cached = saved && saved.day === today() ? saved : { day: today(), counts: {} };
  } catch {
    cached = { day: today(), counts: {} };
  }
  return cached;
}

function write(next: Progress) {
  cached = next;
  try {
    Storage.setItemSync(KEY, JSON.stringify(next));
  } catch {
    // Keep the in-memory counts.
  }
  listeners.forEach((notify) => notify());
}

export function countDhikr(id: string) {
  const progress = read();
  write({ ...progress, counts: { ...progress.counts, [id]: (progress.counts[id] ?? 0) + 1 } });
}

export function resetDhikr(ids: string[]) {
  const counts = { ...read().counts };
  for (const id of ids) delete counts[id];
  write({ day: today(), counts });
}

/** Today's counts outside React (right after a tap, before the screen re-renders). */
export function getAdhkarCounts(): Record<string, number> {
  return read().counts;
}

export function useAdhkarCounts(): Record<string, number> {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => read().counts,
  );
}
