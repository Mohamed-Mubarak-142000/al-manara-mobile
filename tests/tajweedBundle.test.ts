/// <reference types="jest" />
import { loadBundledTajweed } from "@/data/tajweed";
import { getSurah } from "@/features/mushaf/mushaf";

jest.mock("@/core/http", () => ({ cachedFetch: jest.fn() }));

describe("bundled tajweed", () => {
  it("has every surah, with the mushaf's ayah count and coloured text", () => {
    for (let surah = 1; surah <= 114; surah += 1) {
      const ayahs = loadBundledTajweed(surah);
      expect(ayahs).not.toBeNull();
      expect(ayahs!.length).toBe(getSurah(surah)!.ayahCount);
      ayahs!.forEach((ayah, index) => {
        expect(ayah.numberInSurah).toBe(index + 1);
        expect(
          ayah.segments
            .map((segment) => segment.text)
            .join("")
            .trim(),
        ).not.toBe("");
      });
    }
  });

  it("parses the markup into rule segments and drops the verse-end marker", () => {
    const fatiha = loadBundledTajweed(1)!;
    expect(fatiha[0]!.segments.some((segment) => segment.ruleClass === "ham_wasl")).toBe(true);
    expect(fatiha[0]!.segments.map((segment) => segment.text).join("")).not.toContain("١");
  });

  it("returns null outside 1..114", () => {
    expect(loadBundledTajweed(0)).toBeNull();
    expect(loadBundledTajweed(115)).toBeNull();
  });
});
