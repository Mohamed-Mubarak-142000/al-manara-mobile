// Ported from eslam-platform/src/features/ruqyah/ruqyahData.ts (and its generated ruqyahContent.json:
// see CONTENT.md). Keep both in sync by hand. The player tracks are built in features/ruqyah.
import content from "./ruqyahContent.json";

export interface RuqyahPassage {
  id: string;
  title: string;
  surah: number;
  surahName: string;
  from: number;
  to: number;
  /** Why the Sunnah names this passage; absent for the reciters' customary selection. */
  sunnah?: string;
  repeat?: number;
  ayahs: { numberInSurah: number; number: number; text: string }[];
}

export interface RuqyahHadith {
  id: string;
  title: string;
  /** The words to say, or null when the hadith describes a practice. */
  dua: string | null;
  hadith: string;
  grade: string;
  attribution: string;
  url: string;
  repeat?: number;
}

export const RUQYAH_QURAN = content.quran as RuqyahPassage[];
export const RUQYAH_SUNNAH = content.sunnah as RuqyahHadith[];
