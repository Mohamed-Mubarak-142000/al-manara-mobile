// Ported from eslam-platform/src/features/kids/progress/stars.ts — keep in sync by hand.
import type { KidsProgressState } from "./progressTypes";

/** Finished games of every kind except the quiz, which earns a star per correct answer instead. */
export function countGamesPlayed(state: KidsProgressState): number {
  return Object.entries(state.gameCounts).reduce((sum, [game, count]) => (game === "quiz" ? sum : sum + (count ?? 0)), 0);
}

/** A single friendly "stars" total for the garden: every learning action earns some. */
export function computeStars(state: KidsProgressState): number {
  return (
    countMemorizedAyahs(state) * 2 +
    state.quizStats.totalCorrect +
    countGamesPlayed(state) * 3 +
    state.listenStats.surahsCompleted.length * 5
  );
}

export function countMemorizedAyahs(state: KidsProgressState): number {
  return Object.values(state.memorizedAyahsBySurah).reduce((sum, ayahs) => sum + ayahs.length, 0);
}
