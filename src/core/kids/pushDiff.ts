// The website's pushDiff (features/kids/progress/KidsProgressProvider.tsx), split in two: diffWrites() lists the
// writer calls as plain data (so the app can queue them in its outbox and send them offline later), and
// runWrites() makes them with the ported remoteWriter. Same calls, same rows as the website.
import type { GameRecord, RemoteWriter } from "./remoteProgress";
import type { KidsCompanion, KidsProgressState, KidsSurahReview } from "./progressTypes";

export type KidsWrite =
  | { op: "setAyahs"; surah: number; ayahs: number[]; memorized: boolean }
  | { op: "setReview"; surah: number; review: KidsSurahReview }
  | { op: "addActivityDays"; days: string[] }
  | { op: "addBadges"; badgeIds: string[] }
  | { op: "addListens"; surahs: number[] }
  | { op: "addGames"; games: GameRecord[] }
  | { op: "setProfile"; companion: KidsCompanion | null }
  | { op: "addDailyTasks"; tasks: { day: string; taskId: string }[] }
  | { op: "addRewards"; rewards: { kind: "item" | "chest"; refId: string; rewardId?: string }[] }
  | { op: "reset" };

export function diffWrites(prev: KidsProgressState, next: KidsProgressState, games: GameRecord[]): KidsWrite[] {
  const writes: KidsWrite[] = [];
  const surahs = new Set([...Object.keys(prev.memorizedAyahsBySurah), ...Object.keys(next.memorizedAyahsBySurah)].map(Number));
  for (const surah of surahs) {
    const before = new Set(prev.memorizedAyahsBySurah[surah] ?? []);
    const after = new Set(next.memorizedAyahsBySurah[surah] ?? []);
    const added = [...after].filter((ayah) => !before.has(ayah));
    const removed = [...before].filter((ayah) => !after.has(ayah));
    if (added.length) writes.push({ op: "setAyahs", surah, ayahs: added, memorized: true });
    if (removed.length) writes.push({ op: "setAyahs", surah, ayahs: removed, memorized: false });
  }
  for (const [surah, review] of Object.entries(next.reviewSchedule)) {
    if (prev.reviewSchedule[Number(surah)]?.lastReviewedAt !== review.lastReviewedAt)
      writes.push({ op: "setReview", surah: Number(surah), review });
  }
  const days = next.activityDates.filter((day) => !prev.activityDates.includes(day));
  if (days.length) writes.push({ op: "addActivityDays", days });
  const badgeIds = next.unlockedBadgeIds.filter((id) => !prev.unlockedBadgeIds.includes(id));
  if (badgeIds.length) writes.push({ op: "addBadges", badgeIds });
  const listens = next.listenStats.surahsCompleted.filter((surah) => !prev.listenStats.surahsCompleted.includes(surah));
  if (listens.length) writes.push({ op: "addListens", surahs: listens });
  if (JSON.stringify(prev.companion) !== JSON.stringify(next.companion)) writes.push({ op: "setProfile", companion: next.companion });
  const tasks = Object.entries(next.dailyDone).flatMap(([day, done]) =>
    done.filter((task) => !(prev.dailyDone[day] ?? []).includes(task)).map((taskId) => ({ day, taskId })),
  );
  if (tasks.length) writes.push({ op: "addDailyTasks", tasks });
  const rewards = [
    ...next.ownedItems.filter((id) => !prev.ownedItems.includes(id)).map((refId) => ({ kind: "item" as const, refId })),
    ...Object.entries(next.openedChests)
      .filter(([chestId]) => !(chestId in prev.openedChests))
      .map(([refId, rewardId]) => ({ kind: "chest" as const, refId, rewardId })),
  ];
  if (rewards.length) writes.push({ op: "addRewards", rewards });
  // Last: the only write that isn't idempotent, so a retry of this batch after a later failure can't repeat it.
  if (games.length) writes.push({ op: "addGames", games });
  return writes;
}

/** Sends the writes in order (the website sends them together; order keeps a reset before what follows it). */
export async function runWrites(writer: RemoteWriter, writes: KidsWrite[]): Promise<void> {
  for (const write of writes) {
    switch (write.op) {
      case "setAyahs":
        await writer.setAyahs(write.surah, write.ayahs, write.memorized);
        break;
      case "setReview":
        await writer.setReview(write.surah, write.review);
        break;
      case "addActivityDays":
        await writer.addActivityDays(write.days);
        break;
      case "addBadges":
        await writer.addBadges(write.badgeIds);
        break;
      case "addListens":
        await writer.addListens(write.surahs);
        break;
      case "addGames":
        await writer.addGames(write.games);
        break;
      case "setProfile":
        await writer.setProfile(write.companion);
        break;
      case "addDailyTasks":
        await writer.addDailyTasks(write.tasks);
        break;
      case "addRewards":
        await writer.addRewards(write.rewards);
        break;
      case "reset":
        await writer.reset();
        break;
    }
  }
}
