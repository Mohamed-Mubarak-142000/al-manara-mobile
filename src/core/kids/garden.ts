// Ported from eslam-platform/src/features/kids/garden/garden.ts — keep in sync by hand.
import { JOURNEY_LENGTH } from "./journey";

export interface GardenStage {
  id: string;
  /** Finished journey stations needed. */
  stations: number;
  name: string;
  emoji: string;
}

// Each finished station (quiz passed) grows the garden; the mosque crowns the whole journey.
export const GARDEN_STAGES: GardenStage[] = [
  { id: "sprout", stations: 1, name: "برعم صغير", emoji: "🌱" },
  { id: "tree", stations: 3, name: "شجرة الزيتون", emoji: "🌳" },
  { id: "flowers", stations: 5, name: "حقل الزهور", emoji: "🌷" },
  { id: "fountain", stations: 8, name: "النافورة", emoji: "⛲" },
  { id: "birds", stations: 12, name: "العصافير", emoji: "🐦" },
  { id: "library", stations: 17, name: "المكتبة", emoji: "📚" },
  { id: "bridge", stations: 24, name: "الجسر والنهر", emoji: "🌉" },
  { id: "house", stations: 31, name: "البيت الجميل", emoji: "🏡" },
  { id: "mosque", stations: JOURNEY_LENGTH, name: "المسجد", emoji: "🕌" },
];

export function nextGardenStage(doneStations: number): GardenStage | null {
  return GARDEN_STAGES.find((stage) => stage.stations > doneStations) ?? null;
}

/** Where each bought decoration sits in the garden scene (SVG coordinates, 400 × 260). */
export const GARDEN_DECOR_SLOTS: Record<string, { x: number; y: number; size: number }> = {
  rainbow: { x: 200, y: 92, size: 90 },
  kite: { x: 52, y: 52, size: 34 },
  balloons: { x: 352, y: 66, size: 36 },
  lights: { x: 200, y: 30, size: 30 },
  butterflies: { x: 150, y: 150, size: 26 },
  lantern: { x: 262, y: 186, size: 28 },
  bench: { x: 130, y: 232, size: 30 },
  ducks: { x: 330, y: 246, size: 28 },
};
