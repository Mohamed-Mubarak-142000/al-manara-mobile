// Ported from eslam-platform/src/features/khatma/schedule.ts — keep in sync by hand.
import { toArabicDigits } from "@/core/text/arabic";
import type { AyahRef } from "@/core/quran/textApi";
import type { KhatmaRow, KhatmaUnit } from "@/lib/database.types";
import { SURAH_AYAH_COUNT_BY_ID } from "@/core/quran/surahAyahCounts";
import { shiftDay, weekday } from "@/core/plan/schedule";

/**
 * Pure khatma arithmetic. Positions are ayahs counted from 0 across the mushaf (al-Fatiha 1 = 0,
 * an-Nas 6 = 6235, 6236 = finished). Each unit (page, hizb, juz, surah) is a list of the ayahs it
 * starts at, all taken from the Quran API, so a session is "the next N units".
 */

export const TOTAL_AYAHS = 6236;
export const UNIT_TOTALS: Record<KhatmaUnit, number> = { pages: 604, hizb: 60, juz: 30, surah: 114 };

export type KhatmaShape = Pick<KhatmaRow, "unit" | "per_session" | "position" | "days">;
export type Boundaries = Record<KhatmaUnit, number[]>;

export interface AyahRange {
  from: number;
  /** Exclusive. */
  to: number;
}

const OFFSETS: number[] = (() => {
  const offsets = [0];
  for (let surah = 1; surah <= 114; surah++) offsets.push(offsets[surah - 1]! + (SURAH_AYAH_COUNT_BY_ID[surah] ?? 0));
  return offsets;
})();

export function toIndex({ surah, ayah }: AyahRef): number {
  return OFFSETS[surah - 1]! + ayah - 1;
}

export function toRef(index: number): AyahRef {
  let surah = 1;
  while (surah < 114 && OFFSETS[surah]! <= index) surah++;
  return { surah, ayah: index - OFFSETS[surah - 1]! + 1 };
}

/** Unit start positions from the API's page, juz and hizb starts; null if any list is incomplete. */
export function buildBoundaries(pageStarts: AyahRef[], juzStarts: AyahRef[], hizbStarts: AyahRef[]): Boundaries | null {
  if (pageStarts.length !== 604 || juzStarts.length !== 30 || hizbStarts.length !== 60 || OFFSETS[114] !== TOTAL_AYAHS) return null;
  return {
    pages: pageStarts.map(toIndex),
    hizb: hizbStarts.map(toIndex),
    juz: juzStarts.map(toIndex),
    surah: OFFSETS.slice(0, 114),
  };
}

/** Index of the unit that holds `position` (the last start at or before it). */
function unitAt(starts: number[], position: number): number {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (starts[mid]! <= position) low = mid;
    else high = mid - 1;
  }
  return low;
}

/** The mushaf page an ayah is on. */
export function pageOfIndex(boundaries: Boundaries, index: number): number {
  return unitAt(boundaries.pages, Math.min(index, TOTAL_AYAHS - 1)) + 1;
}

/** The next `per_session` units from where the reader is; null once the khatma is finished. */
export function nextPortion(khatma: KhatmaShape, boundaries: Boundaries): AyahRange | null {
  if (khatma.position >= TOTAL_AYAHS) return null;
  const starts = boundaries[khatma.unit];
  const current = unitAt(starts, khatma.position);
  return { from: khatma.position, to: starts[current + khatma.per_session] ?? TOTAL_AYAHS };
}

export function sessionsLeft(khatma: KhatmaShape, boundaries: Boundaries): number {
  if (khatma.position >= TOTAL_AYAHS) return 0;
  const starts = boundaries[khatma.unit];
  return Math.ceil((starts.length - unitAt(starts, khatma.position)) / khatma.per_session);
}

/** Reading days from `from` to `to` inclusive (both YYYY-MM-DD). */
export function sessionsBetween(from: string, to: string, days: readonly number[]): number {
  let count = 0;
  for (let day = from; day <= to; day = shiftDay(day, 1)) if (days.includes(weekday(day))) count++;
  return count;
}

/** Duration mode: pages per session to finish all 604 within the reading days until `target`. */
export function pagesForDuration(today: string, target: string, days: readonly number[]): number | null {
  const sessions = sessionsBetween(today, target, days);
  return sessions > 0 ? Math.min(604, Math.ceil(604 / sessions)) : null;
}

const NOUNS: Record<KhatmaUnit, [one: string, two: string, few: string, many: string]> = {
  pages: ["صفحة", "صفحتان", "صفحات", "صفحة"],
  hizb: ["حزب", "حزبان", "أحزاب", "حزبًا"],
  juz: ["جزء", "جزءان", "أجزاء", "جزءًا"],
  surah: ["سورة", "سورتان", "سور", "سورة"],
};

/** "صفحة", "صفحتان", "٣ صفحات", "١٢ صفحة"… with Arabic number agreement. */
export function amountLabel(unit: KhatmaUnit, count: number): string {
  const [one, two, few, many] = NOUNS[unit];
  if (count === 1) return one;
  if (count === 2) return two;
  return `${toArabicDigits(count)} ${count <= 10 ? few : many}`;
}

/** A page count in juz terms, for the duration preview: "≈ جزء", "≈ نصف جزء". */
export function pagesInJuz(pages: number): string | null {
  const juz = pages / 20;
  if (Math.abs(juz - 0.5) < 0.08) return "نحو نصف جزء";
  const whole = Math.round(juz);
  if (Math.abs(juz - whole) >= 0.08 || whole < 1) return null;
  // After «نحو» the noun is genitive: جزء، جزأين، ٣ أجزاء.
  return whole === 1 ? "نحو جزء" : whole === 2 ? "نحو جزأين" : `نحو ${amountLabel("juz", whole)}`;
}

export const PER_SESSION_OPTIONS: Record<KhatmaUnit, number[]> = {
  pages: [1, 2, 3, 4, 5, 10, 15, 20],
  hizb: [1, 2, 3, 4],
  juz: [1, 2, 3, 5],
  surah: [1, 2, 3, 5, 10],
};
