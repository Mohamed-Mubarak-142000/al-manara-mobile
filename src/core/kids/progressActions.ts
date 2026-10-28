// The state changes of eslam-platform/src/features/kids/progress/KidsProgressProvider.tsx, lifted out of the
// React provider as pure functions (same results, so a child's progress is identical on web and mobile).
import type { CompanionAnimal } from "@/lib/database.types";
import { computeUnlockedBadgeIds } from "./badges";
import { getRewardItem } from "./catalog";
import { applyDailyEvent, type DailyEvent } from "./dailyChallenge";
import { isQuizPassed } from "./levels";
import type { GameRecord } from "./remoteProgress";
import { advanceReviewSchedule, isSurahFullyMemorized, startReviewSchedule } from "./reviewSchedule";
import { gemBalance, ownedItemIds, rollChest, unopenedChests } from "./rewards";
import { recordActivityDate } from "./streak";
import { DEFAULT_KIDS_PROGRESS, type KidsProgressState, type MissionStep } from "./progressTypes";

/** A new state, plus the game rows to insert with it (counts don't diff, so games travel explicitly). */
export interface ProgressChange {
  state: KidsProgressState;
  games: GameRecord[];
}

export function withRecomputedBadges(state: KidsProgressState, event?: DailyEvent, now: Date = new Date()): KidsProgressState {
  const withDaily = event ? applyDailyEvent(state, event, now) : state;
  return {
    ...withDaily,
    unlockedBadgeIds: computeUnlockedBadgeIds(withDaily),
    activityDates: recordActivityDate(withDaily.activityDates, now),
    updatedAt: now.toISOString(),
  };
}

function toggleAyah(list: number[], numberInSurah: number, memorized: boolean): number[] {
  const withoutAyah = list.filter((value) => value !== numberInSurah);
  return memorized ? [...withoutAyah, numberInSurah].sort((a, b) => a - b) : withoutAyah;
}

function addStep(state: KidsProgressState, surahId: number | null | undefined, step: MissionStep): KidsProgressState {
  if (surahId === null || surahId === undefined) return state;
  const steps = state.surahSteps[surahId] ?? [];
  return steps.includes(step) ? state : { ...state, surahSteps: { ...state.surahSteps, [surahId]: [...steps, step] } };
}

export function setAyahsMemorized(current: KidsProgressState, surahId: number, ayahs: number[], memorized: boolean): ProgressChange {
  const nextList = ayahs.reduce((list, ayah) => toggleAyah(list, ayah, memorized), current.memorizedAyahsBySurah[surahId] ?? []);
  const nextState = { ...current, memorizedAyahsBySurah: { ...current.memorizedAyahsBySurah, [surahId]: nextList } };
  const wasFullyMemorized = isSurahFullyMemorized(current, surahId);
  const isNowFullyMemorized = isSurahFullyMemorized(nextState, surahId);
  const reviewSchedule =
    isNowFullyMemorized && !wasFullyMemorized && !(surahId in current.reviewSchedule)
      ? { ...current.reviewSchedule, [surahId]: startReviewSchedule() }
      : current.reviewSchedule;
  return { state: withRecomputedBadges({ ...nextState, reviewSchedule }, memorized ? { type: "learn" } : undefined), games: [] };
}

export function markSurahReviewed(current: KidsProgressState, surahId: number): ProgressChange | null {
  const existing = current.reviewSchedule[surahId];
  if (!existing) return null;
  return {
    state: withRecomputedBadges(
      { ...current, reviewSchedule: { ...current.reviewSchedule, [surahId]: advanceReviewSchedule(existing) } },
      { type: "learn" },
    ),
    games: [],
  };
}

export function recordQuizResult(current: KidsProgressState, correct: number, total: number, surahId?: number): ProgressChange {
  const scorePercent = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = surahId !== undefined && isQuizPassed(correct, total) && !current.passedQuizSurahs.includes(surahId);
  return {
    state: withRecomputedBadges(
      {
        ...current,
        quizStats: {
          attempts: current.quizStats.attempts + 1,
          bestScorePercent: Math.max(current.quizStats.bestScorePercent, scorePercent),
          totalCorrect: current.quizStats.totalCorrect + correct,
          totalQuestions: current.quizStats.totalQuestions + total,
          lastPlayedAt: new Date().toISOString(),
        },
        gameCounts: { ...current.gameCounts, quiz: (current.gameCounts.quiz ?? 0) + 1 },
        passedQuizSurahs: passed ? [...current.passedQuizSurahs, surahId] : current.passedQuizSurahs,
      },
      { type: "quiz" },
    ),
    games: [{ game: "quiz", surah: surahId ?? null, score: correct, total }],
  };
}

export function recordGame(current: KidsProgressState, record: GameRecord): ProgressChange {
  const isMatch = record.game === "tajweed" || record.game === "letters";
  const counted: KidsProgressState = {
    ...current,
    gameCounts: { ...current.gameCounts, [record.game]: (current.gameCounts[record.game] ?? 0) + 1 },
    matchStats: isMatch
      ? {
          tajweedGamesCompleted: current.matchStats.tajweedGamesCompleted + (record.game === "tajweed" ? 1 : 0),
          letterGamesCompleted: current.matchStats.letterGamesCompleted + (record.game === "letters" ? 1 : 0),
          lastPlayedAt: new Date().toISOString(),
        }
      : current.matchStats,
  };
  const step: MissionStep = record.game === "kids_recite" ? "recite" : "play";
  return { state: withRecomputedBadges(addStep(counted, record.surah, step), { type: "game", game: record.game }), games: [record] };
}

export function recordListenCompletion(current: KidsProgressState, surahId: number): ProgressChange {
  const surahsCompleted = current.listenStats.surahsCompleted.includes(surahId)
    ? current.listenStats.surahsCompleted
    : [...current.listenStats.surahsCompleted, surahId];
  return {
    state: withRecomputedBadges(
      addStep({ ...current, listenStats: { surahsCompleted, lastPlayedAt: new Date().toISOString() } }, surahId, "listen"),
      { type: "listen" },
    ),
    games: [],
  };
}

export function chooseCompanion(current: KidsProgressState, animal: CompanionAnimal): ProgressChange {
  return { state: { ...current, companion: { animal, equipped: current.companion?.equipped ?? [] } }, games: [] };
}

/** Wears an owned companion item (replacing whatever is in its slot), or takes it off. */
export function toggleEquip(current: KidsProgressState, itemId: string): ProgressChange | null {
  const item = getRewardItem(itemId);
  if (!current.companion || item?.kind !== "companion" || !ownedItemIds(current).has(itemId)) return null;
  const { equipped } = current.companion;
  const next = equipped.includes(itemId)
    ? equipped.filter((id) => id !== itemId)
    : [...equipped.filter((id) => (getRewardItem(id) as typeof item | undefined)?.slot !== item.slot), itemId];
  return { state: { ...current, companion: { ...current.companion, equipped: next } }, games: [] };
}

/** Null when the item is already owned or the balance is short. */
export function buyItem(current: KidsProgressState, itemId: string): ProgressChange | null {
  const item = getRewardItem(itemId);
  if (!item || ownedItemIds(current).has(itemId) || gemBalance(current) < item.price) return null;
  return { state: { ...current, ownedItems: [...current.ownedItems, itemId] }, games: [] };
}

/** Opens an earned chest: the change and what was inside (an item id or `gems-<n>`). */
export function openChest(current: KidsProgressState, chestId: string): { change: ProgressChange | null; reward: string | null } {
  if (!unopenedChests(current).some((chest) => chest.id === chestId))
    return { change: null, reward: current.openedChests[chestId] ?? null };
  const reward = rollChest(current, chestId);
  return { change: { state: { ...current, openedChests: { ...current.openedChests, [chestId]: reward } }, games: [] }, reward };
}

/** A reset clears learning progress, not who the child travels with. */
export function resetProgress(current: KidsProgressState): KidsProgressState {
  return { ...DEFAULT_KIDS_PROGRESS, companion: current.companion && { ...current.companion, equipped: [] } };
}
