// Ported from eslam-platform/src/features/kids/quiz/quizGenerator.ts — keep in sync by hand.
import type { Surah } from "@/core/quran/api";
import type { Ayah } from "@/core/quran/textApi";
import type { QuizChoice, QuizQuestion } from "./quizTypes";

export interface QuizPoolItem {
  surah: Surah;
  ayah: Ayah;
  nextAyah: Ayah | null;
}

export type Rng = () => number;

function shuffle<T>(items: T[], rng: Rng): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

function pickOne<T>(items: T[], rng: Rng): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(rng() * items.length)] ?? null;
}

function pickDistinct<T>(items: T[], count: number, rng: Rng, isEqual: (a: T, b: T) => boolean, exclude: T): T[] {
  const pool = items.filter((item) => !isEqual(item, exclude));
  const shuffled = shuffle(pool, rng);
  const result: T[] = [];
  for (const item of shuffled) {
    if (result.length >= count) break;
    if (!result.some((existing) => isEqual(existing, item))) result.push(item);
  }
  return result;
}

export function buildQuizPool(surahs: Surah[], ayahsBySurah: Record<number, Ayah[]>): QuizPoolItem[] {
  const pool: QuizPoolItem[] = [];
  for (const surah of surahs) {
    const ayahs = ayahsBySurah[surah.id] ?? [];
    ayahs.forEach((ayah, index) => {
      pool.push({ surah, ayah, nextAyah: ayahs[index + 1] ?? null });
    });
  }
  return pool;
}

function toChoices(labels: string[], correctLabel: string, rng: Rng): { choices: QuizChoice[]; correctChoiceId: string } {
  const shuffledLabels = shuffle(labels, rng);
  const choices = shuffledLabels.map((label, index) => ({ id: `choice-${index}`, label }));
  const correctChoice = choices.find((choice) => choice.label === correctLabel);
  return { choices, correctChoiceId: correctChoice?.id ?? choices[0]?.id ?? "choice-0" };
}

export function buildWhichSurahQuestion(pool: QuizPoolItem[], rng: Rng, targets: QuizPoolItem[] = pool): QuizQuestion | null {
  const target = pickOne(targets, rng);
  if (!target) return null;

  const distractors = pickDistinct(pool, 3, rng, (a, b) => a.surah.id === b.surah.id, target);
  if (distractors.length < 3) return null;

  const { choices, correctChoiceId } = toChoices(
    [target.surah.name, ...distractors.map((item) => item.surah.name)],
    target.surah.name,
    rng,
  );

  return {
    id: `which-surah-${target.surah.id}-${target.ayah.number}`,
    kind: "which-surah",
    prompt: target.ayah.text,
    promptLabel: "من أي سورة هذه الآية؟",
    choices,
    correctChoiceId,
  };
}

export function buildCompleteAyahQuestion(pool: QuizPoolItem[], rng: Rng, targets: QuizPoolItem[] = pool): QuizQuestion | null {
  const withNext = targets.filter((item) => item.nextAyah !== null);
  const target = pickOne(withNext, rng);
  if (!target || !target.nextAyah) return null;

  const distractors = pickDistinct(pool, 3, rng, (a, b) => a.ayah.number === b.ayah.number, {
    ...target,
    ayah: target.nextAyah,
  });
  if (distractors.length < 3) return null;

  const { choices, correctChoiceId } = toChoices(
    [target.nextAyah.text, ...distractors.map((item) => item.ayah.text)],
    target.nextAyah.text,
    rng,
  );

  return {
    id: `complete-ayah-${target.surah.id}-${target.ayah.number}`,
    kind: "complete-ayah",
    prompt: target.ayah.text,
    promptLabel: "ما هي الآية التالية؟",
    choices,
    correctChoiceId,
  };
}

export function generateQuiz(
  surahs: Surah[],
  ayahsBySurah: Record<number, Ayah[]>,
  questionCount: number,
  rng: Rng = Math.random,
  /** Ask only about this surah's ayahs; the other surahs still supply the wrong choices. */
  focusSurahId?: number,
): QuizQuestion[] {
  const pool = buildQuizPool(surahs, ayahsBySurah);
  const targets = focusSurahId === undefined ? pool : pool.filter((item) => item.surah.id === focusSurahId);
  const questions: QuizQuestion[] = [];
  const usedIds = new Set<string>();
  let attempts = 0;

  while (questions.length < questionCount && attempts < questionCount * 10) {
    attempts += 1;
    const kind = rng() < 0.5 ? "which-surah" : "complete-ayah";
    const question = kind === "which-surah" ? buildWhichSurahQuestion(pool, rng, targets) : buildCompleteAyahQuestion(pool, rng, targets);
    if (question && !usedIds.has(question.id)) {
      usedIds.add(question.id);
      questions.push(question);
    }
  }

  return questions;
}
