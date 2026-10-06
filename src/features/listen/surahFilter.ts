import { normalizeArabic } from "@/core/text/normalizeArabic";

/** Arabic-Indic (٠–٩) and Persian (۰–۹) digits to ASCII, so "١٨" finds surah 18. */
function asciiDigits(text: string): string {
  return text.replace(/[٠-٩۰-۹]/g, (digit) => String(digit.charCodeAt(0) % 16));
}

/** The rows whose surah name (hamza and tashkeel ignored) or number matches what the user typed. */
export function filterSurahs<T extends { surah: number; name: string }>(rows: readonly T[], query: string): T[] {
  const trimmed = asciiDigits(query.trim());
  if (!trimmed) return [...rows];
  if (/^\d+$/.test(trimmed)) return rows.filter((row) => String(row.surah).startsWith(trimmed));
  const needle = normalizeArabic(trimmed.replace(/^سورة\s+/, ""));
  return rows.filter((row) => normalizeArabic(row.name).includes(needle));
}
