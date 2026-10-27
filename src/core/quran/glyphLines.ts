// Ported from eslam-platform/src/features/quran/glyphApi.ts (getGlyphLines, V1 only) — keep in sync by hand.
// The line building is pure here, so it is tested on recorded pages; features/mushaf/glyphStore.ts fetches
// the verses and keeps the built lines on the device.

/*
 * The printed Madinah page, line by line, from quran.com: each word as a glyph code of the King Fahd
 * Complex's per-page font (QCF V1, the 1405 print, whose page breaks match the app's bundled mushaf),
 * with the line it sits on.
 */

const BASE_URL = "https://api.quran.com/api/v4";
/** quran.com's id for the V1 (1405) Madinah mushaf, which picks the page and line numbers the words report. */
const MUSHAF_V1 = 2;

/** The page's font file. quran.com serves TTFs beside the website's WOFF2s; native text needs the TTF. */
export function glyphFontUrl(page: number): string {
  return `https://static.qurancdn.com/fonts/quran/hafs/v1/ttf/p${page}.ttf`;
}

/** One part (50 verses) of a page's verses with the fields the lines are built from. */
export function glyphVersesUrl(page: number, part: number): string {
  const params = new URLSearchParams({
    words: "true",
    word_fields: "code_v1,line_number,page_number",
    per_page: "50",
    page: String(part),
    mushaf: String(MUSHAF_V1),
  });
  return `${BASE_URL}/verses/by_page/${page}?${params}`;
}

export interface GlyphRawWord {
  char_type_name: string;
  line_number: number;
  page_number: number;
  code_v1?: string;
}

export interface GlyphRawVerse {
  /** quran.com's verse id: the global ayah number, 1…6236. */
  id: number;
  verse_key: string;
  words: GlyphRawWord[];
}

/** A word as a glyph of the page's own font; `ayah` is the global ayah number (1…6236). */
export interface GlyphWord {
  code: string;
  ayah: number;
  /** The ayah-end ornament with its number. */
  end: boolean;
}

/** One of the page's printed lines. */
export type GlyphLine = { kind: "words"; words: GlyphWord[] } | { kind: "surah"; surah: number } | { kind: "basmala" };

/** Pages 1 and 2 (al-Fatiha and the opening of al-Baqara) are printed on 8 lines, the rest on 15. */
export function glyphLinesOnPage(page: number): number {
  return page <= 2 ? 8 : 15;
}

/**
 * The page's lines, from the verses of the page before and of the page itself: a verse that starts
 * overleaf can run onto this page, so only the words printed here are kept. Lines with no words hold a
 * surah's title and basmala: before its first ayah, or at the foot of the page when the surah starts
 * overleaf. Null when the data doesn't add up (the reader then keeps its own text page).
 */
export function buildGlyphLines(page: number, verses: readonly GlyphRawVerse[]): GlyphLine[] | null {
  const total = glyphLinesOnPage(page);
  const byLine = new Map<number, { surah: number; ayah: number; code: string; id: number; end: boolean }[]>();
  const seen = new Set<string>();
  for (const verse of verses) {
    // The previous page's verses and this page's overlap on the verse that spans them.
    if (seen.has(verse.verse_key)) continue;
    seen.add(verse.verse_key);
    const [surah, ayah] = verse.verse_key.split(":").map(Number) as [number, number];
    for (const word of verse.words) {
      const code = word.code_v1;
      if (word.page_number !== page || !code) continue;
      const line = byLine.get(word.line_number) ?? [];
      line.push({ surah, ayah, code, id: verse.id, end: word.char_type_name === "end" });
      byLine.set(word.line_number, line);
    }
  }
  if (byLine.size === 0 || Math.max(...byLine.keys()) > total) return null;

  const lines: GlyphLine[] = [];
  for (let number = 1; number <= total; number += 1) {
    const words = byLine.get(number);
    if (words) {
      lines.push({ kind: "words", words: words.map(({ code, id, end }) => ({ code, ayah: id, end })) });
      continue;
    }
    // A run of empty lines: the surah it introduces, and whether it ends the page.
    let last = number;
    while (last + 1 <= total && !byLine.has(last + 1)) last += 1;
    const next = byLine.get(last + 1)?.[0];
    const lastWord = byLine.get(Math.max(...byLine.keys()))!.at(-1)!;
    const surah = next ? next.surah : lastWord.surah + 1;
    // Al-Fatiha's basmala is its first ayah, and at-Tawba has none.
    const opening: GlyphLine[] = surah === 1 || surah === 9 ? [{ kind: "surah", surah }] : [{ kind: "surah", surah }, { kind: "basmala" }];
    const count = last - number + 1;
    const fill = next ? opening.slice(-count) : opening.slice(0, count);
    if (fill.length !== count || (next && next.ayah !== 1) || surah > 114) return null;
    lines.push(...fill);
    number = last;
  }
  return lines;
}
