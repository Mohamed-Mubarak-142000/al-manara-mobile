// Ported from eslam-platform/src/features/kids/progress/rewards.ts — keep in sync by hand.
import { getRewardItem, REWARD_ITEMS } from "./catalog";
import { KIDS_SURAH_IDS } from "./kidsSurahs";
import type { KidsProgressState } from "./progressTypes";
import { completedDailyDays } from "./dailyChallenge";

/** Small stable string hash (FNV-1a), so a chest gives the same surprise on every device. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Every full week inside each run of consecutive active days; never goes down once earned. */
export function countActiveWeeks(activityDates: string[]): number {
  const days = [...new Set(activityDates)].sort();
  let weeks = 0;
  let run = 0;
  let previous: number | null = null;
  for (const day of days) {
    const time = Date.parse(`${day}T00:00:00Z`);
    run = previous !== null && time - previous === DAY_MS ? run + 1 : 1;
    if (run % 7 === 0) weeks += 1;
    previous = time;
  }
  return weeks;
}

// ── Chests ──────────────────────────────────────────────────────────────

export interface Chest {
  id: string;
  label: string;
}

export function earnedChests(state: KidsProgressState): Chest[] {
  const chests: Chest[] = [];
  for (const surahId of KIDS_SURAH_IDS) {
    if (state.passedQuizSurahs.includes(surahId)) chests.push({ id: `surah-${surahId}`, label: "صندوق المحطة" });
  }
  for (const day of completedDailyDays(state)) chests.push({ id: `daily-${day}`, label: "صندوق تحدي اليوم" });
  return chests;
}

export function unopenedChests(state: KidsProgressState): Chest[] {
  return earnedChests(state).filter((chest) => !(chest.id in state.openedChests));
}

const GEM_REWARD = /^gems-(\d+)$/;

export function chestGems(rewardId: string): number {
  const match = GEM_REWARD.exec(rewardId);
  return match ? Number(match[1]) : 0;
}

/** Items the child has: bought ones plus those that came out of chests. */
export function ownedItemIds(state: KidsProgressState): Set<string> {
  const owned = new Set(state.ownedItems);
  for (const reward of Object.values(state.openedChests)) if (getRewardItem(reward)) owned.add(reward);
  return owned;
}

/** What a chest holds: a not-yet-owned item two times in three, otherwise a handful of gems. */
export function rollChest(state: KidsProgressState, chestId: string): string {
  const hash = hashString(chestId);
  const missing = REWARD_ITEMS.filter((item) => !ownedItemIds(state).has(item.id));
  if (missing.length === 0 || hash % 3 === 0) return `gems-${10 + (hash % 4) * 5}`;
  return missing[hash % missing.length]!.id;
}

// ── Gems ────────────────────────────────────────────────────────────────

export function earnedGems(state: KidsProgressState): number {
  const surahs = KIDS_SURAH_IDS.filter((surahId) => state.passedQuizSurahs.includes(surahId)).length;
  const fromChests = Object.values(state.openedChests).reduce((sum, reward) => sum + chestGems(reward), 0);
  return (
    surahs * 10 +
    completedDailyDays(state).length * 5 +
    countActiveWeeks(state.activityDates) * 15 +
    state.unlockedBadgeIds.length * 5 +
    fromChests
  );
}

export function spentGems(state: KidsProgressState): number {
  return state.ownedItems.reduce((sum, id) => sum + (getRewardItem(id)?.price ?? 0), 0);
}

/** Never shown below zero (unmarking an ayah can lower what was earned). */
export function gemBalance(state: KidsProgressState): number {
  return Math.max(0, earnedGems(state) - spentGems(state));
}
