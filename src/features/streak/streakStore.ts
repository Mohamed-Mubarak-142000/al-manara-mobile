import Storage from "expo-sqlite/kv-store";
import { useEffect, useSyncExternalStore } from "react";

import { useReaderState } from "@/features/mushaf/readerPrefs";

import { bestStreak, dayKey, pruned, withPages, type ReadingLog } from "./streakMath";

/**
 * Which days the user read the Quran, kept on this device. The best streak is stored on its own so
 * pruning old days (to keep the log small) never lowers it.
 */
interface StreakState {
  log: ReadingLog;
  best: number;
}

const KEY = "al-manara:reading-streak:v1";
const KEEP_DAYS = 400;
let cached: StreakState | null = null;
const listeners = new Set<() => void>();

function read(): StreakState {
  if (cached) return cached;
  try {
    const saved = JSON.parse(Storage.getItemSync(KEY) ?? "null") as Partial<StreakState> | null;
    cached = { log: saved?.log ?? {}, best: saved?.best ?? 0 };
  } catch {
    cached = { log: {}, best: 0 };
  }
  return cached;
}

/**
 * Records reading on the given day (now by default): one page, several, or none when the pages are
 * unknown. Safe to call often; a page already counted that day is ignored.
 */
export function recordReading(pages: number | readonly number[] = [], at: Date = new Date()) {
  const state = read();
  const list = typeof pages === "number" ? [pages] : pages;
  const key = dayKey(at);
  const log = withPages(state.log, key, list);
  if (log === state.log) return;
  const kept = pruned(log, new Date(), KEEP_DAYS);
  cached = { log: kept, best: Math.max(state.best, bestStreak(new Set(Object.keys(log)))) };
  try {
    Storage.setItemSync(KEY, JSON.stringify(cached));
  } catch {
    // Keep the in-memory log for this session.
  }
  listeners.forEach((notify) => notify());
}

export function useReadingLog(): StreakState {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, read);
}

/**
 * Follows the mushaf's last-read position (saved as the reader turns pages, or pulled from the
 * account) and records each page on the day it was read. Renders nothing; mount once in the root.
 */
export function ReadingStreakTracker() {
  const lastRead = useReaderState().lastRead;
  const page = lastRead?.page;
  const at = lastRead?.at;
  useEffect(() => {
    if (page && at) recordReading(page, new Date(at));
  }, [page, at]);
  return null;
}
