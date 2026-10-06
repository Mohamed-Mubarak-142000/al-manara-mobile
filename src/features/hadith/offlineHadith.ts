import {
  DAILY_CATEGORY,
  dailyHadithIndex,
  getCategories,
  getCategoryHadiths,
  getHadith,
  HADITHS_PER_PAGE,
  type Hadith,
  type HadithCategory,
  type HadithPage,
  type HadithSummary,
} from "@/core/hadith/api";

import { isPackReady, packIdForHadith, readPack, readSavedCategories } from "./hadithPacks";

/**
 * The hadith screens read through these: a downloaded pack answers first, the core API (cachedFetch)
 * otherwise. Packs are per root topic; a sub-topic is answered from its root's pack by keeping the
 * hadiths tagged with that sub-topic or any topic under it (the API tags each hadith with its leaf
 * topics). Offline sub-topic lists follow the root's order, which can differ from the website's.
 */

/** The topics: the API (cached a week, stale copy offline), else the list saved with the last download. */
export async function getCategoriesOffline(): Promise<HadithCategory[]> {
  const list = await getCategories().catch(() => []);
  if (list.length) return list;
  return (await readSavedCategories()) ?? [];
}

function rootOf(categoryId: string, categories: readonly HadithCategory[]): string | null {
  const byId = new Map(categories.map((category) => [category.id, category]));
  let current = byId.get(categoryId);
  for (let guard = 0; current?.parentId && guard < 20; guard += 1) current = byId.get(current.parentId);
  return current && current.parentId === null ? current.id : null;
}

function withDescendants(categoryId: string, categories: readonly HadithCategory[]): Set<string> {
  const ids = new Set([categoryId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const category of categories) {
      if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) {
        ids.add(category.id);
        grew = true;
      }
    }
  }
  return ids;
}

/** A topic's full offline list, or null when no downloaded pack covers it. */
async function offlineList(categoryId: string): Promise<HadithSummary[] | null> {
  if (isPackReady(categoryId)) return (await readPack(categoryId))?.items ?? null;
  const categories = await readSavedCategories();
  if (!categories) return null;
  const root = rootOf(categoryId, categories);
  if (!root || !isPackReady(root)) return null;
  const pack = await readPack(root);
  if (!pack) return null;
  const topics = withDescendants(categoryId, categories);
  return pack.items.filter((item) => pack.hadiths[item.id]?.categoryIds.some((id) => topics.has(id)));
}

export function pageOf(items: readonly HadithSummary[], page: number): HadithPage {
  const start = (page - 1) * HADITHS_PER_PAGE;
  return {
    items: items.slice(start, start + HADITHS_PER_PAGE),
    page,
    lastPage: Math.ceil(items.length / HADITHS_PER_PAGE),
    total: items.length,
  };
}

export async function getCategoryHadithsOffline(categoryId: string, page: number): Promise<HadithPage> {
  const items = await offlineList(categoryId).catch(() => null);
  if (items?.length) return pageOf(items, page);
  return getCategoryHadiths(categoryId, page);
}

export async function getHadithOffline(id: string): Promise<Hadith | null> {
  const packId = packIdForHadith(id);
  if (packId) {
    const hadith = (await readPack(packId).catch(() => null))?.hadiths[id];
    if (hadith) return hadith;
  }
  return getHadith(id);
}

/** The same pick as the website's getHadithOfTheDay, from the pack when "الفضائل والآداب" is downloaded. */
export async function getHadithOfTheDayOffline(day: string): Promise<Hadith | null> {
  const first = await getCategoryHadithsOffline(DAILY_CATEGORY, 1);
  if (first.total === 0) return null;
  const index = dailyHadithIndex(day, first.total);
  const page = await getCategoryHadithsOffline(DAILY_CATEGORY, Math.floor(index / HADITHS_PER_PAGE) + 1);
  const item = page.items[index % HADITHS_PER_PAGE] ?? first.items[0];
  return item ? getHadithOffline(item.id) : null;
}
