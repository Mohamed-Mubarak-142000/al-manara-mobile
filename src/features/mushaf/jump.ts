import { TOTAL_PAGES, getPage, mushafStarts, pageOf, type MushafAyah } from "./mushaf";

/** The ayahs of one page: the bundled Hafs pages, or another riwaya's own layout. */
export type PageSource = (page: number) => MushafAyah[];

export const hafsPages: PageSource = getPage;

/** The first page holding an ayah that passes `test`, or null. */
function firstPageWhere(source: PageSource, test: (ayah: MushafAyah) => boolean): number | null {
  for (let page = 1; page <= TOTAL_PAGES; page += 1) if (source(page).some(test)) return page;
  return null;
}

/** Where a surah begins in this layout (riwayat paginate differently from Hafs). */
export function surahStartPage(source: PageSource, surah: number): number {
  return firstPageWhere(source, (ayah) => ayah.surah === surah) ?? 1;
}

export function juzStartPage(source: PageSource, juz: number): number {
  return firstPageWhere(source, (ayah) => ayah.juz === juz) ?? 1;
}

let hizbPages: number[] | null = null;

/** First Hafs page of each of the 60 ahzab (index 0 = hizb 1), from the bundle's hizb-quarter data. */
export function hizbStartPages(): number[] {
  if (hizbPages) return hizbPages;
  hizbPages = mushafStarts().hizbStarts.map((ref) => pageOf(ref.surah, ref.ayah));
  return hizbPages;
}

/** The Hafs page of a global ayah id (1…6236): ids run in page order, so a binary search does. */
export function pageOfAyahId(id: number): number | null {
  let low = 1;
  let high = TOTAL_PAGES;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const ayahs = getPage(mid);
    const first = ayahs[0];
    const last = ayahs[ayahs.length - 1];
    if (!first || !last) return null;
    if (id < first.id) high = mid - 1;
    else if (id > last.id) low = mid + 1;
    else return mid;
  }
  return null;
}

/**
 * The global ayah id an audio track recites, from its id: "ayah-<voice>-<id>" (AyahSheet) or
 * "repeat-<voice>-<id>-<round>-<time>" (the repeat screen). Anything else is not ayah audio.
 */
export function ayahIdFromTrackId(trackId: string | null | undefined): number | null {
  if (!trackId) return null;
  const match = /^(?:ayah-[a-z]+-(\d+)|repeat-[a-z]+-(\d+)-\d+-\d+)$/.exec(trackId);
  const id = Number(match?.[1] ?? match?.[2]);
  return Number.isInteger(id) && id >= 1 && id <= 6236 ? id : null;
}

/** "١٢٣", "۱۲۳" or "123" → 123 when it is a page of the mushaf, otherwise null. */
export function parsePageInput(text: string): number | null {
  const ascii = text
    .trim()
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
  if (!/^\d{1,4}$/.test(ascii)) return null;
  const page = Number(ascii);
  return page >= 1 && page <= TOTAL_PAGES ? page : null;
}
