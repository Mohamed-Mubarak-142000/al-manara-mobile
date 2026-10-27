import { TOTAL_PAGES } from "./mushaf";

/**
 * Today's khatma or plan portion opened from «اقرأ الآن» (the website's ReaderPortion, ?until=&wird=):
 * the reader keeps to pages from..to and says when they are read. Pure, so it is tested.
 */
export interface ReaderPortion {
  from: number;
  to: number;
  kind: "khatma" | "plan";
}

/** Where "record it" goes back to. */
export const PORTION_HOME: Record<ReaderPortion["kind"], { href: "/khatma" | "/plan"; label: string }> = {
  khatma: { href: "/khatma", label: "الختمة" },
  plan: { href: "/plan", label: "خطة الحفظ" },
};

/** The portion from the screen's params, or null when they don't describe one (the whole mushaf). */
export function parseReaderPortion(page: number, until: unknown, wird: unknown): ReaderPortion | null {
  const to = Number(until);
  if (!Number.isInteger(to) || to < page || to > TOTAL_PAGES) return null;
  return wird === "khatma" || wird === "plan" ? { from: page, to, kind: wird } : null;
}

/** The pager's item after the portion's last page: the "portion done" panel. */
export const PORTION_DONE = 0;

/** The pager's items: every page, or the portion's pages and then its "done" panel. */
export function pagerItems(portion: ReaderPortion | null): number[] {
  if (!portion) return Array.from({ length: TOTAL_PAGES }, (_, index) => index + 1);
  return [...Array.from({ length: portion.to - portion.from + 1 }, (_, index) => portion.from + index), PORTION_DONE];
}

/** A page's index among the pager's items. */
export function pagerIndex(portion: ReaderPortion | null, page: number): number {
  return portion ? page - portion.from : page - 1;
}

/** "صفحة ٢ من ٥" in the portion: where the reader is, and how many pages it has. */
export function portionPosition(portion: ReaderPortion, page: number): { position: number; total: number } {
  const total = portion.to - portion.from + 1;
  return { position: Math.max(1, Math.min(total, page - portion.from + 1)), total };
}
