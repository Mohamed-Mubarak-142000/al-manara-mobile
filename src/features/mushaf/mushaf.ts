import { buildBoundaries, type Boundaries } from "@/core/khatma/schedule";
import type { AyahRef } from "@/core/quran/textApi";

/**
 * The bundled Hafs mushaf (src/data/mushaf-hafs.json, built by `npm run build:mushaf`).
 * Everything here is synchronous and offline: no screen that reads the Quran text waits on the network.
 */

type RawAyah = [surah: number, ayah: number, page: number, juz: number, hizbQuarter: number, sajda: 0 | 1, text: string];
type RawSurah = [number: number, name: string, meccan: 0 | 1, ayahCount: number];

export interface MushafAyah {
  /** Global ayah number, 1…6236 (the numbering ayah-by-ayah audio uses). */
  id: number;
  surah: number;
  ayah: number;
  page: number;
  juz: number;
  hizbQuarter: number;
  sajda: boolean;
  text: string;
}

export interface SurahInfo {
  number: number;
  name: string;
  meccan: boolean;
  ayahCount: number;
  startPage: number;
  juzStart: number;
}

export const TOTAL_PAGES = 604;

let cache: { ayahs: MushafAyah[]; pages: MushafAyah[][]; surahs: SurahInfo[]; basmala: string } | null = null;

function load() {
  if (cache) return cache;
  // Required lazily: the 1.4 MB module is only evaluated the first time the Quran is opened.
  const data = require("@/data/mushaf-hafs.json") as { basmala: string; surahs: RawSurah[]; ayahs: RawAyah[] };
  const ayahs = data.ayahs.map(([surah, ayah, page, juz, hizbQuarter, sajda, text], index): MushafAyah => ({
    id: index + 1,
    surah,
    ayah,
    page,
    juz,
    hizbQuarter,
    sajda: sajda === 1,
    text,
  }));
  const pages: MushafAyah[][] = Array.from({ length: TOTAL_PAGES }, () => []);
  for (const ayah of ayahs) pages[ayah.page - 1]!.push(ayah);
  const firstAyah = new Map<number, MushafAyah>();
  for (const ayah of ayahs) if (ayah.ayah === 1) firstAyah.set(ayah.surah, ayah);
  const surahs = data.surahs.map(([number, name, meccan, ayahCount]): SurahInfo => ({
    number,
    name,
    meccan: meccan === 1,
    ayahCount,
    startPage: firstAyah.get(number)?.page ?? 1,
    juzStart: firstAyah.get(number)?.juz ?? 1,
  }));
  cache = { ayahs, pages, surahs, basmala: data.basmala };
  return cache;
}

export function getSurahs(): SurahInfo[] {
  return load().surahs;
}

export function getSurah(number: number): SurahInfo | undefined {
  return load().surahs[number - 1];
}

export function getPage(page: number): MushafAyah[] {
  return load().pages[page - 1] ?? [];
}

export function getBasmala(): string {
  return load().basmala;
}

export function getSurahAyahs(surah: number): MushafAyah[] {
  return load().ayahs.filter((ayah) => ayah.surah === surah);
}

export function pageOf(surah: number, ayah: number): number {
  return load().ayahs.find((entry) => entry.surah === surah && entry.ayah === ayah)?.page ?? 1;
}

/** First page of each juz, for the juz index. */
export function juzStartPages(): { juz: number; page: number }[] {
  const starts: { juz: number; page: number }[] = [];
  for (const ayah of load().ayahs) if (!starts[ayah.juz - 1]) starts[ayah.juz - 1] = { juz: ayah.juz, page: ayah.page };
  return starts;
}

let boundaries: Boundaries | null = null;

/** Where every page, hizb, juz and surah begins, for the khatma arithmetic — from the bundle, so offline. */
export function mushafBoundaries(): Boundaries {
  if (boundaries) return boundaries;
  const pageStarts: AyahRef[] = [];
  const juzStarts: AyahRef[] = [];
  const hizbStarts: AyahRef[] = [];
  for (const ayah of load().ayahs) {
    const ref = { surah: ayah.surah, ayah: ayah.ayah };
    if (!pageStarts[ayah.page - 1]) pageStarts[ayah.page - 1] = ref;
    if (!juzStarts[ayah.juz - 1]) juzStarts[ayah.juz - 1] = ref;
    // A hizb is four quarters; it starts where its first quarter does.
    const hizb = Math.ceil(ayah.hizbQuarter / 4);
    if (!hizbStarts[hizb - 1]) hizbStarts[hizb - 1] = ref;
  }
  const built = buildBoundaries(pageStarts, juzStarts, hizbStarts);
  if (!built) throw new Error("The bundled mushaf is missing page, juz or hizb starts");
  boundaries = built;
  return built;
}

/** Surahs 1 (whose first ayah is the basmala) and 9 (which has none) carry no separate basmala. */
export function hasSeparateBasmala(surah: number): boolean {
  return surah !== 1 && surah !== 9;
}

const HIZB_PARTS = ["", "ربع ", "نصف ", "ثلاثة أرباع "];

/** The website's hizbLabel(): "ربع الحزب ٣" and so on. */
export function hizbLabel(hizbQuarter: number, digits: (n: number) => string): string {
  const hizb = Math.ceil(hizbQuarter / 4);
  const part = (hizbQuarter - 1) % 4;
  return `${HIZB_PARTS[part] ?? ""}الحزب ${digits(hizb)}`;
}
