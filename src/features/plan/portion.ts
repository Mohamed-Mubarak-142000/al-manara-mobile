// Ported from eslam-platform/src/features/plan/portion.ts — keep in sync by hand (pages from the bundle, so synchronous).
import type { PageAyah } from "@/core/quran/textApi";
import { getPage } from "@/features/mushaf/mushaf";
import type { PageSegment } from "@/core/plan/schedule";

export interface SurahSpan {
  surah: number;
  from: number;
  to: number;
}

export interface ResolvedSegment extends PageSegment {
  spans: SurahSpan[];
  /** Opening words of the portion, so the learner can find it on the page. */
  opening: string;
}

/** A half page is the first or second half of the page's ayahs, split by count. */
function pickHalf(ayahs: PageAyah[], half: PageSegment["half"]): PageAyah[] {
  if (half === "full") return ayahs;
  const middle = Math.ceil(ayahs.length / 2);
  return half === "first" ? ayahs.slice(0, middle) : ayahs.slice(middle);
}

function toSpans(ayahs: PageAyah[]): SurahSpan[] {
  const spans: SurahSpan[] = [];
  for (const ayah of ayahs) {
    const last = spans[spans.length - 1];
    if (last && last.surah === ayah.surah && last.to === ayah.numberInSurah - 1) last.to = ayah.numberInSurah;
    else spans.push({ surah: ayah.surah, from: ayah.numberInSurah, to: ayah.numberInSurah });
  }
  return spans;
}

function openingWords(text: string, count = 5): string {
  const words = text.split(/\s+/).filter(Boolean);
  return words.slice(0, count).join(" ") + (words.length > count ? "…" : "");
}

/**
 * The exact ayahs of each segment, limited to the plan's juz (a page shared with a neighboring
 * juz only counts its own part). Synchronous here: the pages come from the bundled mushaf.
 */
export function resolveSegments(segments: PageSegment[], juz: { start: number; end: number }): ResolvedSegment[] {
  const pages: PageAyah[][] = segments.map((segment) =>
    getPage(segment.page).map((ayah) => ({ surah: ayah.surah, numberInSurah: ayah.ayah, juz: ayah.juz, text: ayah.text })),
  );
  return segments.map((segment, index) => {
    const own = pages[index]!.filter((ayah) => ayah.juz >= juz.start && ayah.juz <= juz.end);
    const ayahs = pickHalf(own, segment.half);
    return { ...segment, spans: toSpans(ayahs), opening: ayahs[0] ? openingWords(ayahs[0].text) : "" };
  });
}

/** Ayah numbers per surah, for marking them memorized. */
export function spansToAyahs(segments: ResolvedSegment[]): { surah: number; ayahs: number[] }[] {
  const bySurah = new Map<number, Set<number>>();
  for (const span of segments.flatMap((segment) => segment.spans)) {
    const set = bySurah.get(span.surah) ?? new Set<number>();
    for (let ayah = span.from; ayah <= span.to; ayah += 1) set.add(ayah);
    bySurah.set(span.surah, set);
  }
  return [...bySurah].map(([surah, set]) => ({ surah, ayahs: [...set].sort((a, b) => a - b) }));
}
