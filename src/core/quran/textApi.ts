// Ported from eslam-platform/src/features/quran/textApi.ts — keep in sync by hand; Next-only caching swapped for cachedFetch.
import { cachedFetch } from "@/core/http";
export interface Ayah {
  number: number;
  numberInSurah: number;
  text: string;
  page: number;
  juz: number;
  /** Null for a riwaya's own mushaf, which carries no hizb data. */
  hizbQuarter: number | null;
  sajda: boolean;
}

export interface TafsirAyah {
  numberInSurah: number;
  text: string;
}

interface RawAyah {
  number: number;
  numberInSurah: number;
  text: string;
  page: number;
  juz: number;
  hizbQuarter: number;
  sajda: boolean | { id: number };
}

const BASE_URL = "https://api.alquran.cloud/v1";
const TAFSIR_EDITION = "ar.muyassar";
const REVALIDATE = 60 * 60 * 24 * 30;
// Built from verified codepoints (not typed by hand) because Arabic combining marks
// (shadda U+0651 before fatha U+064E) are easy to silently transpose when copy-pasted.
export const BASMALA = String.fromCodePoint(
  0x628,
  0x650,
  0x633,
  0x652,
  0x645,
  0x650,
  0x20,
  0x671,
  0x644,
  0x644,
  0x651,
  0x64e,
  0x647,
  0x650,
  0x20,
  0x671,
  0x644,
  0x631,
  0x651,
  0x64e,
  0x62d,
  0x652,
  0x645,
  0x64e,
  0x670,
  0x646,
  0x650,
  0x20,
  0x671,
  0x644,
  0x631,
  0x651,
  0x64e,
  0x62d,
  0x650,
  0x64a,
  0x645,
  0x650,
);
const SURAHS_WITHOUT_SEPARATE_BASMALA = new Set([1, 9]);

function stripLeadingBom(text: string): string {
  return text.replace(/^﻿/, "");
}

export async function getSurahAyahs(surahNumber: number): Promise<{ basmala: string | null; ayahs: Ayah[] }> {
  try {
    const response = await cachedFetch(`${BASE_URL}/surah/${surahNumber}/quran-uthmani`, REVALIDATE);
    if (!response.ok) return { basmala: null, ayahs: [] };
    const data = (await response.json()) as { data: { ayahs: RawAyah[] } };
    const ayahs: Ayah[] = data.data.ayahs.map((ayah) => ({
      number: ayah.number,
      numberInSurah: ayah.numberInSurah,
      text: stripLeadingBom(ayah.text),
      page: ayah.page,
      juz: ayah.juz,
      hizbQuarter: ayah.hizbQuarter,
      sajda: ayah.sajda !== false,
    }));

    if (!SURAHS_WITHOUT_SEPARATE_BASMALA.has(surahNumber) && ayahs[0]?.text.startsWith(BASMALA)) {
      const [first, ...rest] = ayahs;
      return { basmala: BASMALA, ayahs: [{ ...first!, text: first!.text.slice(BASMALA.length).trim() }, ...rest] };
    }
    return { basmala: null, ayahs };
  } catch {
    return { basmala: null, ayahs: [] };
  }
}

export async function getSurahTafsir(surahNumber: number): Promise<TafsirAyah[]> {
  try {
    const response = await cachedFetch(`${BASE_URL}/surah/${surahNumber}/${TAFSIR_EDITION}`, REVALIDATE);
    if (!response.ok) return [];
    const data = (await response.json()) as { data: { ayahs: { numberInSurah: number; text: string }[] } };
    return data.data.ayahs.map((ayah) => ({ numberInSurah: ayah.numberInSurah, text: stripLeadingBom(ayah.text) }));
  } catch {
    return [];
  }
}

export interface SurahMeta {
  number: number;
  ayahCount: number;
  meccan: boolean;
  juzStart: number;
}

/** Ayah counts, revelation type, and the juz each surah starts in — one cached request. */
export async function getQuranMeta(): Promise<SurahMeta[]> {
  try {
    const response = await cachedFetch(`${BASE_URL}/meta`, REVALIDATE);
    if (!response.ok) return [];
    const data = (await response.json()) as {
      data: {
        surahs: { references: { number: number; numberOfAyahs: number; revelationType: string }[] };
        juzs: { references: { surah: number; ayah: number }[] };
      };
    };
    const juzStarts = data.data.juzs.references;
    return data.data.surahs.references.map((surah) => {
      let juzStart = 1;
      juzStarts.forEach((start, index) => {
        if (start.surah < surah.number || (start.surah === surah.number && start.ayah === 1)) juzStart = index + 1;
      });
      return { number: surah.number, ayahCount: surah.numberOfAyahs, meccan: surah.revelationType === "Meccan", juzStart };
    });
  } catch {
    return [];
  }
}

export interface JuzAyah {
  number: number;
  surah: number;
  numberInSurah: number;
  text: string;
}

/** Every ayah of one juz in Uthmani script; the basmala prefix of first ayahs is removed. */
export async function getJuzAyahs(juz: number): Promise<JuzAyah[]> {
  try {
    const response = await cachedFetch(`${BASE_URL}/juz/${juz}/quran-uthmani`, REVALIDATE);
    if (!response.ok) return [];
    const data = (await response.json()) as { data: { ayahs: (RawAyah & { surah: { number: number } })[] } };
    return data.data.ayahs.map((ayah) => {
      let text = stripLeadingBom(ayah.text);
      if (ayah.numberInSurah === 1 && !SURAHS_WITHOUT_SEPARATE_BASMALA.has(ayah.surah.number) && text.startsWith(BASMALA))
        text = text.slice(BASMALA.length).trim();
      return { number: ayah.number, surah: ayah.surah.number, numberInSurah: ayah.numberInSurah, text };
    });
  } catch {
    return [];
  }
}

export interface AyahRef {
  surah: number;
  ayah: number;
}

/** First ayah of each of the 30 juz (index 0 = juz 1), from the API — never hand-typed. */
export async function getJuzStarts(): Promise<AyahRef[]> {
  try {
    const response = await cachedFetch(`${BASE_URL}/meta`, REVALIDATE);
    if (!response.ok) return [];
    const data = (await response.json()) as { data: { juzs: { references: AyahRef[] } } };
    const starts = data.data.juzs.references.map(({ surah, ayah }) => ({ surah, ayah }));
    return starts.length === 30 ? starts : [];
  } catch {
    return [];
  }
}

/** First ayah of each of the 604 Madani mushaf pages (index 0 = page 1), from the same cached /meta. */
export async function getMushafPageStarts(): Promise<AyahRef[]> {
  try {
    const response = await cachedFetch(`${BASE_URL}/meta`, REVALIDATE);
    if (!response.ok) return [];
    const data = (await response.json()) as { data: { pages: { references: AyahRef[] } } };
    const starts = data.data.pages.references.map(({ surah, ayah }) => ({ surah, ayah }));
    return starts.length === 604 ? starts : [];
  } catch {
    return [];
  }
}

/** First ayah of each of the 60 hizb (every fourth of the 240 hizb quarters), from /meta. */
export async function getHizbStarts(): Promise<AyahRef[]> {
  try {
    const response = await cachedFetch(`${BASE_URL}/meta`, REVALIDATE);
    if (!response.ok) return [];
    const data = (await response.json()) as { data: { hizbQuarters: { references: AyahRef[] } } };
    const quarters = data.data.hizbQuarters.references;
    if (quarters.length !== 240) return [];
    return quarters.filter((_, index) => index % 4 === 0).map(({ surah, ayah }) => ({ surah, ayah }));
  } catch {
    return [];
  }
}

export interface PageAyah {
  surah: number;
  numberInSurah: number;
  juz: number;
  text: string;
}

/** The ayahs printed on one mushaf page; the basmala prefix of first ayahs is removed. */
export async function getPageAyahs(page: number): Promise<PageAyah[]> {
  try {
    const response = await cachedFetch(`${BASE_URL}/page/${page}/quran-uthmani`, REVALIDATE);
    if (!response.ok) return [];
    const data = (await response.json()) as { data: { ayahs: (RawAyah & { surah: { number: number } })[] } };
    return data.data.ayahs.map((ayah) => {
      let text = stripLeadingBom(ayah.text);
      if (ayah.numberInSurah === 1 && !SURAHS_WITHOUT_SEPARATE_BASMALA.has(ayah.surah.number) && text.startsWith(BASMALA))
        text = text.slice(BASMALA.length).trim();
      return { surah: ayah.surah.number, numberInSurah: ayah.numberInSurah, juz: ayah.juz, text };
    });
  } catch {
    return [];
  }
}

export interface MushafPage {
  page: number;
  juz: number;
  hizbQuarter: number | null;
  ayahs: Ayah[];
}

/** Groups a surah's ayahs by their Madani mushaf page number. */
export function groupByMushafPage(ayahs: Ayah[]): MushafPage[] {
  const pages: MushafPage[] = [];
  for (const ayah of ayahs) {
    const last = pages[pages.length - 1];
    if (last && last.page === ayah.page) last.ayahs.push(ayah);
    else pages.push({ page: ayah.page, juz: ayah.juz, hizbQuarter: ayah.hizbQuarter, ayahs: [ayah] });
  }
  return pages;
}
