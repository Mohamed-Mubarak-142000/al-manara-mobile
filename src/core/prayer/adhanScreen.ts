import type { PrayerKey } from "./prayerTimesApi";

/*
 * The adhan screen (/adhan-now) that opens at prayer time: from the notice's tap, and on Android as a
 * full-screen intent over the lock screen. The route carries the prayer and its time, so the screen
 * shows the right one however the app was started. Pure, so it is tested.
 */

export type AdhanScreenPrayer = Exclude<PrayerKey, "sunrise">;

const PRAYERS: readonly AdhanScreenPrayer[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

export interface AdhanScreenMoment {
  prayer: AdhanScreenPrayer;
  /** Epoch ms of the prayer time. */
  at: number;
  /** Ramadan's Maghrib: announced as the iftar. */
  iftar: boolean;
}

/** The route, without its leading slash: the native side opens it as almanara://adhan-now?… */
export function adhanScreenPath(moment: AdhanScreenMoment): string {
  const params = new URLSearchParams({ prayer: moment.prayer, at: String(moment.at) });
  if (moment.iftar) params.set("iftar", "1");
  return `adhan-now?${params}`;
}

/** The screen's params back into a moment; a missing or bad prayer is null (the screen then names none). */
export function parseAdhanScreen(params: { prayer?: unknown; at?: unknown; iftar?: unknown }): AdhanScreenMoment | null {
  const prayer = PRAYERS.find((key) => key === params.prayer);
  const at = Number(params.at);
  if (!prayer || !Number.isFinite(at) || at <= 0) return null;
  return { prayer, at, iftar: prayer === "maghrib" && params.iftar === "1" };
}

/** A screen opened long after its prayer (an old notice tapped later) says so instead of "now". */
export const ADHAN_SCREEN_FRESH_MS = 30 * 60_000;

export function isFreshAdhan(moment: AdhanScreenMoment, now: number): boolean {
  return now - moment.at <= ADHAN_SCREEN_FRESH_MS;
}
