import type { MemorizationPlanLogRow, MemorizationPlanRow } from "@/lib/database.types";

/** The website's PlanWithLog (features/plan/data.ts). */
export interface PlanWithLog {
  plan: MemorizationPlanRow;
  log: Pick<MemorizationPlanLogRow, "day" | "kind" | "from_unit" | "to_unit">[];
}

export function loggedOn(log: PlanWithLog["log"], day: string, kind: MemorizationPlanLogRow["kind"]) {
  const entry = log.find((row) => row.day === day && row.kind === kind);
  return entry ? { from: entry.from_unit, to: entry.to_unit } : null;
}
