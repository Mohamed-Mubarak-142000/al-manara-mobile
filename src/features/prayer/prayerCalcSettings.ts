import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";

import {
  DEFAULT_CALC_SETTINGS,
  PRAYER_CALC_STORAGE_KEY,
  normalizeCalcSettings,
  type PrayerCalcSettings,
} from "@/core/prayer/calculation";

let cached: PrayerCalcSettings | null = null;
const listeners = new Set<() => void>();

/** Calculation method, Asr madhab and per-prayer offsets; Egyptian/majority/no offsets until changed. */
export function readPrayerCalcSettings(): PrayerCalcSettings {
  if (cached) return cached;
  try {
    const raw = Storage.getItemSync(PRAYER_CALC_STORAGE_KEY);
    cached = raw ? normalizeCalcSettings(JSON.parse(raw)) : DEFAULT_CALC_SETTINGS;
  } catch {
    cached = DEFAULT_CALC_SETTINGS;
  }
  return cached;
}

export function writePrayerCalcSettings(patch: Partial<PrayerCalcSettings>) {
  cached = normalizeCalcSettings({ ...readPrayerCalcSettings(), ...patch });
  try {
    Storage.setItemSync(PRAYER_CALC_STORAGE_KEY, JSON.stringify(cached));
  } catch {
    // Keep the in-memory value.
  }
  listeners.forEach((notify) => notify());
}

export function usePrayerCalcSettings(): PrayerCalcSettings {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, readPrayerCalcSettings);
}
