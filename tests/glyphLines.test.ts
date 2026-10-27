/// <reference types="jest" />
import {
  buildGlyphLines,
  glyphFontUrl,
  glyphLinesOnPage,
  glyphVersesUrl,
  type GlyphLine,
  type GlyphRawVerse,
} from "@/core/quran/glyphLines";

/**
 * quran.com's V1 verses (mushaf=2) for a few pages and the page before each, recorded on 2026-10-28 with
 * only the fields the lines are built from. Every one of the 604 pages' first ayah was also checked then
 * against the app's mushaf-index.json page starts: all matched.
 */
import recorded from "./fixtures/glyphPages.json";

const pages = recorded as unknown as Record<string, GlyphRawVerse[]>;
const linesOf = (page: number) => buildGlyphLines(page, [...(pages[page - 1] ?? []), ...pages[page]!]);
/** A compact picture of a page: s<surah> for a title, b for a basmala, w for a line of words. */
const shape = (lines: GlyphLine[] | null) =>
  lines?.map((line) => (line.kind === "surah" ? `s${line.surah}` : line.kind === "basmala" ? "b" : "w"));

describe("printed mushaf lines", () => {
  it("sets al-Fatiha on 8 lines under its title, its basmala being its first ayah", () => {
    expect(glyphLinesOnPage(1)).toBe(8);
    expect(shape(linesOf(1))).toEqual(["s1", "w", "w", "w", "w", "w", "w", "w"]);
  });

  it("opens al-Baqara on page 2 with its title and basmala, on 8 lines", () => {
    expect(shape(linesOf(2))).toEqual(["s2", "b", "w", "w", "w", "w", "w", "w"]);
  });

  it("puts a surah's title at the foot of the page before it starts (page 76: al-Imran ends, al-Nisa's title)", () => {
    const kinds = shape(linesOf(76))!;
    expect(kinds).toHaveLength(15);
    expect(kinds.slice(0, 14).every((kind) => kind === "w")).toBe(true);
    // One free line: the title; al-Nisa's basmala opens page 77.
    expect(kinds[14]).toBe("s4");
  });

  it("fills a page with no surah break with words alone (page 145, in al-An'am)", () => {
    expect(shape(linesOf(145))).toEqual(Array.from({ length: 15 }, () => "w"));
  });

  it("gives at-Tawba its title and no basmala (page 187)", () => {
    expect(shape(linesOf(187))!.slice(0, 2)).toEqual(["s9", "w"]);
  });

  it("sets several short surahs on one page with a title and basmala before each (page 600)", () => {
    const kinds = shape(linesOf(600))!;
    expect(kinds).toHaveLength(15);
    const titles = kinds.filter((kind) => kind.startsWith("s"));
    expect(titles.length).toBeGreaterThanOrEqual(2);
    kinds.forEach((kind, index) => {
      if (kind.startsWith("s") && kind !== "s9") expect(kinds[index + 1]).toBe("b");
    });
  });

  it("keeps only this page's words, each tagged with its global ayah, once, ending with the ayah ornament", () => {
    const words = linesOf(76)!.flatMap((line) => (line.kind === "words" ? line.words : []));
    // 3:195 is global ayah 488; al-Imran ends at 3:200 = 493.
    expect(words[0]!.ayah).toBe(488);
    expect(words.at(-1)).toMatchObject({ ayah: 493, end: true });
    const total = pages[76]!.reduce((sum, verse) => sum + verse.words.filter((word) => word.page_number === 76).length, 0);
    expect(words).toHaveLength(total);
  });

  it("gives up rather than guess when the data doesn't add up", () => {
    expect(buildGlyphLines(76, [])).toBeNull();
    const shifted = pages[76]!.map((verse) => ({
      ...verse,
      words: verse.words.map((word) => ({ ...word, line_number: word.line_number + 5 })),
    }));
    expect(buildGlyphLines(76, shifted)).toBeNull();
  });

  it("asks quran.com for the V1 mushaf and the TTF font", () => {
    expect(glyphVersesUrl(76, 1)).toContain("mushaf=2");
    expect(glyphVersesUrl(76, 1)).toContain("word_fields=code_v1%2Cline_number%2Cpage_number");
    expect(glyphFontUrl(76)).toBe("https://static.qurancdn.com/fonts/quran/hafs/v1/ttf/p76.ttf");
  });
});
