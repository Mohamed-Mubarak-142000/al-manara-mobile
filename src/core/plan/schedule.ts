// Ported from eslam-platform/src/features/plan/schedule.ts — keep in sync by hand.
import { toArabicDigits } from "@/core/text/arabic";
import type { AyahRef } from "@/core/quran/textApi";
import type { MemorizationPlanRow } from "@/lib/database.types";

/**
 * Pure plan arithmetic. A memorize plan covers mushaf pages start_page..end_page, counted in
 * half-page units (unit 0 = first half of start_page). A review plan has no range: it only
 * rotates over the pages of surahs the learner already knew (prior_pages). Plans advance by
 * completion, never by the calendar, so a missed day simply waits.
 */

export type PlanShape = Pick<
  MemorizationPlanRow,
  | "kind"
  | "start_page"
  | "end_page"
  | "units_per_day"
  | "far_review_pages"
  | "progress_units"
  | "review_cursor"
  | "prior_pages"
  | "new_days"
  | "review_days"
>;

export interface UnitRange {
  from: number;
  /** Exclusive. */
  to: number;
}

export interface PageSegment {
  page: number;
  half: "full" | "first" | "second";
}

/** How many past days of new memorization the "recent" review repeats. */
export const RECENT_PORTIONS = 5;
export const PAGES_PER_DAY_OPTIONS = [1, 2, 3, 4, 6, 8, 10] as const; // in half-page units
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
/** Arabic weekday names, 0 = Sunday. */
export const WEEKDAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"] as const;
/** Display order for pickers: the week starts on Saturday. */
export const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5] as const;

export function totalUnits(plan: Pick<PlanShape, "start_page" | "end_page">): number {
  if (plan.start_page === null || plan.end_page === null) return 0;
  return (plan.end_page - plan.start_page + 1) * 2;
}

export function unitsLabel(units: number): string {
  if (units === 1) return "نصف صفحة";
  if (units === 2) return "صفحة";
  if (units === 3) return "صفحة ونصف";
  if (units === 4) return "صفحتان";
  const pages = units / 2;
  const whole = toArabicDigits(Math.floor(pages));
  return Number.isInteger(pages) ? `${whole} صفحات` : `${whole} صفحات ونصف`;
}

export function pagesLabel(count: number): string {
  if (count === 1) return "صفحة";
  if (count === 2) return "صفحتان";
  return `${toArabicDigits(count)} ${count <= 10 ? "صفحات" : "صفحة"}`;
}

/** "السبت والاثنين والأربعاء", "كل يوم", or "كل يوم عدا الجمعة". */
export function daysLabel(days: readonly number[]): string {
  const set = new Set(days);
  const ordered = WEEK_ORDER.filter((day) => set.has(day));
  if (ordered.length === 7) return "كل يوم";
  if (ordered.length === 6) return `كل يوم عدا ${WEEKDAY_NAMES[WEEK_ORDER.find((day) => !set.has(day))!]}`;
  return ordered.map((day) => WEEKDAY_NAMES[day]).join(" و");
}

/** Collapses a unit range to pages, marking the half pages at either end. */
export function unitsToSegments(plan: Pick<PlanShape, "start_page">, range: UnitRange): PageSegment[] {
  const segments: PageSegment[] = [];
  const start = plan.start_page ?? 1;
  let unit = range.from;
  while (unit < range.to) {
    const page = start + Math.floor(unit / 2);
    if (unit % 2 === 1) {
      segments.push({ page, half: "second" });
      unit += 1;
    } else if (unit + 1 < range.to) {
      segments.push({ page, half: "full" });
      unit += 2;
    } else {
      segments.push({ page, half: "first" });
      unit += 1;
    }
  }
  return segments;
}

/** Today's new portion: what was logged today, or the next `units_per_day` units. Null once finished. */
export function todayNewRange(plan: PlanShape, loggedToday: UnitRange | null): UnitRange | null {
  if (loggedToday) return loggedToday;
  const total = totalUnits(plan);
  if (plan.progress_units >= total) return null;
  return { from: plan.progress_units, to: Math.min(plan.progress_units + plan.units_per_day, total) };
}

/** The portions memorized on the last few days before today's new portion. */
export function recentRange(plan: PlanShape, anchor: number): UnitRange {
  if (plan.kind === "review") return { from: 0, to: 0 };
  return { from: Math.max(0, anchor - RECENT_PORTIONS * plan.units_per_day), to: anchor };
}

/**
 * The pages the "older pages" review rotates over: surahs known before the plan, plus the plan's
 * own pages memorized before the recent window.
 */
export function farPool(plan: PlanShape, recentFrom: number): number[] {
  const own = plan.start_page === null ? [] : Array.from({ length: Math.floor(recentFrom / 2) }, (_, index) => plan.start_page! + index);
  return [...new Set([...plan.prior_pages, ...own])].sort((a, b) => a - b);
}

/** `far_review_pages` pages from the older pool, starting at `cursor` and wrapping around. */
export function farPages(plan: PlanShape, recentFrom: number, cursor: number): number[] {
  const pool = farPool(plan, recentFrom);
  const count = Math.min(plan.far_review_pages, pool.length);
  return Array.from({ length: count }, (_, index) => pool[(cursor + index) % pool.length]!);
}

export function nextCursor(plan: PlanShape, recentFrom: number, cursor: number): number {
  const pool = farPool(plan, recentFrom).length;
  return pool === 0 ? 0 : (cursor + Math.min(plan.far_review_pages, pool)) % pool;
}

/** Memorization sessions still needed to finish the plan. */
export function sessionsLeft(plan: PlanShape): number {
  return Math.ceil(Math.max(0, totalUnits(plan) - plan.progress_units) / plan.units_per_day);
}

export function weekday(day: string): number {
  return new Date(`${day}T12:00:00Z`).getUTCDay();
}

/** The first day on or after `from` that falls on one of `days` (null if `days` is empty). */
export function nextScheduledDay(days: readonly number[], from: string): string | null {
  if (days.length === 0) return null;
  let day = from;
  while (!days.includes(weekday(day))) day = shiftDay(day, 1);
  return day;
}

/**
 * The day the last session lands on if the learner keeps to their days, starting today unless
 * today's session is already done.
 */
export function finishDay(sessions: number, days: readonly number[], today: string, doneToday: boolean): string | null {
  if (sessions <= 0 || days.length === 0) return null;
  let day = doneToday ? shiftDay(today, 1) : today;
  let remaining = sessions;
  for (;;) {
    if (days.includes(weekday(day))) {
      remaining -= 1;
      if (remaining === 0) return day;
    }
    day = shiftDay(day, 1);
  }
}

/**
 * Consecutive scheduled days kept, ending today (or at the last scheduled day before it).
 * Days off don't break the streak; a session done on a day off still counts. Days are YYYY-MM-DD.
 */
export function streak(logged: string[], today: string, days: readonly number[]): number {
  if (days.length === 0) return 0;
  const set = new Set(logged);
  let count = 0;
  let day = today;
  for (let step = 0; step < 800; step++, day = shiftDay(day, -1)) {
    if (set.has(day)) count += 1;
    else if (days.includes(weekday(day)) && day !== today) break;
  }
  return count;
}

export function shiftDay(day: string, delta: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

const DAY_FORMAT = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" });

/** The plan's calendar day (Cairo time, so "today" doesn't flip at 2–3 AM local). */
export function planDay(date: Date = new Date()): string {
  return DAY_FORMAT.format(date);
}

function compareRefs(a: AyahRef, b: AyahRef): number {
  return a.surah - b.surah || a.ayah - b.ayah;
}

/** Page of an ayah: the last page whose first ayah is at or before it. */
function pageOf(pageStarts: AyahRef[], ref: AyahRef): number {
  let low = 0;
  let high = pageStarts.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (compareRefs(pageStarts[mid]!, ref) <= 0) low = mid;
    else high = mid - 1;
  }
  return low + 1;
}

export interface JuzPages {
  juz: number;
  startPage: number;
  endPage: number;
  /** Surah the juz opens with, for the dropdown label. */
  firstSurah: number;
}

/** Page range of each juz, from the API's juz and page starts (none hand-typed). */
export function buildJuzPages(juzStarts: AyahRef[], pageStarts: AyahRef[]): JuzPages[] {
  if (juzStarts.length !== 30 || pageStarts.length !== 604) return [];
  return juzStarts.map((start, index) => {
    const next = juzStarts[index + 1];
    let endPage = 604;
    if (next) {
      const nextPage = pageOf(pageStarts, next);
      // A juz that begins at the top of a page leaves the previous page to the juz before it.
      endPage = compareRefs(pageStarts[nextPage - 1]!, next) === 0 ? nextPage - 1 : nextPage;
    }
    return { juz: index + 1, startPage: pageOf(pageStarts, start), endPage, firstSurah: start.surah };
  });
}

/** The surah printed at the top of a page, for mushaf links (`/quran/{surah}?page=`). */
export function surahAtPage(pageStarts: AyahRef[], page: number): number {
  return pageStarts[page - 1]?.surah ?? 1;
}

/** Every page a set of surahs appears on, sorted; `ayahCount` gives each surah's last ayah. */
export function surahsToPages(pageStarts: AyahRef[], surahs: number[], ayahCount: (surah: number) => number): number[] {
  const pages = new Set<number>();
  for (const surah of surahs) {
    const first = pageOf(pageStarts, { surah, ayah: 1 });
    const last = pageOf(pageStarts, { surah, ayah: ayahCount(surah) });
    for (let page = first; page <= last; page++) pages.add(page);
  }
  return [...pages].sort((a, b) => a - b);
}

/** Popular names of the last juz, which most learners know them by. */
const JUZ_NAMES: Record<number, string> = { 28: "جزء قد سمع", 29: "جزء تبارك", 30: "جزء عمّ" };

/** "الجزء ٣٠ (جزء عمّ)", or just "الجزء ٥". */
export function juzLabel(juz: number): string {
  const name = JUZ_NAMES[juz];
  return `الجزء ${toArabicDigits(juz)}${name ? ` (${name})` : ""}`;
}
