/// <reference types="jest" />
import { getAllAyahs, getSurahs } from "@/features/mushaf/mushaf";
import { isSearchIndexReady, prepareSearchIndex, searchQuran } from "@/features/mushaf/search";

jest.mock("expo-sqlite/kv-store", () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn() } }));

describe("surah-names.json", () => {
  it("matches the surahs of the full mushaf (run scripts/build-surah-names.mjs if not)", () => {
    const full = require("@/data/mushaf-hafs.json") as { surahs: [number, string, 0 | 1, number][] };
    const ayahs = getAllAyahs();
    const surahs = getSurahs();
    expect(surahs).toHaveLength(114);
    surahs.forEach((surah, i) => {
      const [number, name, meccan, ayahCount] = full.surahs[i]!;
      const first = ayahs.find((ayah) => ayah.surah === number && ayah.ayah === 1)!;
      expect(surah).toEqual({ number, name, meccan: meccan === 1, ayahCount, startPage: first.page, juzStart: first.juz });
      expect(ayahs.filter((ayah) => ayah.surah === number)).toHaveLength(ayahCount);
    });
  });
});

describe("quran search", () => {
  it("builds the index in slices and finds Uthmani spellings", async () => {
    expect(isSearchIndexReady()).toBe(false);
    await prepareSearchIndex();
    expect(isSearchIndexReady()).toBe(true);
    const { results, total } = searchQuran("الصلاة");
    expect(total).toBeGreaterThan(50);
    expect(results[0]).toMatchObject({ surah: 2, ayah: 3 });
    expect(searchQuran("قل هو الله احد").results[0]).toMatchObject({ surah: 112, ayah: 1 });
  });
});
