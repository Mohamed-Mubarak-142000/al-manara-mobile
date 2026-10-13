// Ported from eslam-platform/src/features/nawawi/data.ts (getNawawiOverview) — keep in sync by hand.
// The rules only: the app reads the rows with the learner's own session (features/nawawi/nawawiExam.ts).
import { FINAL_PART, NAWAWI_PARTS } from "./nawawiData";

export type NawawiPartStatus =
  | { kind: "passed"; score: number; total: number }
  | { kind: "in-progress" }
  | { kind: "available"; lastScore: number | null; total: number | null };

export interface NawawiAttemptSummary {
  part: number;
  status: string;
  score: number | null;
  total: number;
  expires_at: string;
}

/** Each part's (1–4) and the final's (5) status from the learner's attempts, newest first. */
export function partStatuses(attempts: readonly NawawiAttemptSummary[], now = Date.now()): Record<number, NawawiPartStatus> {
  const parts: Record<number, NawawiPartStatus> = {};
  for (let part = 1; part <= FINAL_PART; part += 1) {
    const mine = attempts.filter((attempt) => attempt.part === part);
    const best = mine.filter((attempt) => attempt.status === "passed").sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
    const latest = mine[0];
    parts[part] = best
      ? { kind: "passed", score: best.score ?? 0, total: best.total }
      : latest?.status === "in_progress" && new Date(latest.expires_at).getTime() > now
        ? { kind: "in-progress" }
        : { kind: "available", lastScore: latest?.score ?? null, total: latest?.total ?? null };
  }
  return parts;
}

/** How many of the four parts are passed; the final opens at four. */
export function partsPassed(parts: Record<number, NawawiPartStatus>): number {
  return NAWAWI_PARTS.filter((part) => parts[part.id]?.kind === "passed").length;
}
