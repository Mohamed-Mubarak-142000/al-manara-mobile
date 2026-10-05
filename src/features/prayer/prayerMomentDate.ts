/** Resolve the selected city's wall time, independently of the phone's timezone. */
export function prayerMomentDate(year: number, month: number, day: number, hhmm: string, timezone: string): Date {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) throw new Error("وقت الصلاة غير صالح");
  const [hour, minute] = hhmm.split(":").map(Number);
  if (hour > 23 || minute > 59) throw new Error("وقت الصلاة غير صالح");
  const wallTime = Date.UTC(year, month - 1, day, hour, minute);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  let timestamp = wallTime;
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = Object.fromEntries(formatter.formatToParts(timestamp).map((part) => [part.type, Number(part.value)]));
    const represented = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const adjustment = wallTime - represented;
    timestamp += adjustment;
    if (adjustment === 0) break;
  }
  return new Date(timestamp);
}
