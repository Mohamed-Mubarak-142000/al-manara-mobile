import { buildJuzRanges, countMemorizedInJuz, type JuzRange } from "@/core/progress/juz";
import { getSurahAyahCount } from "@/core/quran/surahAyahCounts";
import { currentUserIdNow } from "@/features/account/accountStore";
import { mushafStarts } from "@/features/mushaf/mushaf";
import { enqueue, registerHandler, throwIfError } from "@/lib/outbox";
import { supabase } from "@/lib/supabase";

/**
 * The learner's progress, read and written on the same tables as the website's KidsProgressProvider
 * (memorized_ayahs, review_schedule, activity_days…), so "رحلتي" shows the same thing on both.
 */

/** The website's REVIEW_INTERVALS_DAYS: a fully memorized surah comes back after 1, 3, 7, 16 then 35 days. */
export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 16, 35];
const DAY_MS = 24 * 60 * 60 * 1000;

/** The website stores activity as UTC dates (computeStreak), so the app does too. */
function utcDay(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

const recorded = new Set<string>();
const ACTIVITY_OP = "activity";

registerHandler<{ learnerId: string; day: string }>(ACTIVITY_OP, async ({ learnerId, day }) => {
  if (!supabase) return;
  throwIfError(
    await supabase.from("activity_days").upsert({ learner_id: learnerId, day }, { onConflict: "learner_id,day", ignoreDuplicates: true }),
  );
});

/**
 * Marks today as a day of activity (once per learner per day). Goes through the outbox with the day it
 * happened on, so a day of practice offline still counts in the streak once it syncs.
 */
export function recordActivity(learnerId: string | null) {
  const owner = currentUserIdNow();
  if (!supabase || !learnerId || !owner) return;
  const day = utcDay();
  const key = `${learnerId}:${day}`;
  if (recorded.has(key)) return;
  recorded.add(key);
  enqueue({ kind: ACTIVITY_OP, owner, payload: { learnerId, day }, dedupeKey: `${ACTIVITY_OP}:${key}` });
}

/** Starts the review schedule of any surah these ayahs completed, like the website does on memorizing. */
export async function scheduleCompletedSurahs(learnerId: string, surahs: number[]) {
  if (!supabase || surahs.length === 0) return;
  const { data } = await supabase.from("memorized_ayahs").select("surah").eq("learner_id", learnerId).in("surah", surahs).limit(10000);
  const counts = new Map<number, number>();
  for (const row of data ?? []) counts.set(row.surah, (counts.get(row.surah) ?? 0) + 1);
  const complete = surahs.filter((surah) => (counts.get(surah) ?? 0) >= getSurahAyahCount(surah));
  if (complete.length === 0) return;
  const now = new Date();
  await supabase.from("review_schedule").upsert(
    complete.map((surah) => ({
      learner_id: learnerId,
      surah,
      interval_index: 0,
      last_reviewed_at: now.toISOString(),
      due_at: new Date(now.getTime() + REVIEW_INTERVALS_DAYS[0]! * DAY_MS).toISOString(),
    })),
    { onConflict: "learner_id,surah", ignoreDuplicates: true },
  );
}

/**
 * The website's progress.setAyahsMemorized(surah, ayahs, true) after a tasmee ("علّم الصحيحة كمحفوظة"):
 * the ayahs on the account, then the review schedule of the surah if that completed it.
 */
export async function markAyahsMemorized(learnerId: string, surah: number, ayahs: number[]): Promise<boolean> {
  if (!supabase || ayahs.length === 0) return false;
  const { error } = await supabase
    .from("memorized_ayahs")
    .upsert(
      ayahs.map((ayah) => ({ learner_id: learnerId, surah, ayah })),
      { onConflict: "learner_id,surah,ayah", ignoreDuplicates: true },
    );
  if (error) return false;
  await scheduleCompletedSurahs(learnerId, [surah]).catch(() => {});
  recordActivity(learnerId);
  return true;
}

/** The surah's review row when it has one (null for none or when it can't be read). */
export async function loadSurahReview(learnerId: string, surah: number): Promise<ReviewRow | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("review_schedule")
    .select("surah, interval_index, due_at")
    .eq("learner_id", learnerId)
    .eq("surah", surah)
    .maybeSingle();
  return data ?? null;
}

export interface ReviewRow {
  surah: number;
  interval_index: number;
  due_at: string;
}

/** "راجعتها": the next interval (capped at the last), due counted from now. */
export async function markSurahReviewed(learnerId: string, review: ReviewRow): Promise<boolean> {
  if (!supabase) return false;
  const nextIndex = Math.min(review.interval_index + 1, REVIEW_INTERVALS_DAYS.length - 1);
  const now = new Date();
  const { error } = await supabase
    .from("review_schedule")
    .update({
      interval_index: nextIndex,
      last_reviewed_at: now.toISOString(),
      due_at: new Date(now.getTime() + REVIEW_INTERVALS_DAYS[nextIndex]! * DAY_MS).toISOString(),
    })
    .eq("learner_id", learnerId)
    .eq("surah", review.surah);
  if (!error) recordActivity(learnerId);
  return !error;
}

/** The website's computeStreak: consecutive days back from today, or from yesterday if today is still empty. */
export function computeStreak(days: string[]): number {
  const set = new Set(days);
  let cursor = new Date();
  if (!set.has(utcDay(cursor))) cursor = new Date(cursor.getTime() - DAY_MS);
  let streak = 0;
  while (set.has(utcDay(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}

export interface JuzProgress {
  juz: number;
  memorized: number;
  total: number;
  percent: number;
  certificateCode: string | null;
  lastFailed: boolean;
}

export interface Journey {
  memorizedAyahs: number;
  streak: number;
  certificates: number;
  badges: number;
  juz: JuzProgress[];
  reviews: ReviewRow[];
  tasmee: { id: number; surah: number; ayah_from: number; ayah_to: number; correct: number; mistakes: number; created_at: string }[];
}

let juzRanges: JuzRange[] | null = null;

export async function loadJourney(learnerId: string): Promise<Journey | null> {
  if (!supabase) return null;
  const [memorized, reviews, activity, certificates, attempts, badges, tasmee] = await Promise.all([
    supabase.from("memorized_ayahs").select("surah, ayah").eq("learner_id", learnerId).limit(10000),
    supabase.from("review_schedule").select("surah, interval_index, due_at").eq("learner_id", learnerId),
    supabase.from("activity_days").select("day").eq("learner_id", learnerId).order("day", { ascending: false }).limit(400),
    supabase.from("certificates").select("juz, verification_code, revoked_at").eq("learner_id", learnerId),
    supabase.from("exam_attempts").select("juz, status").eq("learner_id", learnerId).order("started_at", { ascending: false }).limit(60),
    supabase.from("learner_badges").select("badge_id", { count: "exact", head: true }).eq("learner_id", learnerId),
    supabase
      .from("tasmee_sessions")
      .select("id, surah, ayah_from, ayah_to, correct, mistakes, created_at")
      .eq("learner_id", learnerId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  if (memorized.error) return null;

  const bySurah: Record<number, number[]> = {};
  for (const row of memorized.data ?? []) (bySurah[row.surah] ??= []).push(row.ayah);
  juzRanges ??= buildJuzRanges(mushafStarts().juzStarts);
  const valid = (certificates.data ?? []).filter((row) => !row.revoked_at);

  return {
    memorizedAyahs: memorized.data?.length ?? 0,
    streak: computeStreak((activity.data ?? []).map((row) => row.day)),
    certificates: valid.length,
    badges: badges.count ?? 0,
    juz: juzRanges.map((range) => {
      const count = countMemorizedInJuz(range, bySurah);
      const latest = attempts.data?.find((attempt) => attempt.juz === range.juz);
      return {
        juz: range.juz,
        memorized: count,
        total: range.totalAyahs,
        percent: range.totalAyahs ? Math.round((count / range.totalAyahs) * 100) : 0,
        certificateCode: valid.find((row) => row.juz === range.juz)?.verification_code ?? null,
        lastFailed: !!latest && latest.status !== "passed" && latest.status !== "in_progress",
      };
    }),
    reviews: (reviews.data ?? []).sort((a, b) => a.due_at.localeCompare(b.due_at)),
    tasmee: tasmee.data ?? [],
  };
}
