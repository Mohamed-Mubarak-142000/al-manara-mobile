// Ported from eslam-platform/src/features/hadith/api.ts — keep in sync by hand; Next-only caching swapped for cachedFetch.
import { cachedFetch } from "@/core/http";

/**
 * موسوعة الأحاديث النبوية (HadeethEnc.com): hadiths with grade, explanation, benefits and word
 * meanings, through its public API. Cached for a week; every call falls back to empty on failure.
 * The URL builders and parsers are exported so the offline hadith packs (src/features/hadith) can
 * download straight into their own files without duplicating thousands of entries in the http cache.
 */

export const HADEETHENC_API = "https://hadeethenc.com/api/v1";
const REVALIDATE = 60 * 60 * 24 * 7;
export const HADEETHENC_URL = "https://hadeethenc.com/ar/home";

export interface HadithCategory {
  id: string;
  title: string;
  count: number;
  parentId: string | null;
}

export interface HadithSummary {
  id: string;
  title: string;
}

export interface HadithPage {
  items: HadithSummary[];
  page: number;
  lastPage: number;
  total: number;
}

export interface Hadith {
  id: string;
  title: string;
  /** The narration ("عن ... قال") before the Prophet's words, when the API splits it out. */
  intro: string;
  text: string;
  attribution: string;
  grade: string;
  explanation: string;
  benefits: string[];
  words: { word: string; meaning: string }[];
  references: string[];
  categoryIds: string[];
}

export interface RawHadithPage {
  data: { id: string; title: string }[];
  meta: { current_page: string; last_page: number; total_items: number };
}

export interface RawHadith {
  id: string;
  title: string;
  hadeeth: string;
  hadeeth_intro?: string;
  attribution: string;
  grade: string;
  explanation: string;
  hints?: string[];
  words_meanings?: { word: string; meaning: string }[];
  reference?: string;
  categories?: string[];
}

async function get<T>(path: string): Promise<T | null> {
  try {
    const response = await cachedFetch(`${HADEETHENC_API}${path}`, REVALIDATE);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/** The API's text is plain, but a stray tag or entity shouldn't reach the page. */
function clean(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\r/g, "")
    .trim();
}

export async function getCategories(): Promise<HadithCategory[]> {
  const data =
    await get<{ id: string; title: string; hadeeths_count: string; parent_id: string | null }[]>("/categories/list/?language=ar");
  return (data ?? []).map((category) => ({
    id: String(category.id),
    title: clean(category.title),
    count: Number(category.hadeeths_count) || 0,
    parentId: category.parent_id === null ? null : String(category.parent_id),
  }));
}

export const HADITHS_PER_PAGE = 20;

export function hadithListPath(categoryId: string, page: number, perPage = HADITHS_PER_PAGE): string {
  return `/hadeeths/list/?language=ar&category_id=${encodeURIComponent(categoryId)}&page=${page}&per_page=${perPage}`;
}

export function hadithPath(id: string): string {
  return `/hadeeths/one/?language=ar&id=${id}`;
}

export function parseHadithPage(data: RawHadithPage | null, page: number): HadithPage {
  if (!data) return { items: [], page, lastPage: 0, total: 0 };
  return {
    items: data.data.map((item) => ({ id: String(item.id), title: clean(item.title) })),
    page: Number(data.meta.current_page) || page,
    lastPage: Number(data.meta.last_page) || 0,
    total: Number(data.meta.total_items) || 0,
  };
}

export function parseHadith(data: RawHadith | null): Hadith | null {
  if (!data?.hadeeth) return null;
  return {
    id: String(data.id),
    title: clean(data.title),
    intro: clean(data.hadeeth_intro),
    text: clean(data.hadeeth),
    attribution: clean(data.attribution),
    grade: clean(data.grade),
    explanation: clean(data.explanation),
    benefits: (data.hints ?? []).map(clean).filter(Boolean),
    words: (data.words_meanings ?? [])
      .map((entry) => ({ word: clean(entry.word), meaning: clean(entry.meaning) }))
      .filter((entry) => entry.word && entry.meaning),
    references: clean(data.reference)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    categoryIds: (data.categories ?? []).map(String),
  };
}

export async function getCategoryHadiths(categoryId: string, page: number): Promise<HadithPage> {
  return parseHadithPage(await get<RawHadithPage>(hadithListPath(categoryId, page)), page);
}

export async function getHadith(id: string): Promise<Hadith | null> {
  if (!/^\d+$/.test(id)) return null;
  return parseHadith(await get<RawHadith>(hadithPath(id)));
}

/** فضائل والآداب: gentle, everyday hadiths for "حديث اليوم". */
export const DAILY_CATEGORY = "5";

/** Which hadith of the daily category (0-based, by list order) is the hadith of `day`. */
export function dailyHadithIndex(day: string, total: number): number {
  const dayNumber = Math.floor(new Date(`${day}T12:00:00Z`).getTime() / 86_400_000);
  return dayNumber % total;
}

/** One hadith per calendar day, the same for everyone that day. */
export async function getHadithOfTheDay(day: string): Promise<Hadith | null> {
  const first = await getCategoryHadiths(DAILY_CATEGORY, 1);
  if (first.total === 0) return null;
  const index = dailyHadithIndex(day, first.total);
  const page = await getCategoryHadiths(DAILY_CATEGORY, Math.floor(index / HADITHS_PER_PAGE) + 1);
  const item = page.items[index % HADITHS_PER_PAGE] ?? first.items[0];
  return item ? getHadith(item.id) : null;
}
