import { normalizeWord, skeleton } from "@/core/tasmee/recitation";

import { getAllAyahs, type MushafAyah } from "./mushaf";

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

type Entry = { ayah: MushafAyah; key: string };

let index: Entry[] | null = null;
let building: Promise<void> | null = null;

const toEntry = (ayah: MushafAyah): Entry => ({ ayah, key: ` ${toKey(ayah.text)} ` });

/** One pass over the ayahs, already in mushaf order. */
function buildIndex(): Entry[] {
  if (!index) index = getAllAyahs().map(toEntry);
  return index;
}

const CHUNK = 400;

/**
 * Builds the index in slices, yielding to the JS thread between them, so the search screen stays
 * responsive while ~6,000 ayahs are normalised. Safe to call more than once.
 */
export function prepareSearchIndex(): Promise<void> {
  if (index) return Promise.resolve();
  building ??= new Promise<void>((resolve) => {
    const ayahs = getAllAyahs();
    const entries: Entry[] = [];
    const step = (from: number) => {
      if (index) return resolve();
      for (let i = from; i < Math.min(from + CHUNK, ayahs.length); i++) entries.push(toEntry(ayahs[i]!));
      if (entries.length < ayahs.length) {
        setTimeout(() => step(from + CHUNK), 0);
        return;
      }
      index = entries;
      resolve();
    };
    step(0);
  });
  return building;
}

export function isSearchIndexReady(): boolean {
  return index !== null;
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
