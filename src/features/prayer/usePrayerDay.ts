import { useEffect, useState } from "react";

import { locationKey, type UserLocation } from "@/core/prayer/location";
import { getPrayerDay, type PrayerDay } from "@/core/prayer/prayerTimesApi";
import { useNow } from "@/features/time/useNow";

import { useUserLocation } from "./locationStore";

export type PrayerDayState = { status: "loading"; day: null } | { status: "error"; day: null } | { status: "ready"; day: PrayerDay };

const memory = new Map<string, PrayerDay>();

/** Today's prayer times for the user's location. Mirrors the website's usePrayerDay. */
export function usePrayerDay(): { location: UserLocation; now: Date; state: PrayerDayState } {
  const location = useUserLocation();
  const now = useNow();
  const [results, setResults] = useState<Record<string, PrayerDay | "error">>({});
  const key = `${locationKey(location)}|${now.toDateString()}`;

  useEffect(() => {
    if (memory.has(key)) return;
    let cancelled = false;
    getPrayerDay(location).then((day) => {
      if (cancelled) return;
      if (day) memory.set(key, day);
      setResults((previous) => ({ ...previous, [key]: day ?? "error" }));
    });
    return () => {
      cancelled = true;
    };
    // `location` changes only together with `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const entry = memory.get(key) ?? results[key];
  const state: PrayerDayState =
    entry === undefined
      ? { status: "loading", day: null }
      : entry === "error"
        ? { status: "error", day: null }
        : { status: "ready", day: entry };
  return { location, now, state };
}
