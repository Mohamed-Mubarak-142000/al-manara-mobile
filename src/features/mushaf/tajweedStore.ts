import { useEffect, useSyncExternalStore } from "react";

import { joinSegments } from "@/core/quran/joinSegments";
import { getSurahTajweedAyahs, type TajweedSegment } from "@/core/quran/tajweedApi";

/**
 * Tajweed-coloured text per surah, from the website's source (quran.com uthmani_tajweed). Fetched
 * once per surah and kept by cachedFetch for a month, so a surah read once stays coloured offline.
 */

type Entry = { status: "loading" } | { status: "ready"; byAyah: Map<number, TajweedSegment[]> } | { status: "failed" };

const entries = new Map<number, Entry>();
const listeners = new Set<() => void>();
let version = 0;

function notify() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function load(surah: number) {
  const current = entries.get(surah);
  if (current && current.status !== "failed") return;
  entries.set(surah, { status: "loading" });
  getSurahTajweedAyahs(surah)
    .then((ayahs) => {
      entries.set(
        surah,
        ayahs.length
          ? { status: "ready", byAyah: new Map(ayahs.map((ayah) => [ayah.numberInSurah, joinSegments(ayah.segments)])) }
          : { status: "failed" },
      );
      notify();
    })
    .catch(() => {
      entries.set(surah, { status: "failed" });
      notify();
    });
}

/** Loads the surahs on screen and re-renders when their colours arrive. */
export function useTajweed(surahs: number[], enabled: boolean): (surah: number, ayah: number) => TajweedSegment[] | undefined {
  const key = surahs.join(",");
  useEffect(() => {
    if (!enabled) return;
    for (const surah of key.split(",").map(Number)) if (surah) load(surah);
  }, [key, enabled]);
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => version,
  );
  return (surah, ayah) => {
    if (!enabled) return undefined;
    const entry = entries.get(surah);
    return entry?.status === "ready" ? entry.byAyah.get(ayah) : undefined;
  };
}
