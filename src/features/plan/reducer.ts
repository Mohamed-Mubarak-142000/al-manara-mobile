import type { MemorizationPlanRow } from "@/lib/database.types";

import { loggedOn, type PlanWithLog } from "./types";

/**
 * The plan's changes as pure, idempotent steps (see khatma/reducer.ts): applied on the device at once
 * and replayed over the server's state while they wait to sync. One log row per plan, day and kind;
 * progress and the review cursor only move from where the step expected them.
 */

export type PlanSnapshot = PlanWithLog | null;

export interface AyahGroup {
  surah: number;
  ayahs: number[];
}

/** What editing a running plan changes (the website's updatePlanAction); progress, log and cursor stay. */
export type PlanChanges = Pick<
  MemorizationPlanRow,
  "units_per_day" | "far_review_pages" | "prior_surahs" | "prior_juz" | "prior_pages" | "new_days" | "review_days"
>;

export type PlanOp =
  | { type: "create"; row: MemorizationPlanRow }
  | { type: "completeNew"; planId: string; day: string; from: number; to: number; finished: boolean; at: string; ayahs: AyahGroup[] }
  /** from = the older-pages cursor before, to = the recent window's anchor, cursor = the cursor after. */
  | { type: "completeReview"; planId: string; day: string; from: number; to: number; cursor: number }
  /** `ayahs`: what the surahs and juz just added make memorized. */
  | { type: "update"; planId: string; changes: PlanChanges; ayahs: AyahGroup[] }
  | { type: "archive"; planId: string };

export function reducePlan(state: PlanSnapshot, op: PlanOp): PlanSnapshot {
  switch (op.type) {
    case "create":
      if (state?.plan.id === op.row.id) return state;
      return { plan: op.row, log: [] };
    case "completeNew": {
      if (!state || state.plan.id !== op.planId || loggedOn(state.log, op.day, "new")) return state;
      const log = [{ day: op.day, kind: "new" as const, from_unit: op.from, to_unit: op.to }, ...state.log];
      if (state.plan.progress_units !== op.from) return { ...state, log };
      const plan: MemorizationPlanRow = {
        ...state.plan,
        progress_units: op.to,
        ...(op.finished && { status: "completed" as const, completed_at: op.at }),
      };
      return { plan, log };
    }
    case "completeReview": {
      if (!state || state.plan.id !== op.planId || loggedOn(state.log, op.day, "review")) return state;
      const log = [{ day: op.day, kind: "review" as const, from_unit: op.from, to_unit: op.to }, ...state.log];
      if (state.plan.review_cursor !== op.from) return { ...state, log };
      return { plan: { ...state.plan, review_cursor: op.cursor }, log };
    }
    case "update":
      if (!state || state.plan.id !== op.planId || state.plan.status !== "active") return state;
      return { ...state, plan: { ...state.plan, ...op.changes } };
    case "archive":
      return state?.plan.id === op.planId ? null : state;
  }
}

export function rebasePlan(base: PlanSnapshot, pending: PlanOp[]): PlanSnapshot {
  return pending.reduce(reducePlan, base);
}
