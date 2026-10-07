// Ported from eslam-platform/src/features/adhkar/duasData.ts (and its adhkarContent.json, the full
// Hisn al-Muslim snapshot: see CONTENT.md). Keep both in sync by hand.
import content from "./adhkarContent.json";

export type DuaCategory = "morning" | "evening" | "sleep" | "waking" | "after-prayer" | "general";
export const DUA_CATEGORY_LABELS: Record<DuaCategory, string> = {
  morning: "أذكار الصباح",
  evening: "أذكار المساء",
  sleep: "أذكار النوم",
  waking: "أذكار الاستيقاظ",
  "after-prayer": "بعد الصلاة",
  general: "باقي الأذكار والأدعية",
};
export interface Dua {
  id: string;
  title: string;
  text: string;
  source: string;
  sourceUrl: string;
  category: DuaCategory;
  chapter: number;
  repeat?: number;
}
// Local snapshot: reading does not depend on the source API.
export const DUAS = content as Dua[];
export const DUA_CHAPTERS = Array.from(
  new Map(DUAS.filter((dua) => dua.category === "general").map((dua) => [dua.chapter, dua.title])),
  ([id, title]) => ({ id, title }),
);
