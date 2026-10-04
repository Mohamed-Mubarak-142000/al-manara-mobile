// Ported from eslam-platform/src/features/calendar/calendarModel.ts — keep in sync by hand.
import { getHijriDate, type HijriDate } from "./hijriDate";

export interface Occasion {
  hijriMonth: number;
  hijriDay: number;
  label: string;
}

// Fixed Hijri dates only; the Umm al-Qura calendar is tabulated, so the actual day can differ by
// local moon sighting — the UI labels every date as approximate.
export const OCCASIONS: readonly Occasion[] = [
  { hijriMonth: 1, hijriDay: 1, label: "رأس السنة الهجرية" },
  { hijriMonth: 1, hijriDay: 10, label: "يوم عاشوراء" },
  { hijriMonth: 9, hijriDay: 1, label: "بداية شهر رمضان" },
  { hijriMonth: 10, hijriDay: 1, label: "عيد الفطر" },
  { hijriMonth: 12, hijriDay: 9, label: "يوم عرفة" },
  { hijriMonth: 12, hijriDay: 10, label: "عيد الأضحى" },
];

export function occasionFor(hijri: HijriDate): Occasion | undefined {
  return OCCASIONS.find((occasion) => occasion.hijriMonth === hijri.month && occasion.hijriDay === hijri.day);
}

export interface CalendarCell {
  date: Date;
  inMonth: boolean;
  hijri: HijriDate;
  occasion: Occasion | undefined;
}

function atNoon(year: number, month: number, day: number): Date {
  // Noon avoids DST edges shifting the date when stepping day by day.
  return new Date(year, month, day, 12);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Saturday-first week grid (as in Egyptian and most Arab calendars). */
function weekStart(date: Date): Date {
  const saturdayIndex = (date.getDay() + 1) % 7;
  return addDays(date, -saturdayIndex);
}

function cell(date: Date, inMonth: boolean): CalendarCell {
  const hijri = getHijriDate(date);
  return { date, inMonth, hijri, occasion: occasionFor(hijri) };
}

export function gregorianMonthGrid(year: number, month: number): CalendarCell[] {
  const first = atNoon(year, month, 1);
  const start = weekStart(first);
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const date = addDays(start, i);
    cells.push(cell(date, date.getMonth() === month));
  }
  return trimTrailingWeek(cells);
}

export interface HijriMonth {
  first: Date;
  days: number;
  hijri: HijriDate;
  cells: CalendarCell[];
}

/** The Umm al-Qura month containing `anchor`, laid out on the same Saturday-first grid. */
export function hijriMonthGrid(anchor: Date): HijriMonth {
  let first = atNoon(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  for (let guard = 0; guard < 31 && getHijriDate(first).day !== 1; guard += 1) first = addDays(first, -1);
  const monthHijri = getHijriDate(first);
  let days = 0;
  while (days < 31 && getHijriDate(addDays(first, days)).month === monthHijri.month) days += 1;

  const start = weekStart(first);
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const date = addDays(start, i);
    const hijri = getHijriDate(date);
    cells.push({ date, inMonth: hijri.month === monthHijri.month && hijri.year === monthHijri.year, hijri, occasion: occasionFor(hijri) });
  }
  return { first, days, hijri: monthHijri, cells: trimTrailingWeek(cells) };
}

function trimTrailingWeek(cells: CalendarCell[]): CalendarCell[] {
  const lastWeek = cells.slice(35);
  return lastWeek.some((entry) => entry.inMonth) ? cells : cells.slice(0, 35);
}

export function shiftHijriMonth(anchor: Date, delta: 1 | -1): Date {
  const { first, days } = hijriMonthGrid(anchor);
  return delta === 1 ? addDays(first, days + 1) : addDays(first, -2);
}

export interface UpcomingOccasion {
  occasion: Occasion;
  date: Date;
  inDays: number;
}

export function upcomingOccasions(from: Date, limit = 5): UpcomingOccasion[] {
  const start = atNoon(from.getFullYear(), from.getMonth(), from.getDate());
  const found = new Map<string, UpcomingOccasion>();
  for (let offset = 0; offset <= 400 && found.size < OCCASIONS.length; offset += 1) {
    const date = addDays(start, offset);
    const occasion = occasionFor(getHijriDate(date));
    if (occasion && !found.has(occasion.label)) found.set(occasion.label, { occasion, date, inDays: offset });
  }
  return [...found.values()].sort((a, b) => a.inDays - b.inDays).slice(0, limit);
}

export const WEEKDAYS_SHORT = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
