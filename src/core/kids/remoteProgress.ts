// Ported from eslam-platform/src/features/kids/progress/remoteProgress.ts — keep in sync by hand.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, GameKind } from "@/lib/database.types";
import { DEFAULT_KIDS_PROGRESS, type KidsCompanion, type KidsProgressState, type KidsSurahReview, type MissionStep } from "./progressTypes";
import { isQuizPassed } from "./levels";

type Client = SupabaseClient<Database>;

export interface GameRecord {
  game: GameKind;
  surah?: number | null;
  score: number;
  total: number;
  stars?: number | null;
  moves?: number | null;
}

/** Rebuilds the progress state for one learner from the normalized tables (RLS scopes every query). */
export async function loadRemoteProgress(supabase: Client, learnerId: string): Promise<KidsProgressState> {
  const [ayahs, reviews, days, games, listens, badges, profile, daily, rewards] = await Promise.all([
    supabase.from("memorized_ayahs").select("surah, ayah").eq("learner_id", learnerId).limit(10000),
    supabase.from("review_schedule").select("surah, interval_index, last_reviewed_at, due_at").eq("learner_id", learnerId),
    supabase.from("activity_days").select("day").eq("learner_id", learnerId).order("day").limit(2000),
    supabase
      .from("game_sessions")
      .select("game, surah, score, total, created_at")
      .eq("learner_id", learnerId)
      .order("created_at")
      .limit(5000),
    supabase.from("listen_completions").select("surah, completed_at").eq("learner_id", learnerId),
    supabase.from("learner_badges").select("badge_id").eq("learner_id", learnerId),
    supabase.from("kids_profile").select("companion, equipped").eq("learner_id", learnerId).maybeSingle(),
    supabase.from("kids_daily_tasks").select("day, task_id").eq("learner_id", learnerId).limit(5000),
    supabase.from("kids_rewards").select("kind, ref_id, reward_id").eq("learner_id", learnerId),
  ]);
  const failed = [ayahs, reviews, days, games, listens, badges, profile, daily, rewards].find((result) => result.error);
  if (failed?.error) throw failed.error;

  const memorizedAyahsBySurah: Record<number, number[]> = {};
  for (const row of ayahs.data ?? []) (memorizedAyahsBySurah[row.surah] ??= []).push(row.ayah);
  for (const list of Object.values(memorizedAyahsBySurah)) list.sort((a, b) => a - b);

  const reviewSchedule: Record<number, KidsSurahReview> = {};
  for (const row of reviews.data ?? [])
    reviewSchedule[row.surah] = { intervalIndex: row.interval_index, lastReviewedAt: row.last_reviewed_at, dueAt: row.due_at };

  const quizStats = { ...DEFAULT_KIDS_PROGRESS.quizStats };
  const matchStats = { ...DEFAULT_KIDS_PROGRESS.matchStats };
  const gameCounts: KidsProgressState["gameCounts"] = {};
  const surahSteps: Record<number, MissionStep[]> = {};
  const passedQuizSurahs = new Set<number>();
  const addStep = (surah: number, step: MissionStep) => {
    const steps = (surahSteps[surah] ??= []);
    if (!steps.includes(step)) steps.push(step);
  };
  for (const row of games.data ?? []) {
    gameCounts[row.game] = (gameCounts[row.game] ?? 0) + 1;
    if (row.surah !== null && row.game !== "quiz") addStep(row.surah, row.game === "kids_recite" ? "recite" : "play");
    if (row.game === "quiz") {
      quizStats.attempts += 1;
      quizStats.totalCorrect += row.score;
      quizStats.totalQuestions += row.total;
      quizStats.bestScorePercent = Math.max(quizStats.bestScorePercent, row.total > 0 ? Math.round((row.score / row.total) * 100) : 0);
      quizStats.lastPlayedAt = row.created_at;
      if (row.surah !== null && isQuizPassed(row.score, row.total)) passedQuizSurahs.add(row.surah);
    } else if (row.game === "tajweed" || row.game === "letters") {
      if (row.game === "tajweed") matchStats.tajweedGamesCompleted += 1;
      else matchStats.letterGamesCompleted += 1;
      matchStats.lastPlayedAt = row.created_at;
    }
  }

  const listenRows = listens.data ?? [];
  for (const row of listenRows) addStep(row.surah, "listen");

  const dailyDone: Record<string, string[]> = {};
  for (const row of daily.data ?? []) (dailyDone[row.day] ??= []).push(row.task_id);

  const ownedItems: string[] = [];
  const openedChests: Record<string, string> = {};
  for (const row of rewards.data ?? []) {
    if (row.kind === "item") ownedItems.push(row.ref_id);
    else openedChests[row.ref_id] = row.reward_id ?? "";
  }

  const kidsProfile = profile.data;
  return {
    ...DEFAULT_KIDS_PROGRESS,
    memorizedAyahsBySurah,
    reviewSchedule,
    quizStats,
    matchStats,
    gameCounts,
    surahSteps,
    dailyDone,
    ownedItems,
    openedChests,
    companion: kidsProfile?.companion ? { animal: kidsProfile.companion, equipped: kidsProfile.equipped } : null,
    passedQuizSurahs: [...passedQuizSurahs],
    listenStats: {
      surahsCompleted: listenRows.map((row) => row.surah),
      lastPlayedAt: listenRows.reduce<string | null>(
        (latest, row) => (!latest || row.completed_at > latest ? row.completed_at : latest),
        null,
      ),
    },
    activityDates: (days.data ?? []).map((row) => row.day),
    unlockedBadgeIds: (badges.data ?? []).map((row) => row.badge_id),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Throws the server's error with its HTTP status. The website ignores write errors; the app sends these writes
 * through the outbox, which needs them to retry offline (see features/kids/progress/progressStore.ts).
 */
function check({ error, status }: { error: unknown; status: number }) {
  if (error) throw Object.assign({}, error, { status });
}

/** Write-through operations; each is idempotent so a retry or a second tab cannot duplicate rows. */
export function remoteWriter(supabase: Client, learnerId: string) {
  const learner_id = learnerId;
  return {
    async setAyahs(surah: number, ayahs: number[], memorized: boolean) {
      if (ayahs.length === 0) return;
      if (memorized) {
        check(await supabase.from("memorized_ayahs").upsert(
          ayahs.map((ayah) => ({ learner_id, surah, ayah })),
          { onConflict: "learner_id,surah,ayah", ignoreDuplicates: true },
        ));
      } else {
        check(await supabase.from("memorized_ayahs").delete().eq("learner_id", learner_id).eq("surah", surah).in("ayah", ayahs));
      }
    },
    async setReview(surah: number, review: KidsSurahReview) {
      check(await supabase
        .from("review_schedule")
        .upsert(
          { learner_id, surah, interval_index: review.intervalIndex, last_reviewed_at: review.lastReviewedAt, due_at: review.dueAt },
          { onConflict: "learner_id,surah" },
        ));
    },
    async addActivityDays(days: string[]) {
      if (days.length === 0) return;
      check(await supabase.from("activity_days").upsert(
        days.map((day) => ({ learner_id, day })),
        { onConflict: "learner_id,day", ignoreDuplicates: true },
      ));
    },
    async addBadges(badgeIds: string[]) {
      if (badgeIds.length === 0) return;
      check(await supabase.from("learner_badges").upsert(
        badgeIds.map((badge_id) => ({ learner_id, badge_id })),
        { onConflict: "learner_id,badge_id", ignoreDuplicates: true },
      ));
    },
    async addListens(surahs: number[]) {
      if (surahs.length === 0) return;
      check(await supabase.from("listen_completions").upsert(
        surahs.map((surah) => ({ learner_id, surah })),
        { onConflict: "learner_id,surah", ignoreDuplicates: true },
      ));
    },
    async addGames(games: GameRecord[]) {
      if (games.length === 0) return;
      check(await supabase.from("game_sessions").insert(
        games.map((game) => ({
          learner_id,
          game: game.game,
          surah: game.surah ?? null,
          score: game.score,
          total: game.total,
          stars: game.stars ?? null,
          moves: game.moves ?? null,
        })),
      ));
    },
    async setProfile(companion: KidsCompanion | null) {
      check(await supabase.from("kids_profile").upsert(
        {
          learner_id,
          companion: companion?.animal ?? null,
          equipped: companion?.equipped ?? [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: "learner_id" },
      ));
    },
    async addDailyTasks(tasks: { day: string; taskId: string }[]) {
      if (tasks.length === 0) return;
      check(await supabase.from("kids_daily_tasks").upsert(
        tasks.map(({ day, taskId }) => ({ learner_id, day, task_id: taskId })),
        { onConflict: "learner_id,day,task_id", ignoreDuplicates: true },
      ));
    },
    async addRewards(rewards: { kind: "item" | "chest"; refId: string; rewardId?: string }[]) {
      if (rewards.length === 0) return;
      check(await supabase.from("kids_rewards").upsert(
        rewards.map(({ kind, refId, rewardId }) => ({ learner_id, kind, ref_id: refId, reward_id: rewardId ?? null })),
        { onConflict: "learner_id,kind,ref_id", ignoreDuplicates: true },
      ));
    },
    async reset() {
      // The companion stays: a reset clears learning progress, not who the child travels with.
      await Promise.all(
        (
          [
            "memorized_ayahs",
            "review_schedule",
            "activity_days",
            "game_sessions",
            "listen_completions",
            "learner_badges",
            "kids_daily_tasks",
            "kids_rewards",
          ] as const
        ).map(async (table) => check(await supabase.from(table).delete().eq("learner_id", learner_id))),
      );
    },
  };
}

export type RemoteWriter = ReturnType<typeof remoteWriter>;
