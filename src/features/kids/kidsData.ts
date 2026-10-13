import { buildSurahAudioUrl, getKidsReciters, getReciters, type Reciter, type Surah } from "@/core/quran/api";
import { getSurahTajweedAyahs, type TajweedAyah } from "@/core/quran/tajweedApi";
import type { Ayah } from "@/core/quran/textApi";
import { KIDS_SURAH_IDS } from "@/core/kids/kidsSurahs";
import { loadBundledTafsir } from "@/data/tafsir";
import { loadBundledTajweed } from "@/data/tajweed";
import { ayahUrl } from "@/features/downloads/ayahPacks";
import { getBasmala, getSurah, getSurahAyahs, hasSeparateBasmala } from "@/features/mushaf/mushaf";

/**
 * The website's kidsData.ts, on the app's offline data: surah names, ayah text, tafsir and tajweed come from
 * the bundled mushaf (no network), only the "teaching with children" recitations from mp3quran.
 */

let kidsSurahs: Surah[] | null = null;

export function getKidsSurahs(): Surah[] {
  kidsSurahs ??= KIDS_SURAH_IDS.map((id) => {
    const info = getSurah(id);
    return { id, name: info?.name ?? String(id), meccan: info?.meccan ?? true };
  });
  return kidsSurahs;
}

export function isKidsSurah(id: number): boolean {
  return KIDS_SURAH_IDS.includes(id);
}

export function kidsSurah(id: number): Surah {
  return getKidsSurahs().find((surah) => surah.id === id) ?? { id, name: String(id), meccan: true };
}

/** A route's `surah` param, or null when it isn't one of the kids surahs (the website's notFound()). */
export function parseKidsSurah(value: string | string[] | undefined): number | null {
  const id = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(id) && isKidsSurah(id) ? id : null;
}

const ayahCache = new Map<number, Ayah[]>();

/** The surah's ayahs in the website's Ayah shape (global `number`, `numberInSurah`, text…). */
export function kidsAyahs(surah: number): Ayah[] {
  let ayahs = ayahCache.get(surah);
  if (!ayahs) {
    ayahs = getSurahAyahs(surah).map((ayah) => ({
      number: ayah.id,
      numberInSurah: ayah.ayah,
      text: ayah.text,
      page: ayah.page,
      juz: ayah.juz,
      hizbQuarter: ayah.hizbQuarter,
      sajda: ayah.sajda,
    }));
    ayahCache.set(surah, ayahs);
  }
  return ayahs;
}

export function kidsBasmala(surah: number): string | null {
  return hasSeparateBasmala(surah) ? getBasmala() : null;
}

/** Tafsir al-Muyassar of one ayah (the website's getSurahTafsir), from the bundle. */
export function kidsTafsir(surah: number, numberInSurah: number): string | undefined {
  return loadBundledTafsir(surah)?.[numberInSurah - 1];
}

/** The surah's tajweed markup (the website's getSurahTajweedAyahs): the bundle, or the network as a fallback. */
export async function kidsTajweedAyahs(surah: number): Promise<TajweedAyah[]> {
  try {
    const bundled = loadBundledTajweed(surah);
    if (bundled?.length) return bundled;
  } catch {
    // Fall back to the network below.
  }
  return getSurahTajweedAyahs(surah);
}

/** The first ayah of every kids surah, for games that pair a surah with how it begins. */
export function getKidsFirstAyahs(): Record<number, string> {
  return Object.fromEntries(
    getKidsSurahs().flatMap((surah) => {
      const first = kidsAyahs(surah.id)[0]?.text;
      return first ? [[surah.id, first] as const] : [];
    }),
  );
}

export interface TeachingTrack {
  src: string;
  reciterName: string;
}

/** Teaching reciters (mp3quran moshaf type 213), Minshawi first, like the website's listen page. */
export async function getTeachingReciters(): Promise<Reciter[]> {
  return getKidsReciters(await getReciters()).sort((a, b) => Number(b.name.includes("المنشاوي")) - Number(a.name.includes("المنشاوي")));
}

/** Whole-surah "teaching with children" recitation, preferring Minshawi. */
export async function getTeachingTrack(surahId: number): Promise<TeachingTrack | null> {
  for (const reciter of await getTeachingReciters()) {
    const moshaf = reciter.moshaf.find((entry) => entry.surahList.includes(surahId));
    if (moshaf) return { src: buildSurahAudioUrl(moshaf, surahId), reciterName: reciter.name };
  }
  return null;
}

/** Husary ayah audio, from a saved ayah pack when there is one (works offline). */
export function husaryAyah(surah: number, numberInSurah: number): string {
  return ayahUrl("husary", surah, numberInSurah);
}

export function muallimAyah(surah: number, numberInSurah: number): string {
  return ayahUrl("muallim", surah, numberInSurah);
}
