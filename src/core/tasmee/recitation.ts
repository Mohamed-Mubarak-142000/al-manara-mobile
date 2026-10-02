// Ported from eslam-platform/src/features/tasmee/recitation.ts — keep in sync by hand.
/**
 * Matching what speech recognition heard against the ayahs being recited. Pure, so it can be
 * tested without a microphone.
 *
 * General Arabic recognition isn't trained on the Quran: it writes plain spelling (الصلاة for
 * ٱلصَّلَوٰةَ), sometimes drops or splits short words, and never gives tashkeel. So words are compared
 * on a loose "skeleton" with a similarity score, short words may go unheard without penalty, and
 * only a clear wrong word, a skipped word or a skipped ayah counts as a mistake. Tashkeel and
 * tajweed can't be judged this way.
 */

export interface ExpectedWord {
  /** Index of the ayah in the session. */
  ayah: number;
  /** Index of the word inside its ayah. */
  word: number;
  text: string;
  norm: string;
  skeleton: string;
}

export type Mistake =
  | { kind: "wrong"; at: number; heard: string }
  | { kind: "missed"; at: number; count: number }
  | { kind: "skipped-ayah"; at: number; resumeAt: number };

export interface MatchResult {
  /** Position in the expected words after this chunk (next word to say). */
  pos: number;
  /** The first mistake, if any; `pos` then points at the word to say again. */
  mistake: Mistake | null;
}

const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;

/** Plain letters only: no tashkeel or Quranic marks, one form of alef, ya and ta marbuta. */
export function normalizeWord(text: string): string {
  return text
    .replace(MARKS, "")
    .replace(/[ٱأإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^ء-ي]/g, "");
}

/** Without alef and hamza, where Uthmani and plain spelling differ most (ٱلْكِتَٰبُ ~ الكتاب). */
export function skeleton(norm: string): string {
  return norm.replace(/[اء]/g, "");
}

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length]!;
}

/** 0…1 likeness of two words, forgiving the spelling gaps between Uthmani text and recognition. */
export function similarity(a: { norm: string; skeleton: string }, b: { norm: string; skeleton: string }): number {
  if (!a.norm || !b.norm) return 0;
  if (a.norm === b.norm || (a.skeleton && a.skeleton === b.skeleton)) return 1;
  const longest = Math.max(a.skeleton.length, b.skeleton.length);
  if (longest === 0) return 0;
  return 1 - distance(a.skeleton, b.skeleton) / longest;
}

const SAME = 0.7;
/** Words this short (و، من، في، لا…) are often lost by recognition; missing them isn't a mistake. */
const isShort = (word: { norm: string }) => word.norm.length <= 2;

export function buildExpected(ayahs: string[][]): ExpectedWord[] {
  return ayahs.flatMap((words, ayah) =>
    words.map((text, word) => {
      const norm = normalizeWord(text);
      return { ayah, word, text, norm, skeleton: skeleton(norm) };
    }),
  );
}

interface Heard {
  text: string;
  norm: string;
  skeleton: string;
}

export function splitHeard(transcript: string): Heard[] {
  return transcript
    .split(/\s+/)
    .map((text) => {
      const norm = normalizeWord(text);
      return { text, norm, skeleton: skeleton(norm) };
    })
    .filter((word) => word.norm.length > 0);
}

const joined = (words: { norm: string }[]): { norm: string; skeleton: string } => {
  const norm = words.map((word) => word.norm).join("");
  return { norm, skeleton: skeleton(norm) };
};

const PREAMBLE = new Set(["اعوذ", "بالله", "من", "الشيطان", "الرجيم", "بسم", "الله", "الرحمن", "الرحيم", "صدق", "العظيم"]);

type Step =
  | { op: "match"; e: number; eLen: number; h: number; hLen: number }
  | { op: "sub"; e: number; h: number }
  | { op: "del"; e: number }
  | { op: "ins"; h: number };

/**
 * Aligns heard words to the expected words from `start` on. The alignment may begin a little
 * before `start` for free, so repeating the last words (or the whole ayah) after a pause or a
 * correction isn't a mistake. Expected words left at the end are simply not said yet.
 */
function align(expected: ExpectedWord[], heard: Heard[], start: number, lookBack: number): Step[] {
  const from = Math.max(0, start - lookBack);
  const to = Math.min(expected.length, start + heard.length * 2 + 6);
  const E = expected.slice(from, to);
  const n = heard.length;
  const m = E.length;
  const INF = Number.POSITIVE_INFINITY;
  const cost: number[][] = Array.from({ length: n + 1 }, () => Array<number>(m + 1).fill(INF));
  const back: (Step & { pi: number; pj: number })[][] = Array.from({ length: n + 1 }, () => Array(m + 1));
  // Free start anywhere between `from` and `start` (repetition); skipping past `start` costs.
  for (let j = 0; j <= start - from && j <= m; j++) cost[0]![j] = 0;

  const relax = (i: number, j: number, value: number, step: Step, pi: number, pj: number) => {
    if (value < cost[i]![j]!) {
      cost[i]![j] = value;
      back[i]![j] = { ...step, pi, pj };
    }
  };

  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= m; j++) {
      const here = cost[i]![j]!;
      if (here === INF) continue;
      const e = from + j;
      if (j < m) {
        // Expected word not heard.
        relax(i, j + 1, here + (isShort(E[j]!) ? 0.3 : 1), { op: "del", e }, i, j);
      }
      if (i < n) {
        // Heard word that fits nothing: noise, a repeat, or an added word.
        // Costs a little more than a wrong word, so a wrong last word is caught rather than dropped.
        relax(i + 1, j, here + (isShort(heard[i]!) ? 0.3 : 1.1), { op: "ins", h: i }, i, j);
      }
      if (i < n && j < m) {
        const s = similarity(heard[i]!, E[j]!);
        if (s >= SAME) relax(i + 1, j + 1, here + (1 - s) * 0.5, { op: "match", e, eLen: 1, h: i, hLen: 1 }, i, j);
        else relax(i + 1, j + 1, here + 1, { op: "sub", e, h: i }, i, j);
      }
      // Recognition splits or merges words: "يا أيها" ~ "ياايها", "و الذين" ~ "والذين".
      if (i + 1 < n && j < m && similarity(joined([heard[i]!, heard[i + 1]!]), E[j]!) >= 0.85)
        relax(i + 2, j + 1, here + 0.1, { op: "match", e, eLen: 1, h: i, hLen: 2 }, i, j);
      if (i < n && j + 1 < m && similarity(heard[i]!, joined([E[j]!, E[j + 1]!])) >= 0.85)
        relax(i + 1, j + 2, here + 0.1, { op: "match", e, eLen: 2, h: i, hLen: 1 }, i, j);
    }
  }

  // End anywhere: the rest of the expected words haven't been recited yet.
  let bestJ = 0;
  for (let j = 0; j <= m; j++) if (cost[n]![j]! < cost[n]![bestJ]!) bestJ = j;
  const steps: Step[] = [];
  for (let i = n, j = bestJ; i > 0 || j > 0;) {
    const step = back[i]![j];
    if (!step) break; // reached the free start
    steps.push(step);
    i = step.pi;
    j = step.pj;
  }
  return steps.reverse();
}

/**
 * Judges one finished chunk of speech. Matches move `pos` forward; the first real mistake stops
 * there. A skipped ayah is noticed when the words line up with a later ayah's opening instead.
 */
export function matchChunk(expected: ExpectedWord[], transcript: string, pos: number): MatchResult {
  let heard = splitHeard(transcript);
  // Isti'adha and basmala before reciting (unless the ayahs themselves start with them).
  if (pos === 0 && expected[0]?.norm !== "بسم") {
    while (heard.length > 0 && PREAMBLE.has(heard[0]!.norm)) heard = heard.slice(1);
  }
  if (heard.length === 0) return { pos, mistake: null };

  const ayahStart = (at: number) => {
    let index = Math.min(at, expected.length - 1);
    while (index > 0 && expected[index - 1]!.ayah === expected[at]?.ayah) index--;
    return index;
  };
  const lookBack = Math.max(12, pos - ayahStart(pos) + 1);
  const result = judge(expected, heard, pos, lookBack);
  if (result.mistake && result.mistake.kind !== "skipped-ayah") {
    const skipTo = findSkip(expected, heard, pos);
    if (skipTo !== null) return { pos, mistake: { kind: "skipped-ayah", at: pos, resumeAt: skipTo } };
  }
  return result;
}

function judge(expected: ExpectedWord[], heard: Heard[], pos: number, lookBack: number): MatchResult {
  const steps = align(expected, heard, pos, lookBack);

  let cursor = pos;
  let pendingMissed: number[] = [];
  for (const step of steps) {
    if (step.op === "match") {
      if (step.e + step.eLen <= cursor) continue; // a repeated earlier word
      const missed = pendingMissed.filter((index) => index >= cursor && !isShort(expected[index]!));
      if (missed.length > 0) return missedOrSkipped(expected, missed, cursor, step.e);
      pendingMissed = [];
      cursor = step.e + step.eLen;
    } else if (step.op === "del") {
      if (step.e >= cursor) pendingMissed.push(step.e);
    } else if (step.op === "sub") {
      if (step.e < cursor) continue;
      const missed = pendingMissed.filter((index) => index >= cursor && !isShort(expected[index]!));
      if (missed.length > 0) return missedOrSkipped(expected, missed, cursor, step.e);
      // A wrong short word is usually the recognizer, not the reciter.
      if (isShort(expected[step.e]!) && isShort(heard[step.h]!)) {
        cursor = step.e + 1;
        pendingMissed = [];
        continue;
      }
      return { pos: step.e, mistake: { kind: "wrong", at: step.e, heard: heard[step.h]!.text } };
    }
    // "ins" (extra heard words) are forgiven: recognition noise is far likelier than an added word.
  }
  return { pos: cursor, mistake: null };
}

function missedOrSkipped(expected: ExpectedWord[], missed: number[], cursor: number, resumeAt: number): MatchResult {
  // A whole ayah inside the gap means it was skipped, not just a word.
  const skipped = expected.some((word, index) => {
    if (index < cursor || index >= resumeAt || word.word !== 0) return false;
    let last = index;
    while (expected[last + 1]?.ayah === word.ayah) last++;
    return last < resumeAt;
  });
  if (skipped) return { pos: cursor, mistake: { kind: "skipped-ayah", at: cursor, resumeAt } };
  return { pos: cursor, mistake: { kind: "missed", at: cursor, count: Math.max(1, missed.length) } };
}

/**
 * When the words don't fit where the reciter should be, check whether they fit the opening of
 * one of the next few ayahs: a long skipped ayah lies beyond the alignment window.
 */
function findSkip(expected: ExpectedWord[], heard: Heard[], pos: number): number | null {
  const probe = heard.slice(0, 3);
  if (probe.length < 2) return null;
  const currentAyah = expected[pos]?.ayah ?? 0;
  for (let index = pos + 1; index < expected.length; index++) {
    const word = expected[index]!;
    if (word.ayah > currentAyah + 6) break;
    if (word.word !== 0 || word.ayah <= currentAyah) continue;
    const scores = probe.map((h, offset) => (expected[index + offset] ? similarity(h, expected[index + offset]!) : 0));
    if (scores.every((score) => score >= SAME)) return index;
  }
  return null;
}

/** How far live (unfinished) speech already matches, word by word, for showing progress only. */
export function matchPreview(expected: ExpectedWord[], transcript: string, pos: number): number {
  const heard = splitHeard(transcript);
  if (heard.length === 0) return pos;
  const steps = align(expected, heard, pos, 12);
  let cursor = pos;
  for (const step of steps) {
    if (step.op === "match" && step.e + step.eLen > cursor) {
      if (step.e > cursor && expected.slice(cursor, step.e).some((word) => !isShort(word))) break;
      cursor = step.e + step.eLen;
    } else if (step.op === "sub" && step.e >= cursor) break;
  }
  return cursor;
}
