// The website's tasmee session rules (eslam-platform src/app/(site)/tasmee/page.tsx and
// src/features/tasmee/TasmeeSession.tsx, MistakeDialog.tsx), pulled out of React so they are shared
// and tested. Pure: no React Native imports.
import type { ExpectedWord, Mistake } from "./recitation";

/** The website's server clamp of ?from&to: whole surah by default, `to` never before `from`. */
export function clampRange(from: unknown, to: unknown, ayahCount: number): { from: number; to: number } {
  const toInt = (value: unknown) => {
    const parsed = Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const start = Math.min(Math.max(toInt(from) || 1, 1), ayahCount);
  const end = Math.min(Math.max(toInt(to) || ayahCount, start), ayahCount);
  return { from: start, to: end };
}

/** How many words of an ayah card are visible (the website's shownCount). */
export function shownCount({
  revealed,
  words,
  heard,
  hint,
}: {
  revealed: number;
  words: number;
  /** Words reached by voice in this ayah (0 in manual mode). */
  heard: number;
  /** "أظهر أول كلمة من كل آية" on, and the card is current or upcoming. */
  hint: boolean;
}): number {
  return Math.min(words, Math.max(revealed, heard, hint ? 1 : 0));
}

/** Words of ayah `index` reached by the confirmed or live voice position. */
export function heardInAyah(position: number, ayahStart: number | undefined, words: number): number {
  return Math.min(Math.max(position - (ayahStart ?? 0), 0), words);
}

/** Where "قرأتها صحيحة، أكمل" moves the cursor; null when overriding isn't offered (skipped ayah). */
export function overrideTarget(mistake: Mistake): number | null {
  if (mistake.kind === "wrong") return mistake.at + 1;
  if (mistake.kind === "missed") return mistake.at + mistake.count;
  return null;
}

export interface MistakeView {
  title: string;
  /** Word indexes within the ayah to highlight. */
  highlight: number[];
  /** "missed": the words not heard. */
  missed: string[];
  /** "skipped-ayah": the session index of the ayah the user jumped to. */
  skippedToAyah: number | null;
  /** The override button is shown (not for a skipped ayah). */
  canOverride: boolean;
  instruction: string;
}

/** The website's MistakeDialog wording and highlights. `ayahNumber` is already formatted for display. */
export function describeMistake(mistake: Mistake, expected: ExpectedWord[], ayahNumber: string): MistakeView {
  const at = expected[mistake.at]!;
  const tail = "سنستمع لك تلقائيًا بعد الإغلاق.";
  if (mistake.kind === "wrong") {
    return {
      title: `خطأ في الآية ${ayahNumber}`,
      highlight: [at.word],
      missed: [],
      skippedToAyah: null,
      canOverride: true,
      instruction: `أعد قراءة الكلمة الصحيحة أو الآية من أولها. ${tail}`,
    };
  }
  if (mistake.kind === "missed") {
    const missed = expected.slice(mistake.at, mistake.at + mistake.count).filter((word) => word.ayah === at.ayah);
    return {
      title: `نقصت كلمة في الآية ${ayahNumber}`,
      highlight: missed.map((word) => word.word),
      missed: missed.map((word) => word.text),
      skippedToAyah: null,
      canOverride: true,
      instruction: `أعد قراءة الكلمة الصحيحة أو الآية من أولها. ${tail}`,
    };
  }
  return {
    title: `تجاوزتَ الآية ${ayahNumber}`,
    highlight: [],
    missed: [],
    skippedToAyah: expected[mistake.resumeAt]?.ayah ?? at.ayah,
    canOverride: false,
    instruction: `اقرأ هذه الآية الآن. ${tail}`,
  };
}

/**
 * The website's automatic review: reciting a whole surah that is due for review with no mistake counts
 * as today's review of it.
 */
export function countsAsReview({
  ayahFrom,
  ayahTo,
  ayahCount,
  mistakes,
  dueAt,
  now = new Date(),
}: {
  ayahFrom: number;
  ayahTo: number;
  ayahCount: number;
  mistakes: number;
  dueAt: string | null;
  now?: Date;
}): boolean {
  return ayahFrom === 1 && ayahTo === ayahCount && mistakes === 0 && dueAt !== null && new Date(dueAt).getTime() <= now.getTime();
}
