import { computeUnlockedBadgeIds } from "@/core/kids/badges";
import { applyDailyEvent, buildDailyChallenge, completedDailyDays } from "@/core/kids/dailyChallenge";
import { splitAyahWords, buildWordTiles, wrongPositions } from "@/core/kids/games/arrangeGameLogic";
import { starsForSlips } from "@/core/kids/games/gameUtils";
import { journeyStations, missionProgress, stationStars } from "@/core/kids/journey";
import { KIDS_SURAH_IDS } from "@/core/kids/kidsSurahs";
import { isQuizPassed, levelStatus, nextSurahId } from "@/core/kids/levels";
import * as actions from "@/core/kids/progressActions";
import { DEFAULT_KIDS_PROGRESS, type KidsProgressState } from "@/core/kids/progressTypes";
import { diffWrites } from "@/core/kids/pushDiff";
import { countActiveWeeks, earnedChests, gemBalance, hashString, rollChest } from "@/core/kids/rewards";
import { computeStreak } from "@/core/kids/streak";

const base = (patch: Partial<KidsProgressState> = {}): KidsProgressState => ({ ...DEFAULT_KIDS_PROGRESS, ...patch });

describe("kids levels and journey (ported from the website)", () => {
  it("orders the stations from Al-Fatiha, then An-Nas back to An-Naba", () => {
    expect(KIDS_SURAH_IDS[0]).toBe(1);
    expect(KIDS_SURAH_IDS[1]).toBe(114);
    expect(KIDS_SURAH_IDS.at(-1)).toBe(78);
    expect(KIDS_SURAH_IDS).toHaveLength(38);
  });

  it("opens a surah only once the quiz before it is passed", () => {
    const fresh = base();
    expect(levelStatus(fresh, 1)).toBe("open");
    expect(levelStatus(fresh, 114)).toBe("locked");
    const passed = base({ passedQuizSurahs: [1] });
    expect(levelStatus(passed, 1)).toBe("passed");
    expect(levelStatus(passed, 114)).toBe("open");
    expect(nextSurahId(1)).toBe(114);
    expect(nextSurahId(78)).toBeNull();
  });

  it("passes a quiz at 70%", () => {
    expect(isQuizPassed(6, 8)).toBe(true);
    expect(isQuizPassed(5, 8)).toBe(false);
    expect(isQuizPassed(0, 0)).toBe(false);
  });

  it("marks the first open station as current", () => {
    const stations = journeyStations(base({ passedQuizSurahs: [1] }));
    expect(stations[0]!.status).toBe("done");
    expect(stations[1]!.status).toBe("current");
    expect(stations[2]!.status).toBe("locked");
  });
});

describe("kids progress actions", () => {
  it("opens the next surah when the station's quiz passes, and records the quiz row", () => {
    const change = actions.recordQuizResult(base(), 7, 8, 1);
    expect(change.state.passedQuizSurahs).toEqual([1]);
    expect(change.state.quizStats).toMatchObject({ attempts: 1, totalCorrect: 7, totalQuestions: 8, bestScorePercent: 88 });
    expect(change.games).toEqual([{ game: "quiz", surah: 1, score: 7, total: 8 }]);
    expect(levelStatus(change.state, 114)).toBe("open");
  });

  it("starts the review schedule when a surah becomes fully memorized", () => {
    const { state } = actions.setAyahsMemorized(base(), 112, [1, 2, 3, 4], true);
    expect(state.memorizedAyahsBySurah[112]).toEqual([1, 2, 3, 4]);
    expect(state.reviewSchedule[112]?.intervalIndex).toBe(0);
    expect(missionProgress(state, 112).learn).toBe(true);
    expect(state.unlockedBadgeIds).toContain("first-surah");
  });

  it("counts a game as the station's play step", () => {
    const { state, games } = actions.recordGame(base(), { game: "arrange", surah: 114, score: 1, total: 1, stars: 3 });
    expect(state.surahSteps[114]).toEqual(["play"]);
    expect(state.gameCounts.arrange).toBe(1);
    expect(stationStars(state, 114)).toBe(1);
    expect(games).toHaveLength(1);
  });

  it("wears one item per slot and only owned ones", () => {
    const owned = base({ companion: { animal: "bear", equipped: [] }, ownedItems: ["cap", "crown"] });
    const capped = actions.toggleEquip(owned, "cap")!.state;
    expect(capped.companion?.equipped).toEqual(["cap"]);
    expect(actions.toggleEquip(capped, "crown")!.state.companion?.equipped).toEqual(["crown"]);
    expect(actions.toggleEquip(owned, "glasses")).toBeNull();
  });

  it("can't buy what the gems don't cover", () => {
    expect(actions.buyItem(base(), "crown")).toBeNull();
  });
});

describe("kids rewards", () => {
  it("rolls the same chest the same way on every device", () => {
    const state = base({ passedQuizSurahs: [1] });
    expect(rollChest(state, "surah-1")).toBe(rollChest(state, "surah-1"));
    expect(hashString("surah-1")).toBe(hashString("surah-1"));
    expect(earnedChests(state).map((chest) => chest.id)).toEqual(["surah-1"]);
  });

  it("earns gems for stations, badges and opened chests", () => {
    expect(gemBalance(base({ passedQuizSurahs: [1], unlockedBadgeIds: ["first-step"], openedChests: { "surah-1": "gems-15" } }))).toBe(10 + 5 + 15);
  });

  it("counts full weeks of consecutive days", () => {
    const days = Array.from({ length: 7 }, (_, i) => `2026-01-0${i + 1}`);
    expect(countActiveWeeks(days.slice(0, 7))).toBe(1);
    expect(countActiveWeeks(days.slice(0, 6))).toBe(0);
  });
});

describe("kids daily challenge and streak", () => {
  it("gives three tasks a day, with learning or listening always in", () => {
    const tasks = buildDailyChallenge("2026-10-13");
    expect(tasks).toHaveLength(3);
    expect(new Set(tasks.map((task) => task.id)).size).toBe(3);
    expect(tasks.some((task) => task.id === "learn" || task.id === "listen")).toBe(true);
    expect(buildDailyChallenge("2026-10-13")).toEqual(tasks);
  });

  it("completes the day after its three tasks", () => {
    const now = new Date("2026-10-13T10:00:00Z");
    let state = base();
    for (const event of [{ type: "listen" }, { type: "learn" }, { type: "quiz" }, { type: "game", game: "arrange" }, { type: "game", game: "kids_recite" }] as const)
      state = applyDailyEvent(state, event, now);
    expect(completedDailyDays(state)).toEqual(["2026-10-13"]);
  });

  it("counts the streak back from today or yesterday", () => {
    const now = new Date("2026-10-13T10:00:00Z");
    expect(computeStreak(["2026-10-11", "2026-10-12"], now)).toBe(2);
    expect(computeStreak(["2026-10-10"], now)).toBe(0);
  });
});

describe("kids sync writes (the website's pushDiff)", () => {
  it("writes only what changed, with the game rows last", () => {
    const prev = base({ memorizedAyahsBySurah: { 112: [1] } });
    const change = actions.recordGame(actions.setAyahsMemorized(prev, 112, [2], true).state, { game: "arrange", surah: 112, score: 1, total: 1 });
    const writes = diffWrites(prev, change.state, change.games);
    expect(writes[0]).toEqual({ op: "setAyahs", surah: 112, ayahs: [2], memorized: true });
    expect(writes.at(-1)).toEqual({ op: "addGames", games: change.games });
    expect(writes.some((write) => write.op === "addActivityDays")).toBe(true);
  });

  it("removes unmarked ayahs and writes nothing when nothing changed", () => {
    const prev = base({ memorizedAyahsBySurah: { 112: [1, 2] } });
    const next = actions.setAyahsMemorized(prev, 112, [2], false).state;
    expect(diffWrites(prev, next, [])).toContainEqual({ op: "setAyahs", surah: 112, ayahs: [2], memorized: false });
    expect(diffWrites(prev, prev, [])).toEqual([]);
  });

  it("unlocks the first-step badge on any activity", () => {
    expect(computeUnlockedBadgeIds(base())).toEqual([]);
    expect(computeUnlockedBadgeIds(base({ quizStats: { ...DEFAULT_KIDS_PROGRESS.quizStats, attempts: 1 } }))).toContain("first-step");
  });
});

describe("kids games", () => {
  it("keeps waqf marks on their word and never hands over a solved puzzle", () => {
    expect(splitAyahWords("قُلْ هُوَ ٱللَّهُ أَحَدٌ ۝")).toHaveLength(4);
    const tiles = buildWordTiles("قُلْ هُوَ ٱللَّهُ أَحَدٌ", () => 0.99);
    expect(wrongPositions(tiles).size).toBeGreaterThan(0);
    expect(starsForSlips(0, 5)).toBe(3);
    expect(starsForSlips(1, 5)).toBe(2);
    expect(starsForSlips(4, 5)).toBe(1);
  });
});
