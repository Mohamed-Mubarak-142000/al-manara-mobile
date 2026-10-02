// Ported from eslam-platform/src/features/quran/tajweedApi.ts — keep in sync by hand; Next-only caching swapped for cachedFetch.
import { cachedFetch } from "@/core/http";
export interface TajweedSegment {
  text: string;
  ruleClass: string | null;
}

export interface TajweedAyah {
  numberInSurah: number;
  segments: TajweedSegment[];
}

export interface TajweedRuleInfo {
  label: string;
  color: string;
}

export const TAJWEED_RULES: Record<string, TajweedRuleInfo> = {
  ghunnah: { label: "غنة", color: "#2f9e44" },
  idgham_ghunnah: { label: "إدغام بغنة", color: "#2f9e44" },
  idgham_wo_ghunnah: { label: "إدغام بغير غنة", color: "#37b24d" },
  idgham_shafawi: { label: "إدغام شفوي", color: "#40c057" },
  idgham_mutajanisayn: { label: "إدغام متجانسين", color: "#51cf66" },
  idgham_mutaqaribayn: { label: "إدغام متقاربين", color: "#69db7c" },
  ikhafa: { label: "إخفاء", color: "#d9822b" },
  ikhafa_shafawi: { label: "إخفاء شفوي", color: "#c2760a" },
  iqlab: { label: "إقلاب", color: "#1098ad" },
  qalaqah: { label: "قلقلة", color: "#e8590c" },
  madda_normal: { label: "مد طبيعي", color: "#e64980" },
  madda_permissible: { label: "مد جائز", color: "#e03131" },
  madda_obligatory: { label: "مد واجب", color: "#c92a2a" },
  madda_necessary: { label: "مد لازم", color: "#9c1c1c" },
  laam_shamsiyah: { label: "لام شمسية", color: "#868e96" },
  ham_wasl: { label: "همزة وصل", color: "#adb5bd" },
  slnt: { label: "حرف ساكن لا يُنطق", color: "#adb5bd" },
};

interface RawTajweedVerse {
  verse_key: string;
  text_uthmani_tajweed: string;
}

const TAJWEED_URL = "https://api.quran.com/api/v4/quran/verses/uthmani_tajweed";
const TAJWEED_REVALIDATE_SECONDS = 60 * 60 * 24 * 30;
const TAJWEED_TAG_PATTERN = /<(\/?)(tajweed|span)(?:\s+class=["']?([a-z_]+)["']?)?\s*>/g;

// The markup nests tags (e.g. a silent alif inside a madd), so text takes the innermost rule.
// The verse-end marker (<span class=end>) is dropped; the reader draws its own.
export function parseTajweedMarkup(markup: string): TajweedSegment[] {
  const segments: TajweedSegment[] = [];
  const stack: { tag: string; ruleClass: string | null }[] = [];
  let lastIndex = 0;
  const pushText = (rawText: string) => {
    // A few verses carry malformed tags in the source data (e.g. 32:3), so stray brackets are dropped.
    // The source writes the dagger alif of 1,561 madds (e.g. "صِرَٰطَ" in 1:6) as U+0672, which the
    // Uthmanic Hafs font draws as a dotted circle; it is U+0670 in the Hafs text, so it's mapped back.
    const text = rawText.replace(/[<>]/g, "").replace(/ٲ/g, "ٰ");
    if (!text || stack.some((entry) => entry.tag === "span")) return;
    const ruleClass = stack.at(-1)?.ruleClass ?? null;
    const previous = segments.at(-1);
    if (previous && previous.ruleClass === ruleClass) previous.text += text;
    else segments.push({ text, ruleClass });
  };
  for (const match of markup.matchAll(TAJWEED_TAG_PATTERN)) {
    const [fullMatch, closing, tag, ruleClass] = match;
    const start = match.index ?? 0;
    pushText(markup.slice(lastIndex, start));
    if (closing) {
      const openIndex = stack.map((entry) => entry.tag).lastIndexOf(tag ?? "");
      if (openIndex !== -1) stack.length = openIndex;
    } else {
      stack.push({ tag: tag ?? "", ruleClass: ruleClass ?? null });
    }
    lastIndex = start + fullMatch.length;
  }
  pushText(markup.slice(lastIndex));
  return segments;
}

export async function getSurahTajweedAyahs(surahNumber: number): Promise<TajweedAyah[]> {
  try {
    const response = await cachedFetch(`${TAJWEED_URL}?chapter_number=${surahNumber}`, TAJWEED_REVALIDATE_SECONDS);
    if (!response.ok) return [];
    const data = (await response.json()) as { verses: RawTajweedVerse[] };
    return data.verses.map((verse) => {
      const numberInSurah = Number.parseInt(verse.verse_key.split(":")[1] ?? "0", 10);
      return { numberInSurah, segments: parseTajweedMarkup(verse.text_uthmani_tajweed) };
    });
  } catch {
    return [];
  }
}
