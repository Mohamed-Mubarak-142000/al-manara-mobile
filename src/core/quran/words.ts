// Ported from eslam-platform/src/features/kids/games/arrangeGameLogic.ts (splitAyahWords) — keep in sync by hand.
const ARABIC_LETTER = /[ء-يٱ-ۓ]/;

/**
 * Splits an ayah into word tiles. Tokens with no letters (waqf/pause marks such as ۚ ۖ ۗ)
 * stay attached to the preceding word so the displayed Quran text is never altered.
 */
export function splitAyahWords(text: string): string[] {
  const words: string[] = [];
  for (const token of text.split(/\s+/).filter(Boolean)) {
    if (!ARABIC_LETTER.test(token) && words.length > 0) words[words.length - 1] = `${words[words.length - 1]} ${token}`;
    else words.push(token);
  }
  return words;
}
