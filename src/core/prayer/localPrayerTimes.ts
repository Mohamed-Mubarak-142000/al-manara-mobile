// App-only: prayer times calculated on the device with `adhan`, in the same shapes the aladhan API gives,
// so a new day (or a fresh install) without network still has times and the adhan can still be scheduled.
import {
  CalculationMethod,
  Coordinates,
  HighLatitudeRule,
  Madhab,
  PolarCircleResolution,
  PrayerTimes as AdhanPrayerTimes,
} from "adhan";

import { DEFAULT_CALC_SETTINGS, type PrayerCalcSettings } from "./calculation";
import { resolvePlace, type ResolvedPlace, type UserLocation } from "./location";
import type { PrayerDay, PrayerKey, PrayerMonthDay, PrayerTimes } from "./prayerTimesApi";

const KEYS: readonly PrayerKey[] = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const clocks = new Map<string, Intl.DateTimeFormat>();

/** "HH:mm" of an instant on the wall clock of `timezone` — the inverse of prayerMomentDate. */
export function wallClock(instant: Date, timezone: string): string {
  let formatter = clocks.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    clocks.set(timezone, formatter);
  }
  const parts = formatter.formatToParts(instant);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0") % 24;
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function computeDay(place: ResolvedPlace, year: number, month: number, day: number, settings: PrayerCalcSettings): PrayerDay {
  const coordinates = new Coordinates(place.latitude, place.longitude);
  const params = CalculationMethod[settings.method]();
  params.madhab = settings.madhab === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
  params.highLatitudeRule = HighLatitudeRule.recommended(coordinates);
  params.polarCircleResolution = PolarCircleResolution.AqrabBalad;
  params.adjustments = { ...settings.offsets };
  // adhan reads the calendar day from the Date's local fields.
  const result = new AdhanPrayerTimes(coordinates, new Date(year, month - 1, day), params);
  const times = Object.fromEntries(KEYS.map((key) => [key, wallClock(result[key], place.timezone)])) as PrayerTimes;
  return {
    times,
    gregorianDate: `${String(day).padStart(2, "0")} ${MONTHS[month - 1]} ${year}`,
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: place.timezone,
    source: "device",
  };
}

/** One day's times, or null when the location has no coordinates we can resolve. */
export function calculatePrayerDay(
  location: UserLocation,
  date: Date = new Date(),
  settings: PrayerCalcSettings = DEFAULT_CALC_SETTINGS,
): PrayerDay | null {
  const place = resolvePlace(location);
  return place ? computeDay(place, date.getFullYear(), date.getMonth() + 1, date.getDate(), settings) : null;
}

/** A whole Gregorian month (1-based `month`), or [] when the location can't be resolved. */
export function calculatePrayerMonth(
  location: UserLocation,
  year: number,
  month: number,
  settings: PrayerCalcSettings = DEFAULT_CALC_SETTINGS,
): PrayerMonthDay[] {
  const place = resolvePlace(location);
  if (!place) return [];
  const length = new Date(year, month, 0).getDate();
  return Array.from({ length }, (_, index) => ({ ...computeDay(place, year, month, index + 1, settings), day: index + 1 }));
}
