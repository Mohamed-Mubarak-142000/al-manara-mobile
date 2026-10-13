// Ported from eslam-platform/src/features/kids/games/trueFalseLogic.ts — keep in sync by hand.
import type { Surah } from "@/core/quran/api";
import { toArabicDigits } from "@/core/text/arabic";
import { getSurahAyahCount } from "@/core/quran/surahAyahCounts";
import { ayahPreview, shuffle, type Rng } from "./gameUtils";

export interface TrueFalseQuestion {
  id: string;
  statement: string;
  /** Shown in Quran font under the statement, when the question is about an ayah. */
  ayah?: string;
  answer: boolean;
  /** Said after answering, right or wrong, so every question teaches something. */
  explanation: string;
}

export const TRUE_FALSE_COUNT = 8;

type Builder = (surah: Surah, others: Surah[], firstAyahs: Record<number, string>, rng: Rng) => TrueFalseQuestion | null;

const ayahCount: Builder = (surah, _others, _first, rng) => {
  const real = getSurahAyahCount(surah.id);
  const truthful = rng() < 0.5;
  const shown = truthful ? real : real + (rng() < 0.5 && real > 3 ? -1 : 1) * (1 + Math.floor(rng() * 2));
  return {
    id: `count-${surah.id}`,
    statement: `سورة ${surah.name} عدد آياتها ${toArabicDigits(shown)}`,
    answer: shown === real,
    explanation: `سورة ${surah.name} عدد آياتها ${toArabicDigits(real)}`,
  };
};

const revelation: Builder = (surah, _others, _first, rng) => {
  const sayMeccan = rng() < 0.5;
  return {
    id: `place-${surah.id}`,
    statement: `سورة ${surah.name} سورة ${sayMeccan ? "مكية" : "مدنية"}`,
    answer: sayMeccan === surah.meccan,
    explanation: `سورة ${surah.name} ${surah.meccan ? "مكية، نزلت في مكة" : "مدنية، نزلت في المدينة"}`,
  };
};

const order: Builder = (surah, others, _first, rng) => {
  const other = shuffle(others, rng)[0];
  if (!other) return null;
  const before = surah.id < other.id;
  const sayBefore = rng() < 0.5;
  return {
    id: `order-${surah.id}-${other.id}`,
    statement: `في المصحف، تأتي سورة ${surah.name} ${sayBefore ? "قبل" : "بعد"} سورة ${other.name}`,
    answer: sayBefore === before,
    explanation: `سورة ${surah.name} تأتي ${before ? "قبل" : "بعد"} سورة ${other.name}`,
  };
};

const firstAyah: Builder = (surah, others, firstAyahs, rng) => {
  const truthful = rng() < 0.5;
  const source = truthful
    ? surah
    : shuffle(
        others.filter((entry) => firstAyahs[entry.id]),
        rng,
      )[0];
  const text = source ? firstAyahs[source.id] : undefined;
  if (!source || !text) return null;
  return {
    id: `first-${surah.id}-${source.id}`,
    statement: `هذه أول آية في سورة ${surah.name}`,
    ayah: ayahPreview(text, 8),
    answer: source.id === surah.id,
    explanation: `هذه أول آية في سورة ${source.name}`,
  };
};

const BUILDERS: Builder[] = [ayahCount, revelation, order, firstAyah];

/** A mixed round of statements about the surahs, half true and half false on average. */
export function buildTrueFalseQuiz(surahs: Surah[], firstAyahs: Record<number, string>, rng: Rng = Math.random): TrueFalseQuestion[] {
  const questions: TrueFalseQuestion[] = [];
  const seen = new Set<string>();
  for (const surah of shuffle(surahs, rng)) {
    if (questions.length >= TRUE_FALSE_COUNT) break;
    const builder = BUILDERS[questions.length % BUILDERS.length]!;
    const question = builder(
      surah,
      surahs.filter((entry) => entry.id !== surah.id),
      firstAyahs,
      rng,
    );
    if (question && !seen.has(question.id)) {
      seen.add(question.id);
      questions.push(question);
    }
  }
  return questions;
}
