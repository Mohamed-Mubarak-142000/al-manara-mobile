let texts: string[] | null = null;

/**
 * Tafsir al-Muyassar for a Hafs ayah, by its global number (1…6236), from the bundled
 * src/data/tafsir-muyassar.json (`npm run build:tafsir`). Offline from the first launch.
 */
export function tafsirFor(ayahId: number): string | undefined {
  // Required lazily: the 2.4 MB module is evaluated the first time a tafsir is opened.
  texts ??= (require("@/data/tafsir-muyassar.json") as { texts: string[] }).texts;
  return texts[ayahId - 1];
}
