/// <reference types="jest" />
import { ayahIdFromTrackId, hafsPages, hizbStartPages, juzStartPage, pageOfAyahId, parsePageInput, surahStartPage } from "@/features/mushaf/jump";
import { getPage, getSurah, juzStartPages } from "@/features/mushaf/mushaf";

describe("mushaf jump helpers", () => {
  it("parses page numbers in Arabic, Persian and Latin digits", () => {
    expect(parsePageInput("١٢٣")).toBe(123);
    expect(parsePageInput("۶۰۴")).toBe(604);
    expect(parsePageInput(" 1 ")).toBe(1);
    expect(parsePageInput("0")).toBeNull();
    expect(parsePageInput("605")).toBeNull();
    expect(parsePageInput("")).toBeNull();
    expect(parsePageInput("12a")).toBeNull();
    expect(parsePageInput("-3")).toBeNull();
  });

  it("finds surah and juz starts like the bundled index", () => {
    expect(surahStartPage(hafsPages, 1)).toBe(1);
    expect(surahStartPage(hafsPages, 2)).toBe(2);
    expect(surahStartPage(hafsPages, 18)).toBe(getSurah(18)!.startPage);
    expect(surahStartPage(hafsPages, 114)).toBe(604);
    const juz = juzStartPages();
    for (const { juz: number, page } of juz) expect(juzStartPage(hafsPages, number)).toBe(page);
  });

  it("derives the 60 ahzab, two per juz", () => {
    const hizb = hizbStartPages();
    expect(hizb).toHaveLength(60);
    expect(hizb[0]).toBe(1);
    // Hizb 2 begins at al-Baqarah 75 (page 11); every odd hizb opens a juz.
    expect(hizb[1]).toBe(11);
    const juz = juzStartPages();
    for (let index = 0; index < 30; index += 1) expect(hizb[index * 2]).toBe(juz[index]!.page);
    for (let index = 1; index < 60; index += 1) expect(hizb[index]!).toBeGreaterThanOrEqual(hizb[index - 1]!);
  });

  it("maps global ayah ids to their page", () => {
    expect(pageOfAyahId(1)).toBe(1);
    expect(pageOfAyahId(8)).toBe(2);
    expect(pageOfAyahId(6236)).toBe(604);
    const sample = getPage(300)[3]!;
    expect(pageOfAyahId(sample.id)).toBe(300);
    expect(pageOfAyahId(0)).toBeNull();
    expect(pageOfAyahId(7000)).toBeNull();
  });

  it("reads the ayah from ayah and repeat track ids only", () => {
    expect(ayahIdFromTrackId("ayah-husary-255")).toBe(255);
    expect(ayahIdFromTrackId("repeat-muallim-42-2-3")).toBe(42);
    expect(ayahIdFromTrackId("radio-1")).toBeNull();
    expect(ayahIdFromTrackId("ayah-husary-9999")).toBeNull();
    expect(ayahIdFromTrackId(undefined)).toBeNull();
  });
});
