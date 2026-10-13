// Ported from eslam-platform/src/features/kids/games/letterGameLogic.ts — keep in sync by hand.
import type { ArabicLetter } from "./arabicLetters";

export type LetterMatchTileType = "letter" | "name";

export interface LetterMatchTile {
  id: string;
  type: LetterMatchTileType;
  value: string;
  letterKey: string;
}

export interface LetterMatchRound {
  tiles: LetterMatchTile[];
  pairCount: number;
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

export function buildLetterMatchRound(
  letters: readonly ArabicLetter[],
  pairCount: number,
  rng: () => number = Math.random,
): LetterMatchRound {
  const chosen = shuffle(letters, rng).slice(0, Math.min(pairCount, letters.length));
  const tiles: LetterMatchTile[] = [];
  chosen.forEach((entry, index) => {
    tiles.push({ id: `letter-${index}`, type: "letter", value: entry.letter, letterKey: entry.letter });
    tiles.push({ id: `name-${index}`, type: "name", value: entry.name, letterKey: entry.letter });
  });
  return { tiles: shuffle(tiles, rng), pairCount: chosen.length };
}

export function isMatchingPair(a: LetterMatchTile, b: LetterMatchTile): boolean {
  return a.id !== b.id && a.type !== b.type && a.letterKey === b.letterKey;
}
