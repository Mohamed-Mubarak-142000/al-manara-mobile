// Ported from eslam-platform/src/lib/normalizeArabic.ts — keep in sync by hand.
/** Loose Arabic matching for search: drops diacritics and unifies common letter variants. */
export function normalizeArabic(text: string): string {
  return text
    .replace(/[ً-ٰٟۖ-ۭـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .trim();
}
