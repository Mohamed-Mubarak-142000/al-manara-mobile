// Ported from eslam-platform/src/features/calendar/hijriDate.ts — keep in sync by hand.
export interface HijriDate {
  day: number;
  month: number;
  monthName: string;
  year: number;
  isRamadan: boolean;
}

const RAMADAN_MONTH_NUMBER = 9;
const MAX_SEARCH_DAYS = 400;
const DAY_MS = 24 * 60 * 60 * 1000;

// Umm al-Qura is a tabulated civil calendar (not moon-sighting), so treat results as
// approximate — good enough for a "Ramadan is roughly N days away" banner, not for fiqh rulings.
let numeric: Intl.DateTimeFormat | undefined;
let names: Intl.DateTimeFormat | undefined;

function numericFormatter(): Intl.DateTimeFormat {
  numeric ??= new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { day: "numeric", month: "numeric", year: "numeric" });
  return numeric;
}

function nameFormatter(): Intl.DateTimeFormat {
  names ??= new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", { month: "long" });
  return names;
}

export function getHijriDate(date: Date = new Date()): HijriDate {
  const parts = numericFormatter().formatToParts(date);
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "0");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "0");
  const year = Number(parts.find((part) => part.type === "year")?.value ?? "0");
  const monthName = nameFormatter().format(date);
  return { day, month, monthName, year, isRamadan: month === RAMADAN_MONTH_NUMBER };
}

/** Searches forward day-by-day for the next Gregorian date that is the 1st of Ramadan. */
export function getNextRamadanStart(from: Date = new Date()): Date | null {
  for (let offset = 1; offset <= MAX_SEARCH_DAYS; offset += 1) {
    const candidate = new Date(from.getTime() + offset * DAY_MS);
    const hijri = getHijriDate(candidate);
    if (hijri.month === RAMADAN_MONTH_NUMBER && hijri.day === 1) return candidate;
  }
  return null;
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}
