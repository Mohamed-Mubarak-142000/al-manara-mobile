// Ported from eslam-platform/src/features/kids/progress/streak.ts — keep in sync by hand.
const DAY_MS = 24 * 60 * 60 * 1000;

function toDateOnly(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

export function recordActivityDate(activityDates: string[], now: Date = new Date()): string[] {
  const today = toDateOnly(now);
  return activityDates.includes(today) ? activityDates : [...activityDates, today].sort();
}

export function computeStreak(activityDates: string[], now: Date = new Date()): number {
  if (activityDates.length === 0) return 0;
  const activeDays = new Set(activityDates);
  const today = toDateOnly(now);
  const yesterday = toDateOnly(new Date(now.getTime() - DAY_MS));
  if (!activeDays.has(today) && !activeDays.has(yesterday)) return 0;

  let streak = 0;
  let cursor = activeDays.has(today) ? new Date(now) : new Date(now.getTime() - DAY_MS);
  while (activeDays.has(toDateOnly(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}
