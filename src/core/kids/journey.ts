// Ported from eslam-platform/src/features/kids/progress/journey.ts — keep in sync by hand.
import { KIDS_SURAH_IDS } from "./kidsSurahs";
import type { KidsProgressState, MissionStep } from "./progressTypes";
import { getDueReviews, isSurahFullyMemorized } from "./reviewSchedule";
import { levelStatus } from "./levels";

export interface JourneyRegion {
  id: number;
  name: string;
  emoji: string;
  color: string;
  shadow: string;
  /** Soft background of the region's stretch of road. */
  tint: string;
  surahIds: number[];
}

export const JOURNEY_REGIONS: JourneyRegion[] = [
  {
    id: 1,
    name: "بستان البداية",
    emoji: "🌱",
    color: "#12a15b",
    shadow: "#0b7a44",
    tint: "#e3f6e8",
    surahIds: [1, 114, 113, 112, 111, 110, 109],
  },
  {
    id: 2,
    name: "وادي النخيل",
    emoji: "🌴",
    color: "#f5b92e",
    shadow: "#c98f10",
    tint: "#fff4d6",
    surahIds: [108, 107, 106, 105, 104, 103, 102, 101, 100],
  },
  {
    id: 3,
    name: "جبل النور",
    emoji: "⛰️",
    color: "#e8774a",
    shadow: "#b8552c",
    tint: "#fde9df",
    surahIds: [99, 98, 97, 96, 95, 94, 93, 92],
  },
  { id: 4, name: "بحر اللؤلؤ", emoji: "🌊", color: "#1f9be0", shadow: "#157ab3", tint: "#ddf1fc", surahIds: [91, 90, 89, 88, 87, 86, 85] },
  { id: 5, name: "سماء النجوم", emoji: "🌙", color: "#7a5af5", shadow: "#5a3ed1", tint: "#ebe5ff", surahIds: [84, 83, 82, 81, 80, 79, 78] },
];

export const JOURNEY_LENGTH = KIDS_SURAH_IDS.length;

/**
 * `done`: the surah's quiz is passed (that is what opens the next station, see `levels.ts`);
 * `review`: done, and its memorization review is due today.
 */
export type StationStatus = "locked" | "current" | "done" | "review";

export interface JourneyStation {
  surahId: number;
  index: number;
  region: JourneyRegion;
  status: StationStatus;
}

/** Mission steps besides memorizing and the quiz. */
export const MISSION_STEPS: MissionStep[] = ["listen", "play", "recite"];

export function regionOf(surahId: number): JourneyRegion {
  return JOURNEY_REGIONS.find((region) => region.surahIds.includes(surahId)) ?? JOURNEY_REGIONS[0]!;
}

export function isStationDone(state: KidsProgressState, surahId: number): boolean {
  return state.passedQuizSurahs.includes(surahId);
}

export function journeyStations(state: KidsProgressState, now: Date = new Date()): JourneyStation[] {
  const due = new Set(getDueReviews(state.reviewSchedule, now).map((entry) => entry.surahId));
  return KIDS_SURAH_IDS.map((surahId, index) => {
    const level = levelStatus(state, surahId);
    const status: StationStatus = level === "passed" ? (due.has(surahId) ? "review" : "done") : level === "open" ? "current" : "locked";
    return { surahId, index, region: regionOf(surahId), status };
  });
}

/** The station the child is working on: the first open one that isn't passed yet. */
export function currentStation(stations: JourneyStation[]): JourneyStation | null {
  return stations.find((station) => station.status === "current") ?? null;
}

export function countDoneStations(state: KidsProgressState): number {
  return KIDS_SURAH_IDS.filter((surahId) => isStationDone(state, surahId)).length;
}

export function isRegionComplete(state: KidsProgressState, region: JourneyRegion): boolean {
  return region.surahIds.every((surahId) => isStationDone(state, surahId));
}

export interface MissionProgress {
  listen: boolean;
  learn: boolean;
  play: boolean;
  recite: boolean;
  quiz: boolean;
}

export function missionProgress(state: KidsProgressState, surahId: number): MissionProgress {
  const steps = state.surahSteps[surahId] ?? [];
  return {
    listen: steps.includes("listen"),
    learn: isSurahFullyMemorized(state, surahId),
    play: steps.includes("play"),
    recite: steps.includes("recite"),
    quiz: isStationDone(state, surahId),
  };
}

/** Stars of one station, one per finished mission step (0–5). */
export function stationStars(state: KidsProgressState, surahId: number): number {
  return Object.values(missionProgress(state, surahId)).filter(Boolean).length;
}

export function journeyPercent(state: KidsProgressState): number {
  return Math.round((countDoneStations(state) / JOURNEY_LENGTH) * 100);
}
