// Ported from eslam-platform/src/features/nawawi/nawawiData.ts (and its generated nawawiContent.json:
// see CONTENT.md), with the exam sizes from its service.ts and the question shape from its
// examGenerator.ts. Keep in sync by hand.
import content from "./nawawiContent.json";
import { toArabicDigits } from "@/core/text/arabic";

export interface NawawiHadith {
  /** Its number in al-Nawawi's book, 1–42. */
  number: number;
  title: string;
  narrator: string;
  /** The full text, with its chain's opening and the narrator. */
  hadith: string;
  /** The Prophet's own words ﷺ (each quoted part «…»), which the exams are built from. */
  sayings: string[];
  grade: string;
  attribution: string;
  explanation: string;
  lessons: string[];
  url: string;
}

export const NAWAWI = content.hadiths as NawawiHadith[];
export const CERTIFICATE_QUOTE = content.certificateQuote;

/** "عن أبي هريرة رضي الله عنه": the blessing in the narrator's gender and number. */
export function narratorLine(hadith: Pick<NawawiHadith, "narrator">): string {
  const blessing = hadith.narrator.includes(" و") ? "عنهما" : hadith.narrator.startsWith("عائشة") ? "عنها" : "عنه";
  return `عن ${hadith.narrator} رضي الله ${blessing}`;
}

/** The final exam's part number; 1–4 are the parts of the book. */
export const FINAL_PART = 5;

const ORDINALS = ["الأولى", "الثانية", "الثالثة", "الرابعة"];

export interface NawawiPart {
  id: number;
  title: string;
  from: number;
  to: number;
}

export const NAWAWI_PARTS: NawawiPart[] = content.parts.map((part, index) => ({
  id: index + 1,
  title: `المرحلة ${ORDINALS[index]}`,
  ...part,
}));

export function partTitle(part: number): string {
  return part === FINAL_PART ? "الاختبار النهائي" : (NAWAWI_PARTS[part - 1]?.title ?? "");
}

export function partRange(part: number): string {
  const entry = NAWAWI_PARTS[part - 1];
  return entry ? `الأحاديث ${toArabicDigits(entry.from)}–${toArabicDigits(entry.to)}` : "الأحاديث الاثنان والأربعون";
}

export function hadithsOfPart(part: number): NawawiHadith[] {
  const entry = NAWAWI_PARTS[part - 1];
  return entry ? NAWAWI.filter((hadith) => hadith.number >= entry.from && hadith.number <= entry.to) : NAWAWI;
}

/** The exam's URL segment for a part: 1–4, or "final". */
export function partSlug(part: number): string {
  return part === FINAL_PART ? "final" : String(part);
}

export function parsePartSlug(slug: string): number | null {
  if (slug === "final") return FINAL_PART;
  const part = Number(slug);
  return Number.isInteger(part) && part >= 1 && part <= NAWAWI_PARTS.length ? part : null;
}

/** Questions and minutes per exam (the website's service.ts): a part covers 10–12 hadiths, the final all 42. */
export const PART_EXAM = { questions: 10, minutes: 15 };
export const FINAL_EXAM = { questions: 20, minutes: 30 };

export function examSize(part: number) {
  return part === FINAL_PART ? FINAL_EXAM : PART_EXAM;
}

export type NawawiQuestionType = "complete" | "missing" | "narrator";

/** What the learner sees of a question — never contains the answer. */
export interface NawawiQuestion {
  id: string;
  type: NawawiQuestionType;
  /** The hadith's number in the book. */
  hadith: number;
  prompt: string;
  options: string[];
}

export const QUESTION_TITLES: Record<NawawiQuestionType, string> = {
  complete: "أكمل الحديث:",
  missing: "ما الكلمة الناقصة في الحديث؟",
  narrator: "من راوي هذا الحديث؟",
};
