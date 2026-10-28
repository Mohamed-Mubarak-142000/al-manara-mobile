/// <reference types="jest" />
import { buildGlyphLines, type GlyphRawVerse } from "@/core/quran/glyphLines";
import { getPageLines } from "@/features/mushaf/mushafLines";
import { MAX_ZOOM, MIN_ZOOM, PAGE_ZOOMS, pageZoom, stepAfterPinch, zoomStep } from "@/features/mushaf/pageZoom";
import { SURAH_WORD_GLYPH, bannerGeometry, starPoints, surahNameGlyph } from "@/features/mushaf/surahBanner";

import recorded from "./fixtures/glyphPages.json";

const pages = recorded as unknown as Record<string, GlyphRawVerse[]>;

describe("the printed page's lines", () => {
  /** s<n> title, b basmala, w<count> a line of words; the bundled text page's empty opening lines are left out. */
  const fixedShape = (page: number) =>
    getPageLines(page)
      .filter((line) => line.kind !== "empty")
      .map((line) => (line.kind === "surah" ? `s${line.surah}` : line.kind === "basmala" ? "b" : `w${line.words.length}`));
  const glyphShape = (page: number) =>
    buildGlyphLines(page, [...(pages[page - 1] ?? []), ...pages[page]!])!.map((line) =>
      line.kind === "surah" ? `s${line.surah}` : line.kind === "basmala" ? "b" : `w${line.words.length}`,
    );

  it.each([1, 2, 76, 145, 187, 600])("are the same on the text page and the glyph page (page %i)", (page) => {
    // Switching tajweed swaps one for the other: nothing may move.
    expect(fixedShape(page)).toEqual(glyphShape(page));
  });

  it("sets al-Nisa's title at the foot of page 76, as printed", () => {
    expect(getPageLines(76).at(-1)).toEqual({ kind: "surah", surah: 4 });
  });
});

describe("the printed page's size", () => {
  it("is the screen's at the default step, larger or smaller at the others", () => {
    expect(pageZoom(1)).toBe(1);
    expect(pageZoom(0)).toBeLessThan(1);
    expect(pageZoom(4)).toBe(MAX_ZOOM);
    expect(pageZoom(-3)).toBe(MIN_ZOOM);
    expect(pageZoom(99)).toBe(MAX_ZOOM);
    expect(pageZoom(Number.NaN)).toBe(1);
  });

  it("snaps a pinch to the nearest step, within the range", () => {
    expect(zoomStep(1.3)).toBe(2);
    expect(zoomStep(10)).toBe(PAGE_ZOOMS.length - 1);
    expect(zoomStep(0.1)).toBe(0);
    expect(stepAfterPinch(1, 1.5)).toBe(3);
    expect(stepAfterPinch(3, 0.5)).toBe(0);
    expect(stepAfterPinch(2, 1)).toBe(2);
  });
});

describe("the surah header", () => {
  it("uses quran.com's surah-name glyphs: «سورة», then the name by its number in hex digits", () => {
    expect(SURAH_WORD_GLYPH).toBe("");
    expect(surahNameGlyph(1)).toBe("");
    expect(surahNameGlyph(10)).toBe("");
    expect(surahNameGlyph(114)).toBe("");
    expect(surahNameGlyph(0)).toBe("");
  });

  it("fits its rosettes, cartouche and ornament inside one line, symmetrically", () => {
    const width = 360;
    const height = 44;
    const g = bannerGeometry(width, height);
    expect(g.rosette.end - g.rosette.radius).toBeGreaterThan(0);
    expect(g.rosette.start + g.rosette.radius).toBeLessThan(width);
    expect(g.rosette.start + g.rosette.end).toBeCloseTo(width);
    expect(g.cartouche.left).toBeGreaterThan(g.rosette.end + g.rosette.radius);
    expect(g.cartouche.right).toBeLessThan(g.rosette.start - g.rosette.radius);
    expect(g.cartouche.top).toBeGreaterThan(0);
    expect(g.cartouche.bottom).toBeLessThan(height);
    for (const x of g.ornaments) {
      const inLeft = x > g.rosette.end + g.rosette.radius && x < g.cartouche.left;
      const inRight = x > g.cartouche.right && x < g.rosette.start - g.rosette.radius;
      expect(inLeft || inRight).toBe(true);
    }
    expect(starPoints(10, 10, 5, 3).split(" ")).toHaveLength(16);
  });
});
