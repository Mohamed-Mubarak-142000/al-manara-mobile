// Ported from eslam-platform/src/features/kids/games/ayahOrderLogic.ts — keep in sync by hand.
import type { Ayah } from "@/core/quran/textApi";
import { shuffle, type Rng } from "./gameUtils";

/** Short surahs are ordered whole; longer ones as a window of consecutive ayahs. */
export const AYAH_ORDER_WINDOW = 5;

export interface AyahOrderRound {
  /** The ayahs in Mushaf order. */
  ordered: Ayah[];
  /** The same ayahs as the child sees them at first. */
  shuffled: Ayah[];
}

export function buildAyahOrderRound(ayahs: Ayah[], rng: Rng = Math.random): AyahOrderRound | null {
  if (ayahs.length < 2) return null;
  const size = Math.min(ayahs.length, ayahs.length <= AYAH_ORDER_WINDOW + 1 ? ayahs.length : AYAH_ORDER_WINDOW);
  const start = Math.floor(rng() * (ayahs.length - size + 1));
  const ordered = ayahs.slice(start, start + size);
  let shuffled = shuffle(ordered, rng);
  // Never hand the child an already-solved puzzle.
  if (shuffled.every((ayah, index) => ayah.number === ordered[index]!.number)) shuffled = [...shuffled].reverse();
  return { ordered, shuffled };
}

/** The ayah that should be tapped next, given how many are already placed. */
export function expectedNext(round: AyahOrderRound, placedCount: number): Ayah | null {
  return round.ordered[placedCount] ?? null;
}
