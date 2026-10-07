import { buildBoundaries, type Boundaries } from "@/core/khatma/schedule";
import type { AyahRef } from "@/core/quran/textApi";

/**
 * The bundled Hafs mushaf (src/data/mushaf-hafs.json, built by `npm run build:mushaf`).
 * Everything here is synchronous and offline: no screen that reads the Quran text waits on the network.
 */

type RawAyah = [surah: number, ayah: number, page: number, juz: number, hizbQuarter: number, sajda: 0 | 1, text: string];
/** A row of src/data/surah-names.json (built by scripts/build-surah-names.mjs). */
type RawSurahName = [number: number, name: string, meccan: 0 | 1, ayahCount: number, startPage: number, juzStart: number];

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

/** `surahStart[s]` is the index in `ayahs` of surah s's first ayah (s = 1…114; [115] = the end). */
let cache: { ayahs: MushafAyah[]; pages: MushafAyah[][]; surahStart: number[]; basmala: string } | null = null;

function load() {
  if (cache) return cache;
  // Required lazily: the 1.4 MB module is only evaluated the first time the Quran is opened.
  const data = require("@/data/mushaf-hafs.json") as { basmala: string; ayahs: RawAyah[] };
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
  const surahStart: number[] = [];
  ayahs.forEach((ayah, index) => {
    pages[ayah.page - 1]!.push(ayah);
    if (surahStart[ayah.surah] === undefined) surahStart[ayah.surah] = index;
  });
  surahStart[115] = ayahs.length;
  cache = { ayahs, pages, surahStart, basmala: data.basmala };
  return cache;
}

/** A row of src/data/mushaf-index.json: [surah, ayah]. */
type RawRef = [surah: number, ayah: number];

let index: { pageStarts: RawRef[]; juzStarts: RawRef[]; hizbStarts: RawRef[]; juzPages: number[]; hizbPages: number[] } | null = null;

/**
 * Where every page, juz and hizb begins, from the small mushaf-index.json (scripts/build-mushaf-index.mjs),
 * so the Quran index, the khatma and the plan don't load the full text for it.
 */
function divisions() {
  index ??= require("@/data/mushaf-index.json") as NonNullable<typeof index>;
  return index;
}

let surahs: SurahInfo[] | null = null;

/**
 * The surah index comes from the small surah-names.json (4 KB), not the mushaf, so Home, the widgets and
 * the surah lists can name a surah without paying for the full text.
 */
export function getSurahs(): SurahInfo[] {
  if (surahs) return surahs;
  const rows = require("@/data/surah-names.json") as RawSurahName[];
  surahs = rows.map(([number, name, meccan, ayahCount, startPage, juzStart]): SurahInfo => ({
    number,
    name,
    meccan: meccan === 1,
    ayahCount,
    startPage,
    juzStart,
  }));
  return surahs;
}

export function getSurah(number: number): SurahInfo | undefined {
  return getSurahs()[number - 1];
}

/** Every ayah in mushaf order (loads the full text). */
export function getAllAyahs(): readonly MushafAyah[] {
  return load().ayahs;
}

export function getPage(page: number): MushafAyah[] {
  return load().pages[page - 1] ?? [];
}

export function getBasmala(): string {
  return load().basmala;
}

export function getSurahAyahs(surah: number): MushafAyah[] {
  const { ayahs, surahStart } = load();
  const from = surahStart[surah];
  return from === undefined ? [] : ayahs.slice(from, surahStart[surah + 1]);
}

export function pageOf(surah: number, ayah: number): number {
  const { ayahs, surahStart } = load();
  const from = surahStart[surah];
  const entry = from === undefined ? undefined : ayahs[from + ayah - 1];
  return entry?.surah === surah && entry.ayah === ayah ? entry.page : 1;
}

/** First page of each juz, for the juz index. */
export function juzStartPages(): { juz: number; page: number }[] {
  return divisions().juzPages.map((page, index) => ({ juz: index + 1, page }));
}

/** First page of each of the 60 ahzab (index 0 = hizb 1). */
export function hizbStartPages(): number[] {
  return divisions().hizbPages;
}

let starts: { pageStarts: AyahRef[]; juzStarts: AyahRef[]; hizbStarts: AyahRef[] } | null = null;

/** The first ayah of every page, juz and hizb (the shape the website's Quran-API helpers return). */
export function mushafStarts() {
  if (starts) return starts;
  const toRefs = (rows: RawRef[]): AyahRef[] => rows.map(([surah, ayah]) => ({ surah, ayah }));
  const { pageStarts, juzStarts, hizbStarts } = divisions();
  starts = { pageStarts: toRefs(pageStarts), juzStarts: toRefs(juzStarts), hizbStarts: toRefs(hizbStarts) };
  return starts;
}

let boundaries: Boundaries | null = null;

/** Where every page, hizb, juz and surah begins, for the khatma arithmetic — from the bundle, so offline. */
export function mushafBoundaries(): Boundaries {
  if (boundaries) return boundaries;
  const { pageStarts, juzStarts, hizbStarts } = mushafStarts();
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
