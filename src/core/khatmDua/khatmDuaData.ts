// Ported from eslam-platform/src/features/khatmDua/khatmDuaData.ts (and its generated
// khatmDuaContent.json: see CONTENT.md). Keep both in sync by hand.
import content from "./khatmDuaContent.json";

export interface QuranDua {
  /** "surah:ayah". */
  key: string;
  surahName: string;
  ayah: number;
  /** The dua is the end of the verse, after the words that introduce it. */
  partial: boolean;
  text: string;
  note?: string;
}

export interface SunnahDua {
  id: string;
  title: string;
  dua: string;
  grade: string;
  attribution: string;
  url: string;
}

export const QURAN_DUAS = content.quran as QuranDua[];
export const SUNNAH_DUAS = content.sunnah as SunnahDua[];
