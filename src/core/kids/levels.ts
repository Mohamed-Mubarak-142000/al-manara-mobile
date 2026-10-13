// Ported from eslam-platform/src/features/kids/progress/levels.ts — keep in sync by hand.
import { KIDS_SURAH_IDS } from "./kidsSurahs";
import type { KidsProgressState } from "./progressTypes";

/** The share of right answers a surah's quiz needs to open the next surah. */
export const QUIZ_PASS_PERCENT = 70;

export type LevelStatus = "locked" | "open" | "passed";

export function isQuizPassed(correct: number, total: number): boolean {
  return total > 0 && (correct / total) * 100 >= QUIZ_PASS_PERCENT;
}

/** The surahs are levels in `KIDS_SURAH_IDS` order: the first is always open, each next one opens when the one before is passed. */
export function levelStatus(state: KidsProgressState, surahId: number): LevelStatus {
  if (state.passedQuizSurahs.includes(surahId)) return "passed";
  const index = KIDS_SURAH_IDS.indexOf(surahId);
  if (index <= 0) return "open";
  return state.passedQuizSurahs.includes(KIDS_SURAH_IDS[index - 1]!) ? "open" : "locked";
}

export function isSurahUnlocked(state: KidsProgressState, surahId: number): boolean {
  return levelStatus(state, surahId) !== "locked";
}

export function nextSurahId(surahId: number): number | null {
  const index = KIDS_SURAH_IDS.indexOf(surahId);
  return index >= 0 ? (KIDS_SURAH_IDS[index + 1] ?? null) : null;
}
