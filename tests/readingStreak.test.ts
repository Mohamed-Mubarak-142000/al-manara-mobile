/// <reference types="jest" />
import {
  addDays,
  bestStreak,
  currentStreak,
  dayKey,
  pruned,
  weekDays,
  weekStart,
  weekSummary,
  withPages,
} from "@/features/streak/streakMath";

/** Local noon/late-night times: the keys follow the device's calendar day, not UTC. */
const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min);

describe("day keys", () => {
  it("uses the local calendar day, even right before and after midnight", () => {
    expect(dayKey(at(2026, 3, 5, 0, 5))).toBe("2026-03-05");
    expect(dayKey(at(2026, 3, 5, 23, 55))).toBe("2026-03-05");
  });

  it("steps across months, years and leap days", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("is not thrown off by a DST night (days stepped by calendar, not 24h)", () => {
    // Whatever the test machine's zone, 30 consecutive steps must give 30 distinct consecutive days.
    let key = "2026-03-20";
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      seen.add(key);
      key = addDays(key, 1);
    }
    expect(seen.size).toBe(30);
    expect(key).toBe("2026-04-19");
  });
});

describe("current streak", () => {
  const days = new Set(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-05"]);

  it("counts back from today when today is read", () => {
    expect(currentStreak(new Set([...days, "2026-10-04", "2026-10-06"]), at(2026, 10, 6))).toBe(6);
  });

  it("keeps yesterday's streak while today is not yet read", () => {
    expect(currentStreak(new Set(["2026-10-04", "2026-10-05"]), at(2026, 10, 6, 21))).toBe(2);
  });

  it("breaks on a gap", () => {
    expect(currentStreak(days, at(2026, 10, 5))).toBe(1);
    expect(currentStreak(days, at(2026, 10, 7))).toBe(0);
  });

  it("is zero with no reading", () => {
    expect(currentStreak(new Set(), at(2026, 10, 6))).toBe(0);
  });
});

describe("best streak", () => {
  it("finds the longest run, across a month boundary", () => {
    expect(bestStreak(new Set(["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-03", "2026-10-04"]))).toBe(3);
    expect(bestStreak(new Set())).toBe(0);
  });
});

describe("weekly summary", () => {
  it("starts the week on Saturday", () => {
    // 2026-10-06 is a Tuesday; the week began Saturday 2026-10-03.
    expect(weekStart(at(2026, 10, 6))).toBe("2026-10-03");
    expect(weekStart(at(2026, 10, 3))).toBe("2026-10-03");
    // Friday closes the week.
    expect(weekStart(at(2026, 10, 9))).toBe("2026-10-03");
  });

  it("counts days and distinct pages read this week only", () => {
    let log = withPages({}, "2026-10-02", [10]); // last week
    log = withPages(log, "2026-10-03", [1, 2, 2]);
    log = withPages(log, "2026-10-03", [2, 3]);
    log = withPages(log, "2026-10-05", []); // read, pages unknown
    expect(log["2026-10-03"]).toEqual([1, 2, 3]);
    expect(weekSummary(log, at(2026, 10, 6))).toEqual({ days: 2, pages: 3 });
    const strip = weekDays(log, at(2026, 10, 6));
    expect(strip.map((day) => day.read)).toEqual([true, false, true, false, false, false, false]);
    expect(strip.filter((day) => day.future)).toHaveLength(3);
  });

  it("ignores impossible pages and leaves the log untouched for repeats", () => {
    const log = withPages({}, "2026-10-03", [0, 605, 1.5, 7]);
    expect(log["2026-10-03"]).toEqual([7]);
    expect(withPages(log, "2026-10-03", [7])).toBe(log);
  });

  it("prunes old days", () => {
    const log = { "2025-01-01": [1], "2026-10-01": [2] };
    expect(pruned(log, at(2026, 10, 6), 400)).toEqual({ "2026-10-01": [2] });
  });
});
