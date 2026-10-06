/// <reference types="jest" />
import { EMPTY_KHATMA, rebaseKhatma, reduceKhatma, withFinished, type KhatmaSnapshot } from "@/features/khatma/reducer";
import { rebasePlan, reducePlan, type PlanOp, type PlanSnapshot } from "@/features/plan/reducer";
import type { KhatmaRow, MemorizationPlanRow } from "@/lib/database.types";

const khatmaRow = (id: string, position = 0): KhatmaRow => ({
  id,
  learner_id: "l1",
  unit: "pages",
  per_session: 2,
  mode: "amount",
  target_day: null,
  days: [0, 1, 2, 3, 4, 5, 6],
  position,
  status: "active",
  created_at: "2026-10-01T00:00:00.000Z",
  completed_at: null,
});

const planRow = (id: string): MemorizationPlanRow => ({
  id,
  learner_id: "l1",
  kind: "memorize",
  start_juz: 30,
  end_juz: 30,
  start_page: 582,
  end_page: 604,
  units_per_day: 2,
  far_review_pages: 0,
  progress_units: 0,
  review_cursor: 0,
  status: "active",
  prior_surahs: [],
  prior_juz: [],
  prior_pages: [],
  new_days: [0, 1, 2, 3, 4, 5, 6],
  review_days: [0, 1, 2, 3, 4, 5, 6],
  created_at: "2026-10-01T00:00:00.000Z",
  completed_at: null,
});

const complete = (khatmaId: string, day: string, from: number, to: number, finished = false) =>
  ({ type: "complete", khatmaId, day, from, to, finished, at: "2026-10-06T10:00:00.000Z" }) as const;

describe("khatma reducer", () => {
  it("creates a khatma, replacing the current one", () => {
    const first = reduceKhatma(EMPTY_KHATMA, { type: "create", row: khatmaRow("a") });
    const second = reduceKhatma(first, { type: "create", row: khatmaRow("b") });
    expect(second.current?.khatma.id).toBe("b");
    expect(second.current?.log).toEqual([]);
    // Same id again (already on the server): unchanged.
    expect(reduceKhatma(second, { type: "create", row: khatmaRow("b") })).toBe(second);
  });

  it("logs a day once and moves the position", () => {
    const start = reduceKhatma(EMPTY_KHATMA, { type: "create", row: khatmaRow("a") });
    const read = reduceKhatma(start, complete("a", "2026-10-06", 0, 20));
    expect(read.current?.khatma.position).toBe(20);
    expect(read.current?.log).toEqual([{ day: "2026-10-06", from_ayah: 0, to_ayah: 20 }]);
    expect(reduceKhatma(read, complete("a", "2026-10-06", 20, 40))).toBe(read);
  });

  it("keeps the position when it moved elsewhere (the server's conditional update)", () => {
    const start: KhatmaSnapshot = { current: { khatma: khatmaRow("a", 50), log: [] }, finished: 0 };
    const next = reduceKhatma(start, complete("a", "2026-10-06", 0, 20));
    expect(next.current?.khatma.position).toBe(50);
    expect(next.current?.log).toHaveLength(1);
  });

  it("finishes the khatma and counts it", () => {
    const start: KhatmaSnapshot = { current: { khatma: khatmaRow("a", 6200), log: [] }, finished: 2 };
    const done = reduceKhatma(start, complete("a", "2026-10-06", 6200, 6236, true));
    expect(done.current?.khatma).toMatchObject({ status: "completed", position: 6236, completed_at: "2026-10-06T10:00:00.000Z" });
    expect(done.finished).toBe(3);
    expect(withFinished(done)?.finished).toBe(3);
  });

  it("ignores steps for another khatma and archives only the one it names", () => {
    const start = reduceKhatma(EMPTY_KHATMA, { type: "create", row: khatmaRow("a") });
    expect(reduceKhatma(start, complete("other", "2026-10-06", 0, 20))).toBe(start);
    expect(reduceKhatma(start, { type: "archive", khatmaId: "other" })).toBe(start);
    expect(reduceKhatma(start, { type: "archive", khatmaId: "a" }).current).toBeNull();
  });

  it("rebases waiting steps over the server's state", () => {
    const server: KhatmaSnapshot = {
      current: { khatma: khatmaRow("a", 20), log: [{ day: "2026-10-05", from_ayah: 0, to_ayah: 20 }] },
      finished: 1,
    };
    // The create already reached the server; the day read today hasn't.
    const shown = rebaseKhatma(server, [{ type: "create", row: khatmaRow("a") }, complete("a", "2026-10-06", 20, 40)]);
    expect(shown.current?.khatma.position).toBe(40);
    expect(shown.current?.log.map((entry) => entry.day)).toEqual(["2026-10-06", "2026-10-05"]);
    expect(shown.finished).toBe(1);
  });
});

describe("plan reducer", () => {
  const base: PlanSnapshot = { plan: planRow("p"), log: [] };
  const completeNew = (from: number, to: number, finished = false): PlanOp & { type: "completeNew" } => ({
    type: "completeNew",
    planId: "p",
    day: "2026-10-06",
    from,
    to,
    finished,
    at: "2026-10-06T10:00:00.000Z",
    ayahs: [],
  });

  it("creates once per id", () => {
    const created = reducePlan(null, { type: "create", row: planRow("p") });
    expect(created?.plan.id).toBe("p");
    expect(reducePlan(created, { type: "create", row: planRow("p") })).toBe(created);
  });

  it("logs today's new portion once and advances progress", () => {
    const next = reducePlan(base, completeNew(0, 2));
    expect(next?.plan.progress_units).toBe(2);
    expect(next?.log).toEqual([{ day: "2026-10-06", kind: "new", from_unit: 0, to_unit: 2 }]);
    expect(reducePlan(next, completeNew(2, 4))).toBe(next);
  });

  it("completes the plan on the last portion", () => {
    const next = reducePlan({ plan: { ...planRow("p"), progress_units: 44 }, log: [] }, completeNew(44, 46, true));
    expect(next?.plan).toMatchObject({ status: "completed", progress_units: 46 });
  });

  it("logs the review once and moves the cursor only from where it was", () => {
    const review = { type: "completeReview", planId: "p", day: "2026-10-06", from: 0, to: 0, cursor: 3 } as const;
    const next = reducePlan(base, review);
    expect(next?.plan.review_cursor).toBe(3);
    expect(reducePlan(next, review)).toBe(next);
    const moved = reducePlan({ plan: { ...planRow("p"), review_cursor: 7 }, log: [] }, review);
    expect(moved?.plan.review_cursor).toBe(7);
    expect(moved?.log).toHaveLength(1);
  });

  it("new and review on the same day are separate", () => {
    const both = rebasePlan(base, [completeNew(0, 2), { type: "completeReview", planId: "p", day: "2026-10-06", from: 0, to: 0, cursor: 1 }]);
    expect(both?.log.map((entry) => entry.kind)).toEqual(["review", "new"]);
  });

  it("archives the named plan and rebases over a missing server plan", () => {
    expect(reducePlan(base, { type: "archive", planId: "p" })).toBeNull();
    expect(reducePlan(base, { type: "archive", planId: "x" })).toBe(base);
    const offline = rebasePlan(null, [{ type: "create", row: planRow("q") }, { ...completeNew(0, 2), planId: "q" }]);
    expect(offline?.plan).toMatchObject({ id: "q", progress_units: 2 });
  });
});
