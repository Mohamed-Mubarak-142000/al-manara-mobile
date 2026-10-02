import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";

import type { PrayerKey } from "@/core/prayer/prayerTimesApi";

export type AdhanPrayer = Exclude<PrayerKey, "sunrise">;

export interface AdhanSettings {
  /** The user turned prayer notifications on (and granted permission). */
  enabled: boolean;
  prayers: Record<AdhanPrayer, boolean>;
  /** A heads-up this many minutes before each prayer; 0 = none. */
  reminderMinutes: 0 | 10 | 15 | 30;
}

const KEY = "al-manara:adhan:v1";

const DEFAULTS: AdhanSettings = {
  enabled: false,
  prayers: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
  reminderMinutes: 0,
};

let cached: AdhanSettings | null = null;
const listeners = new Set<() => void>();

export function readAdhanSettings(): AdhanSettings {
  if (cached) return cached;
  try {
    const raw = Storage.getItemSync(KEY);
    cached = raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AdhanSettings>) } : DEFAULTS;
  } catch {
    cached = DEFAULTS;
  }
  return cached;
}

export function writeAdhanSettings(patch: Partial<AdhanSettings>) {
  cached = { ...readAdhanSettings(), ...patch };
  try {
    Storage.setItemSync(KEY, JSON.stringify(cached));
  } catch {
    // Keep the in-memory value.
  }
  listeners.forEach((notify) => notify());
}

export function useAdhanSettings(): AdhanSettings {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, readAdhanSettings);
}
