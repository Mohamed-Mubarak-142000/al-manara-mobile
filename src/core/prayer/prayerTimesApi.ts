// Ported from eslam-platform/src/features/prayer/prayerTimesApi.ts — keep in sync by hand; Next-only caching swapped for cachedFetch.
import { cachedFetch } from "@/core/http";
import { DEFAULT_CALC_SETTINGS, aladhanParams, type PrayerCalcSettings } from "./calculation";
import { calculatePrayerDay, calculatePrayerMonth } from "./localPrayerTimes";
import type { UserLocation } from "./location";

export type PrayerKey = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";

export const PRAYER_ORDER: readonly PrayerKey[] = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];

export const PRAYER_LABELS: Record<PrayerKey, string> = {
  fajr: "الفجر",
  sunrise: "الشروق",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

export type PrayerTimes = Record<PrayerKey, string>;

export interface PrayerDay {
  times: PrayerTimes;
  gregorianDate: string;
  latitude: number;
  longitude: number;
  timezone: string;
  /** App-only: "device" when calculated locally because the API was unreachable; absent for API data. */
  source?: "device";
}

interface RawTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

interface RawDay {
  timings: RawTimings;
  date: { readable: string; gregorian: { day: string } };
  meta: { latitude: number; longitude: number; timezone: string };
}

const BASE_URL = "https://api.aladhan.com/v1";
// The method defaults to 5 = Egyptian General Authority of Survey (calculation.ts) — a common default for Arabic-speaking users.

function clean(value: string): string {
  return value.split(" ")[0] ?? value;
}

function toDay(raw: RawDay): PrayerDay {
  return {
    times: {
      fajr: clean(raw.timings.Fajr),
      sunrise: clean(raw.timings.Sunrise),
      dhuhr: clean(raw.timings.Dhuhr),
      asr: clean(raw.timings.Asr),
      maghrib: clean(raw.timings.Maghrib),
      isha: clean(raw.timings.Isha),
    },
    gregorianDate: raw.date.readable,
    latitude: raw.meta.latitude,
    longitude: raw.meta.longitude,
    timezone: raw.meta.timezone,
  };
}

function dateSegment(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
}

function locationQuery(location: UserLocation, settings: PrayerCalcSettings): string {
  if (location.latitude !== undefined && location.longitude !== undefined) {
    return `latitude=${location.latitude}&longitude=${location.longitude}&${aladhanParams(settings)}`;
  }
  return `city=${encodeURIComponent(location.city)}&country=${encodeURIComponent(location.country)}&${aladhanParams(settings)}`;
}

async function fetchPrayerDay(location: UserLocation, date: Date, settings: PrayerCalcSettings): Promise<PrayerDay | null> {
  const endpoint = location.latitude !== undefined ? "timings" : "timingsByCity";
  try {
    const response = await cachedFetch(`${BASE_URL}/${endpoint}/${dateSegment(date)}?${locationQuery(location, settings)}`, 60 * 60 * 24);
    if (!response.ok) return null;
    const payload = (await response.json()) as { code: number; data: RawDay };
    return payload.code === 200 ? toDay(payload.data) : null;
  } catch {
    return null;
  }
}

/**
 * The aladhan API stays the primary source (it is what the website shows). When it can't be reached and
 * nothing is cached, the same times are calculated on the device, so a new day offline still has them.
 */
export async function getPrayerDay(
  location: UserLocation,
  date: Date = new Date(),
  settings: PrayerCalcSettings = DEFAULT_CALC_SETTINGS,
): Promise<PrayerDay | null> {
  const day = await fetchPrayerDay(location, date, settings);
  if (day) return day;
  try {
    return calculatePrayerDay(location, date, settings);
  } catch {
    return null;
  }
}

export interface PrayerMonthDay extends PrayerDay {
  day: number;
}

async function fetchPrayerMonth(
  location: UserLocation,
  year: number,
  month: number,
  settings: PrayerCalcSettings,
): Promise<PrayerMonthDay[]> {
  const endpoint = location.latitude !== undefined ? "calendar" : "calendarByCity";
  try {
    const response = await cachedFetch(`${BASE_URL}/${endpoint}/${year}/${month}?${locationQuery(location, settings)}`, 60 * 60 * 24);
    if (!response.ok) return [];
    const payload = (await response.json()) as { code: number; data: RawDay[] };
    if (payload.code !== 200 || !Array.isArray(payload.data)) return [];
    return payload.data.map((raw) => ({ ...toDay(raw), day: Number(raw.date.gregorian.day) }));
  } catch {
    return [];
  }
}

/** A month (1-based) of times: the API, else (offline with nothing cached) the on-device calculation. */
export async function getPrayerMonth(
  location: UserLocation,
  year: number,
  month: number,
  settings: PrayerCalcSettings = DEFAULT_CALC_SETTINGS,
): Promise<PrayerMonthDay[]> {
  const days = await fetchPrayerMonth(location, year, month, settings);
  if (days.length) return days;
  try {
    return calculatePrayerMonth(location, year, month, settings);
  } catch {
    return [];
  }
}

function atTime(base: Date, hhmm: string, dayOffset = 0): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const result = new Date(base);
  result.setDate(result.getDate() + dayOffset);
  result.setHours(h ?? 0, m ?? 0, 0, 0);
  return result;
}

export interface PrayerMoment {
  key: PrayerKey;
  label: string;
  at: Date;
}

const OBLIGATORY: readonly PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

/** Next obligatory prayer and the one before it (for a progress ring). After Isha → tomorrow's Fajr. */
export function getPrayerWindow(times: PrayerTimes, now: Date): { next: PrayerMoment; previous: PrayerMoment } {
  const today = OBLIGATORY.map((key) => ({ key, label: PRAYER_LABELS[key], at: atTime(now, times[key]) }));
  const nextIndex = today.findIndex((moment) => moment.at.getTime() > now.getTime());
  if (nextIndex === -1) {
    return { next: { key: "fajr", label: PRAYER_LABELS.fajr, at: atTime(now, times.fajr, 1) }, previous: today[today.length - 1]! };
  }
  const previous =
    nextIndex === 0 ? { key: "isha" as const, label: PRAYER_LABELS.isha, at: atTime(now, times.isha, -1) } : today[nextIndex - 1]!;
  return { next: today[nextIndex]!, previous };
}

/** The prayer whose time is currently running (Fajr until sunrise, then Dhuhr..Isha), or null. */
export function getCurrentPrayerKey(times: PrayerTimes, now: Date): PrayerKey | null {
  const ms = now.getTime();
  if (ms >= atTime(now, times.fajr).getTime() && ms < atTime(now, times.sunrise).getTime()) return "fajr";
  const later: PrayerKey[] = ["isha", "maghrib", "asr", "dhuhr"];
  for (const key of later) if (ms >= atTime(now, times[key]).getTime()) return key;
  if (ms < atTime(now, times.fajr).getTime()) return "isha";
  return null;
}

export function formatPrayerClock(hhmm: string): string {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  const period = h < 12 ? "ص" : "م";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}
