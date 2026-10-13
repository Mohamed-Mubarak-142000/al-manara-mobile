// Ported from eslam-platform/src/features/kids/progress/progressTypes.ts — keep in sync by hand.
import type { CompanionAnimal, GameKind } from "@/lib/database.types";

export interface KidsQuizStats {
  attempts: number;
  bestScorePercent: number;
  totalCorrect: number;
  totalQuestions: number;
  lastPlayedAt: string | null;
}

export interface KidsMatchStats {
  tajweedGamesCompleted: number;
  letterGamesCompleted: number;
  lastPlayedAt: string | null;
}

export interface KidsListenStats {
  surahsCompleted: number[];
  lastPlayedAt: string | null;
}

export interface KidsSurahReview {
  intervalIndex: number;
  lastReviewedAt: string;
  dueAt: string;
}

/** The journey steps of one surah besides memorizing it (which `memorizedAyahsBySurah` already tracks). */
export type MissionStep = "listen" | "play" | "recite";

export interface KidsCompanion {
  animal: CompanionAnimal;
  /** Owned companion items currently worn. */
  equipped: string[];
}

export interface KidsProgressState {
  version: 2;
  memorizedAyahsBySurah: Record<number, number[]>;
  quizStats: KidsQuizStats;
  matchStats: KidsMatchStats;
  listenStats: KidsListenStats;
  unlockedBadgeIds: string[];
  activityDates: string[];
  reviewSchedule: Record<number, KidsSurahReview>;
  companion: KidsCompanion | null;
  /** Finished games of every kind (the old `matchStats` only counted letters and tajweed). */
  gameCounts: Partial<Record<GameKind, number>>;
  surahSteps: Record<number, MissionStep[]>;
  /** Daily-challenge task ids finished on each day (YYYY-MM-DD). */
  dailyDone: Record<string, string[]>;
  ownedItems: string[];
  /** Opened chest id → the reward that came out of it. */
  openedChests: Record<string, string>;
  /** Surahs whose quiz the child passed; passing one opens the next surah. */
  passedQuizSurahs: number[];
  updatedAt: string;
}

export const DEFAULT_KIDS_PROGRESS: KidsProgressState = {
  version: 2,
  memorizedAyahsBySurah: {},
  quizStats: { attempts: 0, bestScorePercent: 0, totalCorrect: 0, totalQuestions: 0, lastPlayedAt: null },
  matchStats: { tajweedGamesCompleted: 0, letterGamesCompleted: 0, lastPlayedAt: null },
  listenStats: { surahsCompleted: [], lastPlayedAt: null },
  unlockedBadgeIds: [],
  activityDates: [],
  reviewSchedule: {},
  companion: null,
  gameCounts: {},
  surahSteps: {},
  dailyDone: {},
  ownedItems: [],
  openedChests: {},
  passedQuizSurahs: [],
  updatedAt: new Date(0).toISOString(),
};
