import { normalizeWord, skeleton } from "@/core/tasmee/recitation";

import { getSurahs, getSurahAyahs, type MushafAyah } from "./mushaf";

/**
 * Offline search over the bundled Hafs text. Uthmani spelling differs from everyday writing
 * (ٱلصَّلَوٰةَ ~ الصلاة, ٱلْكِتَٰبُ ~ الكتاب), so both sides are reduced to the same loose "skeleton"
 * the tasmee matcher uses: no marks, one alef form, then no alef or hamza at all.
 */

/** Waw or ya carrying a dagger alif is read (and written today) as an alif: ٱلصَّلَوٰةَ → الصلاة. */
const ALIF_SEAT = new RegExp(`[${String.fromCodePoint(0x648, 0x64a)}]${String.fromCodePoint(0x670)}`, "g");

function toKey(text: string): string {
  return text
    .replace(ALIF_SEAT, "ا")
    .split(/\s+/)
    .map((word) => skeleton(normalizeWord(word)))
    .filter(Boolean)
    .join(" ");
}

let index: { ayah: MushafAyah; key: string }[] | null = null;

function buildIndex() {
  if (index) return index;
  index = getSurahs().flatMap((surah) => getSurahAyahs(surah.number).map((ayah) => ({ ayah, key: ` ${toKey(ayah.text)} ` })));
  return index;
}

export const MAX_RESULTS = 200;

/** Ayahs containing the words typed, in mushaf order; whole words match before partial ones. */
export function searchQuran(query: string): { results: MushafAyah[]; total: number } {
  const key = toKey(query);
  if (key.replace(/ /g, "").length < 2) return { results: [], total: 0 };
  const whole: MushafAyah[] = [];
  const partial: MushafAyah[] = [];
  for (const entry of buildIndex()) {
    if (entry.key.includes(` ${key} `)) whole.push(entry.ayah);
    else if (entry.key.includes(key)) partial.push(entry.ayah);
  }
  const all = [...whole, ...partial];
  return { results: all.slice(0, MAX_RESULTS), total: all.length };
}
