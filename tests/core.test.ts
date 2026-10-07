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

describe("quran search", () => {
  const { searchQuran } = jest.requireActual<typeof import("@/features/mushaf/search")>("@/features/mushaf/search");

  it("finds Uthmani text from everyday spelling", () => {
    const { results } = searchQuran("الصلاة");
    expect(results.length).toBeGreaterThan(50);
    expect(results.some((ayah) => ayah.surah === 2 && ayah.ayah === 3)).toBe(true);
  });

  it("finds ayat al-kursi by its opening", () => {
    const { results } = searchQuran("الله لا اله الا هو الحي القيوم");
    expect(results.map((ayah) => `${ayah.surah}:${ayah.ayah}`)).toContain("2:255");
  });

  it("ignores queries that are too short", () => {
    expect(searchQuran("ا").total).toBe(0);
  });
});

describe("bundled tafsir", () => {
  it("has al-Muyassar for every ayah", () => {
    const { tafsirFor } = jest.requireActual<typeof import("@/features/mushaf/tafsir")>("@/features/mushaf/tafsir");
    expect(tafsirFor(1)?.length).toBeGreaterThan(10);
    expect(tafsirFor(262)?.length).toBeGreaterThan(50); // Ayat al-Kursi (2:255)
    expect(tafsirFor(6236)?.length).toBeGreaterThan(10);
  });

  it("finds the right surah file at surah boundaries", () => {
    const { tafsirFor } = jest.requireActual<typeof import("@/features/mushaf/tafsir")>("@/features/mushaf/tafsir");
    const { loadBundledTafsir } = jest.requireActual<typeof import("@/data/tafsir")>("@/data/tafsir");
    expect(tafsirFor(7)).toBe(loadBundledTafsir(1)?.[6]); // al-Fatiha's last
    expect(tafsirFor(8)).toBe(loadBundledTafsir(2)?.[0]); // al-Baqara's first
    expect(tafsirFor(6236)).toBe(loadBundledTafsir(114)?.[5]);
    expect(tafsirFor(6237)).toBeUndefined();
  });
});

describe("mushaf index", () => {
  const mushaf = jest.requireActual<typeof import("@/features/mushaf/mushaf")>("@/features/mushaf/mushaf");

  it("matches the divisions of the full text", () => {
    const pageStarts: string[] = [];
    const juzStarts: string[] = [];
    const hizbStarts: string[] = [];
    const juzPages: number[] = [];
    const hizbPages: number[] = [];
    for (const ayah of mushaf.getAllAyahs()) {
      const ref = `${ayah.surah}:${ayah.ayah}`;
      const hizb = Math.ceil(ayah.hizbQuarter / 4);
      pageStarts[ayah.page - 1] ??= ref;
      if (!juzStarts[ayah.juz - 1]) {
        juzStarts[ayah.juz - 1] = ref;
        juzPages[ayah.juz - 1] = ayah.page;
      }
      if (!hizbStarts[hizb - 1]) {
        hizbStarts[hizb - 1] = ref;
        hizbPages[hizb - 1] = ayah.page;
      }
    }
    const refs = (list: { surah: number; ayah: number }[]) => list.map((ref) => `${ref.surah}:${ref.ayah}`);
    const starts = mushaf.mushafStarts();
    expect(refs(starts.pageStarts)).toEqual(pageStarts);
    expect(refs(starts.juzStarts)).toEqual(juzStarts);
    expect(refs(starts.hizbStarts)).toEqual(hizbStarts);
    expect(mushaf.juzStartPages().map((entry) => entry.page)).toEqual(juzPages);
    expect(mushaf.hizbStartPages()).toEqual(hizbPages);
  });

  it("looks up a surah's ayahs and an ayah's page directly", () => {
    const all = mushaf.getAllAyahs();
    for (const surah of [1, 2, 9, 114]) {
      expect(mushaf.getSurahAyahs(surah)).toEqual(all.filter((ayah) => ayah.surah === surah));
    }
    expect(mushaf.pageOf(2, 255)).toBe(all.find((ayah) => ayah.surah === 2 && ayah.ayah === 255)?.page);
    expect(mushaf.pageOf(114, 6)).toBe(604);
    expect(mushaf.pageOf(1, 99)).toBe(1);
    expect(mushaf.getSurahAyahs(115)).toEqual([]);
  });
});

describe("website links", () => {
  const { websitePathToAppRoute } = jest.requireActual<typeof import("@/features/links/websiteLinks")>("@/features/links/websiteLinks");
  const route = (url: string) => {
    const parsed = new URL(url, "https://eslami-platform.vercel.app");
    return websitePathToAppRoute(parsed.pathname, parsed.searchParams);
  };

  it("maps the website's pages to the app's screens", () => {
    expect(route("/quran/2?page=5")).toBe("/mushaf?page=5");
    expect(route("/quran/18")).toBe("/mushaf?page=293");
    expect(route("/prayer-times")).toBe("/prayer");
    expect(route("/dashboard")).toBe("/journey");
    expect(route("/certificates/ABCDE-12345")).toBe("/certificate/ABCDE-12345");
    expect(route("/certificates/mine")).toBe("/certificates");
    expect(route("/hadith/category/5")).toBe("/hadith/category/5");
    expect(route("/tawasheeh")).toBe("/sounds/tawasheeh");
    expect(route("/listen/123")).toBe("/listen/123");
    expect(route("/admin")).toBe("/");
  });
});
