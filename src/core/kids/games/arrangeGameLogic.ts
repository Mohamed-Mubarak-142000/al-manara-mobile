// Ported from eslam-platform/src/features/kids/games/arrangeGameLogic.ts — keep in sync by hand.
import { splitAyahWords } from "@/core/quran/words";

// splitAyahWords was ported to core/quran/words.ts first (the tasmee uses it too); this file keeps exporting it.
export { splitAyahWords };

export interface WordTile {
  id: string;
  text: string;
  /** Correct position in the ayah. */
  order: number;
}

export function buildWordTiles(text: string, rng: () => number = Math.random): WordTile[] {
  const tiles = splitAyahWords(text).map((word, order) => ({ id: `w${order}`, text: word, order }));
  const shuffled = [...tiles];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  // Never hand the child an already-solved puzzle.
  if (shuffled.every((tile, index) => tile.order === index) && shuffled.length > 1) shuffled.reverse();
  return shuffled;
}

export function isPlayableAyah(text: string): boolean {
  const count = splitAyahWords(text).length;
  return count >= 3 && count <= 9;
}

export function wrongPositions(placed: WordTile[]): Set<string> {
  return new Set(placed.filter((tile, index) => tile.order !== index).map((tile) => tile.id));
}
