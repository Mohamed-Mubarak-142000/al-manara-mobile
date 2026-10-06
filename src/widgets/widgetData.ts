import { PRAYER_CALC_STORAGE_KEY, normalizeCalcSettings } from "@/core/prayer/calculation";
import { locationFromTimezone, type UserLocation } from "@/core/prayer/location";
import { getPrayerDay } from "@/core/prayer/prayerTimesApi";
import { getSurah } from "@/features/mushaf/mushaf";

import { readJson, readLastRead } from "./storage";
import type { PrayerWidgetData, ReadingWidgetData } from "./widgets";

/* What the widgets show, read straight from the same device storage the app writes (see storage.ts). */

export async function prayerWidgetData(): Promise<PrayerWidgetData> {
  const location = readJson<UserLocation>("al-manara:location:v1") ?? locationFromTimezone();
  // cachedFetch serves the day's times from the device cache when there's no network.
  // Read fresh each time: the headless widget task outlives the app's in-memory settings.
  const settings = normalizeCalcSettings(readJson(PRAYER_CALC_STORAGE_KEY) ?? {});
  const day = await getPrayerDay(location, new Date(), settings).catch(() => null);
  return { label: location.label, times: day?.times ?? null };
}

export function readingWidgetData(): ReadingWidgetData {
  const last = readLastRead();
  if (!last) return { surahName: null, ayah: 1, page: 1 };
  return { surahName: getSurah(last.surah)?.name ?? null, ayah: last.ayah, page: last.page };
}
