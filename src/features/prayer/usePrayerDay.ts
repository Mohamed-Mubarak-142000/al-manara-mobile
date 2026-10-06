import { useCallback, useEffect, useState } from "react";

import { calcSettingsKey } from "@/core/prayer/calculation";
import { locationKey, type UserLocation } from "@/core/prayer/location";
import { getPrayerDay, type PrayerDay } from "@/core/prayer/prayerTimesApi";
import { useNow } from "@/features/time/useNow";

import { useUserLocation } from "./locationStore";
import { usePrayerCalcSettings } from "./prayerCalcSettings";

export type PrayerDayState = { status: "loading"; day: null } | { status: "error"; day: null } | { status: "ready"; day: PrayerDay };

const memory = new Map<string, PrayerDay>();

/** Today's prayer times for the user's location. Mirrors the website's usePrayerDay. */
export function usePrayerDay(): {
  location: UserLocation;
  now: Date;
  state: PrayerDayState;
  /** Fetch again (retry after an error, or pull-to-refresh). */
  refresh: () => void;
  refreshing: boolean;
} {
  const location = useUserLocation();
  const settings = usePrayerCalcSettings();
  const now = useNow();
  const [results, setResults] = useState<Record<string, PrayerDay | "error">>({});
  const [attempt, setAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const key = `${locationKey(location)}|${calcSettingsKey(settings)}|${now.toDateString()}`;

  useEffect(() => {
    if (memory.has(key)) return;
    let cancelled = false;
    getPrayerDay(location, new Date(), settings).then((day) => {
      if (cancelled) return;
      // Offline-calculated days aren't memoised, so the next mount gives the API another chance.
      if (day && day.source !== "device") memory.set(key, day);
      setResults((previous) => ({ ...previous, [key]: day ?? "error" }));
      setRefreshing(false);
    });
    return () => {
      cancelled = true;
    };
    // `location` and `settings` change only together with `key`; `attempt` forces a refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const refresh = useCallback(() => {
    // API data is final for the day (cachedFetch would serve the same); errors and offline days are retried.
    if (memory.has(key)) return;
    setResults((previous) => {
      if (previous[key] !== "error") return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
    setRefreshing(true);
    setAttempt((value) => value + 1);
  }, [key]);

  const entry = memory.get(key) ?? results[key];
  const state: PrayerDayState =
    entry === undefined
      ? { status: "loading", day: null }
      : entry === "error"
        ? { status: "error", day: null }
        : { status: "ready", day: entry };
  return { location, now, state, refresh, refreshing };
}
