// Ported from eslam-platform/src/features/kids/games/listenPickLogic.ts — keep in sync by hand.
import type { Ayah } from "@/core/quran/textApi";
import { shuffle, type Rng } from "./gameUtils";

export interface ListenPickRound {
  target: Ayah;
  /** The target and two other ayahs of the same surah, shuffled. */
  choices: Ayah[];
}

export const LISTEN_PICK_ROUNDS = 5;

/** Up to five rounds; each plays one ayah and offers it among two others from the same surah. */
export function buildListenPickRounds(ayahs: Ayah[], rng: Rng = Math.random): ListenPickRound[] {
  if (ayahs.length < 3) return [];
  const targets = shuffle(ayahs, rng).slice(0, Math.min(LISTEN_PICK_ROUNDS, ayahs.length));
  return targets.map((target) => {
    const others = shuffle(
      ayahs.filter((ayah) => ayah.number !== target.number && ayah.text !== target.text),
      rng,
    ).slice(0, 2);
    return { target, choices: shuffle([target, ...others], rng) };
  });
}
