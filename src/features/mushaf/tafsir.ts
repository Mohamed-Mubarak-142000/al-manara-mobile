import { loadBundledTafsir } from "@/data/tafsir";

import { getSurahs } from "./mushaf";

let surahOffsets: number[] | null = null;

/** The global id (1…6236) of each surah's first ayah, from the small surah index. */
function offsets(): number[] {
  if (surahOffsets) return surahOffsets;
  let next = 1;
  surahOffsets = getSurahs().map((surah) => {
    const first = next;
    next += surah.ayahCount;
    return first;
  });
  return surahOffsets;
}

/**
 * Tafsir al-Muyassar for a Hafs ayah, by its global number (1…6236), from the bundled per-surah files in
 * src/data/tafsir (`npm run build:tafsir`). Offline from the first launch; only the surahs opened are
 * ever loaded, not the whole 2.4 MB.
 */
export function tafsirFor(ayahId: number): string | undefined {
  const starts = offsets();
  let surah = starts.length;
  while (surah > 1 && starts[surah - 1]! > ayahId) surah -= 1;
  return loadBundledTafsir(surah)?.[ayahId - starts[surah - 1]!];
}
