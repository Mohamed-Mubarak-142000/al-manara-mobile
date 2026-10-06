/**
 * Reading-streak arithmetic on local calendar days. Days are "YYYY-MM-DD" keys in the device's own
 * timezone, and stepping between them goes through the Date constructor (y, m, d ± n), which rolls
 * months and years and is immune to DST hours — never by adding 86 400 000 ms.
 */

/** Days read: day key → the distinct mushaf pages read that day (may be empty when pages are unknown). */
export type ReadingLog = Record<string, number[]>;

export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function fromKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year!, month! - 1, day!);
}

export function addDays(key: string, days: number): string {
  const date = fromKey(key);
  return dayKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
}

/**
 * Consecutive days read up to today. A day not yet read today does not break the streak: it still
 * counts back from yesterday until the day is over.
 */
export function currentStreak(days: ReadonlySet<string>, today: Date): number {
  let cursor = dayKey(today);
  if (!days.has(cursor)) cursor = addDays(cursor, -1);
  let count = 0;
  while (days.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

/** The longest run of consecutive days anywhere in the log. */
export function bestStreak(days: ReadonlySet<string>): number {
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const key of sorted) {
    run = previous !== null && addDays(previous, 1) === key ? run + 1 : 1;
    best = Math.max(best, run);
    previous = key;
  }
  return best;
}

/** The week as the Arab calendar counts it: Saturday first, so Friday closes it. */
export function weekStart(today: Date): string {
  const sinceSaturday = (today.getDay() + 1) % 7;
  return addDays(dayKey(today), -sinceSaturday);
}

/** Days of this week, Saturday → Friday, with whether each was read. */
export function weekDays(log: ReadingLog, today: Date): { key: string; read: boolean; future: boolean }[] {
  const start = weekStart(today);
  const todayKey = dayKey(today);
  return Array.from({ length: 7 }, (_, index) => {
    const key = addDays(start, index);
    return { key, read: key in log, future: key > todayKey };
  });
}

export function weekSummary(log: ReadingLog, today: Date): { days: number; pages: number } {
  let days = 0;
  let pages = 0;
  for (const day of weekDays(log, today)) {
    if (!day.read) continue;
    days += 1;
    pages += log[day.key]!.length;
  }
  return { days, pages };
}

/** Adds pages to a day without double-counting a page read twice that day. */
export function withPages(log: ReadingLog, key: string, pages: readonly number[]): ReadingLog {
  const existing = log[key] ?? [];
  const fresh = [...new Set(pages)].filter((page) => Number.isInteger(page) && page >= 1 && page <= 604 && !existing.includes(page));
  if (!fresh.length && log[key]) return log;
  return { ...log, [key]: [...existing, ...fresh] };
}

/** Drops days older than `keepDays` before `today`, so the stored log stays small. */
export function pruned(log: ReadingLog, today: Date, keepDays: number): ReadingLog {
  const oldest = addDays(dayKey(today), -keepDays);
  const next: ReadingLog = {};
  for (const [key, pages] of Object.entries(log)) if (key >= oldest) next[key] = pages;
  return next;
}
