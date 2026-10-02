// Ported from eslam-platform/src/features/progress/juz.ts — keep in sync by hand.
import { getSurahAyahCount } from "@/core/quran/surahAyahCounts";
import type { AyahRef } from "@/core/quran/textApi";

export interface JuzSegment {
  surah: number;
  from: number;
  to: number;
}

export interface JuzRange {
  juz: number;
  segments: JuzSegment[];
  totalAyahs: number;
}

/** Expands the 30 juz start points into per-surah ayah ranges. */
export function buildJuzRanges(starts: AyahRef[]): JuzRange[] {
  if (starts.length !== 30) return [];
  return starts.map((start, index) => {
    const next = starts[index + 1];
    const segments: JuzSegment[] = [];
    for (let surah = start.surah; surah <= (next?.surah ?? 114); surah += 1) {
      const from = surah === start.surah ? start.ayah : 1;
      const to = next && surah === next.surah ? next.ayah - 1 : getSurahAyahCount(surah);
      if (to >= from) segments.push({ surah, from, to });
    }
    return { juz: index + 1, segments, totalAyahs: segments.reduce((sum, segment) => sum + segment.to - segment.from + 1, 0) };
  });
}

export function countMemorizedInJuz(range: JuzRange, memorizedBySurah: Record<number, number[]>): number {
  let count = 0;
  for (const segment of range.segments) {
    for (const ayah of memorizedBySurah[segment.surah] ?? []) if (ayah >= segment.from && ayah <= segment.to) count += 1;
  }
  return count;
}
