import { useEffect, useSyncExternalStore } from "react";

import { joinSegments } from "@/core/quran/joinSegments";
import { getSurahTajweedAyahs, type TajweedAyah, type TajweedSegment } from "@/core/quran/tajweedApi";
import { loadBundledTajweed } from "@/data/tajweed";

/**
 * Tajweed-coloured text per surah, from the website's source (quran.com uthmani_tajweed). All 114
 * surahs are bundled in src/data/tajweed (npm run build:tajweed) and parsed synchronously on first
 * use, so the colours work offline from the first launch. The network (kept by cachedFetch for a
 * month) is only a fallback for a surah the bundle can't provide.
 */

type Entry = { status: "loading" } | { status: "ready"; byAyah: Map<number, TajweedSegment[]> } | { status: "failed" };

const entries = new Map<number, Entry>();
const listeners = new Set<() => void>();
let version = 0;

function notify() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function toEntry(ayahs: TajweedAyah[]): Entry {
  return ayahs.length
    ? { status: "ready", byAyah: new Map(ayahs.map((ayah) => [ayah.numberInSurah, joinSegments(ayah.segments)])) }
    : { status: "failed" };
}

/** Reads a surah from the bundle into the store; false when it isn't there. */
function loadBundled(surah: number): boolean {
  try {
    const ayahs = loadBundledTajweed(surah);
    if (!ayahs?.length) return false;
    entries.set(surah, toEntry(ayahs));
    return true;
  } catch {
    return false;
  }
}

function load(surah: number) {
  const current = entries.get(surah);
  if (current && current.status !== "failed") return;
  if (loadBundled(surah)) {
    notify();
    return;
  }
  entries.set(surah, { status: "loading" });
  getSurahTajweedAyahs(surah)
    .then((ayahs) => {
      entries.set(surah, toEntry(ayahs));
      notify();
    })
    .catch(() => {
      entries.set(surah, { status: "failed" });
      notify();
    });
}

/** Loads the surahs on screen and re-renders when their colours arrive (bundled ones are there on the first render). */
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
    // Read the bundle during render so the first frame is already coloured (no notify: we're rendering).
    if (!entries.has(surah)) loadBundled(surah);
    const entry = entries.get(surah);
    return entry?.status === "ready" ? entry.byAyah.get(ayah) : undefined;
  };
}
