/// <reference types="jest" />
import { QURAN_DUAS, SUNNAH_DUAS } from "@/core/khatmDua/khatmDuaData";
import { getSurahAyahCount } from "@/core/quran/surahAyahCounts";

describe("khatm dua content", () => {
  it("cites a real ayah for every Quranic dua", () => {
    expect(QURAN_DUAS.length).toBeGreaterThan(5);
    for (const dua of QURAN_DUAS) {
      const [surah, ayah] = dua.key.split(":").map(Number);
      expect(ayah).toBe(dua.ayah);
      expect(dua.ayah).toBeGreaterThanOrEqual(1);
      expect(dua.ayah).toBeLessThanOrEqual(getSurahAyahCount(surah!));
      expect(dua.surahName).toMatch(/^سورة /);
      expect(dua.text.trim()).not.toBe("");
    }
  });

  it("gives each prophetic dua its grade, attribution and HadeethEnc link", () => {
    expect(new Set(SUNNAH_DUAS.map((dua) => dua.id)).size).toBe(SUNNAH_DUAS.length);
    for (const dua of SUNNAH_DUAS) {
      expect(dua.dua.trim()).not.toBe("");
      expect(dua.grade).not.toBe("");
      expect(dua.attribution).not.toBe("");
      expect(dua.url).toMatch(/^https:\/\/hadeethenc\.com\//);
    }
  });
});
