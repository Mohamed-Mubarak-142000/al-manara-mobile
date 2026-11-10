import { normalizeArabic } from "@/core/text/normalizeArabic";

import type { GuideEntry } from "./types";

/** Everything a guide says, flattened once for matching. */
function haystack(entry: GuideEntry): string {
  return normalizeArabic(
    [
      entry.title,
      entry.summary,
      ...entry.path,
      ...entry.steps.flatMap((step) => [step.title, step.body]),
      ...entry.features,
      ...(entry.tips ?? []),
    ].join(" "),
  );
}

const cache = new WeakMap<GuideEntry, string>();

/**
 * The guides that contain every word of the query, with or without tashkeel; title matches first.
 * An empty query returns them all, in order.
 */
export function searchGuide(entries: readonly GuideEntry[], query: string): GuideEntry[] {
  const words = normalizeArabic(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...entries];
  const matches = entries.filter((entry) => {
    let text = cache.get(entry);
    if (text === undefined) {
      text = haystack(entry);
      cache.set(entry, text);
    }
    return words.every((word) => text.includes(word));
  });
  const inTitle = (entry: GuideEntry) => words.every((word) => normalizeArabic(entry.title).includes(word));
  return [...matches.filter(inTitle), ...matches.filter((entry) => !inTitle(entry))];
}
