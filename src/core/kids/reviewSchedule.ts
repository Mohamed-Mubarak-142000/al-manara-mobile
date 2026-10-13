// Ported from eslam-platform/src/features/kids/progress/reviewSchedule.ts — keep in sync by hand.
import type { KidsProgressState, KidsSurahReview } from "./progressTypes";
import { getSurahAyahCount } from "@/core/quran/surahAyahCounts";

// Spaced-repetition intervals in days (SM-2-lite: fixed schedule, no ease factor).
const REVIEW_INTERVALS_DAYS = [1, 3, 7, 16, 35];
export const REVIEW_STAGE_COUNT = REVIEW_INTERVALS_DAYS.length;
const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(date: Date, days: number): string {
  return new Date(date.getTime() + days * DAY_MS).toISOString();
}

export function isSurahFullyMemorized(state: KidsProgressState, surahId: number): boolean {
  const total = getSurahAyahCount(surahId);
  const memorized = state.memorizedAyahsBySurah[surahId]?.length ?? 0;
  return total > 0 && memorized >= total;
}

export function startReviewSchedule(now: Date = new Date()): KidsSurahReview {
  return { intervalIndex: 0, lastReviewedAt: now.toISOString(), dueAt: addDays(now, REVIEW_INTERVALS_DAYS[0]!) };
}

export function advanceReviewSchedule(current: KidsSurahReview, now: Date = new Date()): KidsSurahReview {
  const nextIndex = Math.min(current.intervalIndex + 1, REVIEW_INTERVALS_DAYS.length - 1);
  return { intervalIndex: nextIndex, lastReviewedAt: now.toISOString(), dueAt: addDays(now, REVIEW_INTERVALS_DAYS[nextIndex]!) };
}

export interface DueSurah {
  surahId: number;
  dueAt: string;
}

export function getDueReviews(reviewSchedule: Record<number, KidsSurahReview>, now: Date = new Date()): DueSurah[] {
  return Object.entries(reviewSchedule)
    .filter(([, review]) => new Date(review.dueAt).getTime() <= now.getTime())
    .map(([surahId, review]) => ({ surahId: Number(surahId), dueAt: review.dueAt }))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}
