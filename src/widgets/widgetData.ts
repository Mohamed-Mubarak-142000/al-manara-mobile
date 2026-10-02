import Storage from "expo-sqlite/kv-store";

import { locationFromTimezone, type UserLocation } from "@/core/prayer/location";
import { getPrayerDay } from "@/core/prayer/prayerTimesApi";
import { getSurah } from "@/features/mushaf/mushaf";
import type { LastRead } from "@/features/mushaf/readerPrefs";

import type { PrayerWidgetData, ReadingWidgetData } from "./widgets";

/*
 * What the widgets show, read straight from the same device storage the app writes. The widget task
 * runs headless (the app may not be open), so it can't use the React stores, only their saved state.
 */

function readJson<T>(key: string): T | null {
  try {
    const raw = Storage.getItemSync(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function prayerWidgetData(): Promise<PrayerWidgetData> {
  const location = readJson<UserLocation>("al-manara:location:v1") ?? locationFromTimezone();
  // cachedFetch serves the day's times from the device cache when there's no network.
  const day = await getPrayerDay(location).catch(() => null);
  return { label: location.label, times: day?.times ?? null };
}

export function readingWidgetData(): ReadingWidgetData {
  const state = readJson<{ lastRead?: LastRead | null }>("al-manara:reader:v1");
  const last = state?.lastRead;
  if (!last) return { surahName: null, ayah: 1, page: 1 };
  return { surahName: getSurah(last.surah)?.name ?? null, ayah: last.ayah, page: last.page };
}
