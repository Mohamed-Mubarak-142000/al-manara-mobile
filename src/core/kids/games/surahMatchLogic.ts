// Ported from eslam-platform/src/features/kids/games/surahMatchLogic.ts — keep in sync by hand.
import type { Surah } from "@/core/quran/api";
import { ayahPreview, shuffle, type Rng } from "./gameUtils";

export interface SurahMatchCard {
  id: string;
  type: "name" | "ayah";
  text: string;
  surahId: number;
}

export const SURAH_MATCH_PAIRS = 4;

/** Memory cards pairing each surah's name with its first ayah. `focus` is always among the pairs. */
export function buildSurahMatchCards(
  surahs: Surah[],
  firstAyahs: Record<number, string>,
  focus: number | null,
  rng: Rng = Math.random,
): SurahMatchCard[] {
  const withText = surahs.filter((surah) => firstAyahs[surah.id]);
  const focused = withText.find((surah) => surah.id === focus);
  const rest = shuffle(
    withText.filter((surah) => surah.id !== focus),
    rng,
  );
  const chosen = [...(focused ? [focused] : []), ...rest].slice(0, SURAH_MATCH_PAIRS);
  const cards = chosen.flatMap((surah): SurahMatchCard[] => [
    { id: `name-${surah.id}`, type: "name", text: `سورة ${surah.name}`, surahId: surah.id },
    { id: `ayah-${surah.id}`, type: "ayah", text: ayahPreview(firstAyahs[surah.id]!, 4), surahId: surah.id },
  ]);
  return shuffle(cards, rng);
}

export function isSurahPair(a: SurahMatchCard, b: SurahMatchCard): boolean {
  return a.id !== b.id && a.type !== b.type && a.surahId === b.surahId;
}
