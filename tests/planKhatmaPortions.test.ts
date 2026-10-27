/// <reference types="jest" />
import { missedDay, shiftDay } from "@/core/plan/schedule";
import { missedKhatmaDay } from "@/features/khatma/view";
import { PORTION_DONE, pagerIndex, pagerItems, parseReaderPortion, portionPosition } from "@/features/mushaf/readerPortion";
import { reducePlan, type PlanSnapshot } from "@/features/plan/reducer";
import { recitationsFor } from "@/features/plan/view";
import type { MemorizationPlanRow } from "@/lib/database.types";

const ALL = [0, 1, 2, 3, 4, 5, 6];
// 2026-10-28 is a Wednesday.
const today = "2026-10-28";

describe("a missed reading day", () => {
  it("is the latest reading day of the last week with nothing logged", () => {
    expect(missedDay([today], today, ALL, "2026-10-01")).toBe("2026-10-27");
    expect(missedDay([today, "2026-10-27"], today, ALL, "2026-10-01")).toBe("2026-10-26");
  });

  it("skips days off and never goes before the start or past a week", () => {
    const wednesdaysOnly = [3];
    expect(missedDay([today], today, wednesdaysOnly, "2026-10-01")).toBe("2026-10-21");
    expect(missedDay([today], today, ALL, "2026-10-28")).toBeNull();
    const week = Array.from({ length: 8 }, (_, back) => shiftDay(today, -back));
    expect(missedDay(week, today, ALL, "2026-10-01")).toBeNull();
  });

  it("starts from the day the khatma began", () => {
    const khatma = { days: ALL, created_at: "2026-10-26T09:00:00.000Z" };
    expect(missedKhatmaDay(khatma, [{ day: "2026-10-27", from_ayah: 0, to_ayah: 10 }], today)).toBe("2026-10-26");
    expect(
      missedKhatmaDay(
        khatma,
        ["2026-10-26", "2026-10-27"].map((day) => ({ day, from_ayah: 0, to_ayah: 10 })),
        today,
      ),
    ).toBeNull();
  });
});

describe("editing a plan", () => {
  const plan = {
    id: "p1",
    status: "active",
    units_per_day: 2,
    far_review_pages: 0,
    progress_units: 8,
    review_cursor: 3,
  } as MemorizationPlanRow;
  const state: PlanSnapshot = { plan, log: [{ day: today, kind: "new", from_unit: 6, to_unit: 8 }] };
  const changes = {
    units_per_day: 4,
    far_review_pages: 3,
    prior_surahs: [114],
    prior_juz: [],
    prior_pages: [604],
    new_days: [0, 2, 4],
    review_days: ALL,
  };

  it("changes the settings and keeps progress, the log and the review rotation", () => {
    const next = reducePlan(state, { type: "update", planId: "p1", changes, ayahs: [] });
    expect(next?.plan).toMatchObject({ ...changes, progress_units: 8, review_cursor: 3 });
    expect(next?.log).toBe(state.log);
  });

  it("leaves another plan, or a finished one, as it is", () => {
    expect(reducePlan(state, { type: "update", planId: "p2", changes, ayahs: [] })).toBe(state);
    const done: PlanSnapshot = { ...state, plan: { ...plan, status: "completed" } };
    expect(reducePlan(done, { type: "update", planId: "p1", changes, ayahs: [] })).toBe(done);
  });
});

describe("reciting the review", () => {
  const pages: Record<number, { surah: number; ayah: number }[]> = {
    600: [
      { surah: 100, ayah: 10 },
      { surah: 100, ayah: 11 },
      { surah: 101, ayah: 1 },
      { surah: 101, ayah: 2 },
    ],
    601: [
      { surah: 101, ayah: 3 },
      { surah: 102, ayah: 1 },
    ],
    603: [{ surah: 106, ayah: 1 }],
  };

  it("merges the pages' ayahs into one stretch per run of a surah", () => {
    const stretches = recitationsFor(
      [601, 600, 603, 600],
      (surah) => `س${surah}`,
      (page) => pages[page] ?? [],
    );
    expect(stretches).toEqual([
      { surah: 100, surahName: "س100", from: 10, to: 11 },
      { surah: 101, surahName: "س101", from: 1, to: 3 },
      { surah: 102, surahName: "س102", from: 1, to: 1 },
      { surah: 106, surahName: "س106", from: 1, to: 1 },
    ]);
  });
});

describe("reading just today's portion", () => {
  it("reads the portion from the screen's params, or none", () => {
    expect(parseReaderPortion(20, "22", "khatma")).toEqual({ from: 20, to: 22, kind: "khatma" });
    expect(parseReaderPortion(20, "19", "plan")).toBeNull();
    expect(parseReaderPortion(20, "22", "other")).toBeNull();
    expect(parseReaderPortion(20, undefined, "plan")).toBeNull();
    expect(parseReaderPortion(600, "605", "plan")).toBeNull();
  });

  it("pages through the portion, then its done panel", () => {
    const portion = { from: 20, to: 22, kind: "plan" as const };
    expect(pagerItems(portion)).toEqual([20, 21, 22, PORTION_DONE]);
    expect(pagerIndex(portion, 21)).toBe(1);
    expect(pagerIndex(null, 21)).toBe(20);
    expect(pagerItems(null)).toHaveLength(604);
    expect(portionPosition(portion, 21)).toEqual({ position: 2, total: 3 });
  });
});
