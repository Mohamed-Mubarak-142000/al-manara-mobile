// Ported from eslam-platform/src/features/kids/games/gameUtils.ts — keep in sync by hand.
import { splitAyahWords } from "./arrangeGameLogic";

export type Rng = () => number;

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/** The first words of an ayah, for a choice or a card that must stay short. */
export function ayahPreview(text: string, maxWords = 7): string {
  const words = splitAyahWords(text);
  return words.length <= maxWords ? text : `${words.slice(0, maxWords).join(" ")} …`;
}

/** 3 stars for no slips, 2 for a couple, 1 otherwise — finishing always earns a star. */
export function starsForSlips(slips: number, rounds: number): number {
  if (slips === 0) return 3;
  return slips <= Math.max(1, Math.floor(rounds / 3)) ? 2 : 1;
}
