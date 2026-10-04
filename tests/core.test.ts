/// <reference types="jest" />
import { amountLabel, nextPortion, pagesForDuration, sessionsLeft, toIndex, toRef, TOTAL_AYAHS } from "@/core/khatma/schedule";
import { daysLabel, shiftDay, totalUnits, unitsLabel, unitsToSegments } from "@/core/plan/schedule";
import { distanceToKaaba, qiblaBearing } from "@/core/prayer/qibla";
import { splitAyahWords } from "@/core/quran/words";
import { buildExpected, matchChunk } from "@/core/tasmee/recitation";
import { getHijriDate } from "@/core/calendar/hijriDate";
import { getPage, getSurah, mushafBoundaries } from "@/features/mushaf/mushaf";

jest.mock("expo-sqlite/kv-store", () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn() } }));

describe("bundled mushaf", () => {
  it("has the Madinah layout", () => {
    expect(getPage(1).map((ayah) => `${ayah.surah}:${ayah.ayah}`)).toEqual(["1:1", "1:2", "1:3", "1:4", "1:5", "1:6", "1:7"]);
    expect(getPage(604).map((ayah) => ayah.surah)).toEqual(expect.arrayContaining([112, 113, 114]));
    expect(getSurah(2)?.startPage).toBe(2);
    expect(getSurah(3)?.name).toBe("آل عمران");
  });
});

describe("khatma arithmetic", () => {
  const boundaries = mushafBoundaries();

  it("converts between ayah refs and positions", () => {
    expect(toIndex({ surah: 1, ayah: 1 })).toBe(0);
    expect(toIndex({ surah: 114, ayah: 6 })).toBe(TOTAL_AYAHS - 1);
    expect(toRef(7)).toEqual({ surah: 2, ayah: 1 });
  });

  it("gives one juz a day, juz 2 starting at al-Baqarah 142", () => {
    const portion = nextPortion({ unit: "juz", per_session: 1, position: 0, days: [0, 1, 2, 3, 4, 5, 6] }, boundaries);
    expect(portion?.from).toBe(0);
    expect(toRef(portion!.to)).toEqual({ surah: 2, ayah: 142 });
    expect(sessionsLeft({ unit: "juz", per_session: 1, position: 0, days: [0, 1, 2, 3, 4, 5, 6] }, boundaries)).toBe(30);
  });

  it("ends once the last ayah is read", () => {
    expect(nextPortion({ unit: "pages", per_session: 5, position: TOTAL_AYAHS, days: [0] }, boundaries)).toBeNull();
  });

  it("spreads 604 pages over the reading days of a duration", () => {
    expect(pagesForDuration("2026-01-01", "2026-01-30", [0, 1, 2, 3, 4, 5, 6])).toBe(21);
  });

  it("agrees Arabic number words", () => {
    expect(amountLabel("pages", 1)).toBe("صفحة");
    expect(amountLabel("pages", 2)).toBe("صفحتان");
    expect(amountLabel("pages", 3)).toBe("٣ صفحات");
    expect(amountLabel("pages", 15)).toBe("١٥ صفحة");
  });
});

describe("memorization plan", () => {
  it("splits half-page units into pages", () => {
    expect(totalUnits({ start_page: 582, end_page: 604 })).toBe(46);
    expect(unitsToSegments({ start_page: 582 }, { from: 1, to: 4 })).toEqual([
      { page: 582, half: "second" },
      { page: 583, half: "full" },
    ]);
    expect(unitsLabel(3)).toBe("صفحة ونصف");
  });

  it("names the reading days from Saturday", () => {
    expect(daysLabel([0, 1, 2, 3, 4, 5, 6])).toBe("كل يوم");
    expect(daysLabel([0, 1, 2, 3, 4, 6])).toBe("كل يوم عدا الجمعة");
    expect(shiftDay("2026-02-28", 1)).toBe("2026-03-01");
  });
});

describe("tasmee matching", () => {
  const fatiha = getPage(1).map((ayah) => splitAyahWords(ayah.text));
  const expected = buildExpected(fatiha.slice(1, 3));

  it("advances on a correct recitation in plain spelling", () => {
    const result = matchChunk(expected, "الحمد لله رب العالمين", 0);
    expect(result.mistake).toBeNull();
    expect(result.pos).toBe(fatiha[1]!.length);
  });

  it("stops on a wrong word", () => {
    const result = matchChunk(expected, "الحمد لله رب الناس", 0);
    expect(result.mistake?.kind).toBe("wrong");
  });
});

describe("qibla", () => {
  it("points south-east from Cairo", () => {
    const bearing = qiblaBearing(30.0444, 31.2357);
    expect(bearing).toBeGreaterThan(134);
    expect(bearing).toBeLessThan(138);
    expect(Math.round(distanceToKaaba(30.0444, 31.2357))).toBeGreaterThan(1200);
  });
});

describe("hijri date", () => {
  it("follows Umm al-Qura", () => {
    const date = getHijriDate(new Date(2025, 2, 1, 12));
    expect([date.day, date.month, date.year]).toEqual([1, 9, 1446]);
    expect(date.isRamadan).toBe(true);
  });
});
