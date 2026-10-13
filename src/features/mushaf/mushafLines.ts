import { joinSegments } from "@/core/quran/joinSegments";
import type { TajweedSegment } from "@/core/quran/tajweedApi";

import { getSurahs, mushafStarts } from "./mushaf";

/**
 * The 15-line Madinah page layout (src/data/mushaf-lines.json, built by `npm run build:mushaf-lines`): which
 * words sit on which printed line, in the KFGQPC Hafs text the bundled UthmanicHafs font was made for.
 */

type RawWord = string | [text: string, tajweed: string];
type RawLine = number | RawWord[];

export interface LineWord {
  text: string;
  /** The word coloured by tajweed rule (Uthmani spelling), when a rule touches it. */
  tajweed: TajweedSegment[] | null;
  /** Global ayah number, 1…6236. */
  ayahId: number;
  surah: number;
  ayah: number;
  /** The ayah-end ornament (the font draws the number inside it). */
  end: boolean;
  /** Allah's name, which the printed mushafs of this style set in red. */
  jalala: boolean;
}

export type MushafLine =
  | { kind: "surah"; surah: number }
  | { kind: "basmala" }
  | { kind: "text"; words: LineWord[]; width: number }
  | { kind: "empty" };

/**
 * A text line's width in ems that fills the page width at the base size. Most lines are narrower (they
 * are spread by the space between words); the few wider ones are drawn a little smaller.
 */
export const TARGET_LINE_EM = 17.4;
export const LINES_PER_PAGE = 15;

let data: { rules: string[]; pages: string[] } | null = null;
const parsed = new Map<number, MushafLine[]>();
let ayahOffsets: number[] | null = null;

/** `ayahOffsets[s]` is the global number of surah s's ayah 0. */
function offsets() {
  if (ayahOffsets) return ayahOffsets;
  const result = [0, 0];
  for (const surah of getSurahs()) result[surah.number + 1] = result[surah.number]! + surah.ayahCount;
  ayahOffsets = result;
  return result;
}

const CLOSE = 0xe0ff;
/** The rule names of quran.com's word markup that the app colours under another name. */
function ruleName(name: string | undefined): string | null {
  if (!name || name === "custom") return null;
  return name.startsWith("madda_obligatory") ? "madda_obligatory" : name;
}

/** The build's compact markup: U+E000 + i opens rules[i], U+E0FF closes the innermost rule. */
function parseTajweed(compact: string, rules: string[]): TajweedSegment[] {
  const segments: TajweedSegment[] = [];
  const stack: (string | null)[] = [];
  let text = "";
  const flush = () => {
    if (!text) return;
    // As in parseTajweedMarkup: the source's U+0672 dagger alif is U+0670 in the Hafs font.
    const clean = text.replace(/ٲ/g, "ٰ");
    const ruleClass = stack.at(-1) ?? null;
    const previous = segments.at(-1);
    if (previous && previous.ruleClass === ruleClass) previous.text += clean;
    else segments.push({ text: clean, ruleClass });
    text = "";
  };
  for (const char of compact) {
    const code = char.charCodeAt(0);
    if (code >= 0xe000 && code <= CLOSE) {
      flush();
      if (code === CLOSE) stack.pop();
      else stack.push(ruleName(rules[code - 0xe000]));
    } else text += char;
  }
  flush();
  return segments;
}

const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
// With its attached particles: ٱللَّه، لِلَّه، بِٱللَّه، وَٱللَّه، تَٱللَّه، أَبِٱللَّه، ءَآللَّه، ٱللَّهُمَّ.
const JALALA = /^[وفبتأء]{0,2}[اآ]?لله(?:م)?$/;
function isJalala(text: string): boolean {
  return JALALA.test(text.replace(DIACRITICS, "").replace(/ٱ/g, "ا"));
}

/** A page's 15 lines, each word tagged with its ayah. Parsed on first use; the last few pages are kept. */
export function getPageLines(page: number): MushafLine[] {
  const cached = parsed.get(page);
  if (cached) return cached;
  // Required lazily: the module is a list of strings, and only the pages shown are parsed.
  data ??= require("@/data/mushaf-lines.json") as { rules: string[]; pages: string[] };
  const raw = data.pages[page - 1];
  if (!raw) return [];
  const [rawLines, widths] = JSON.parse(raw) as [RawLine[], number[]];
  const start = mushafStarts().pageStarts[page - 1];
  let surah = start?.surah ?? 1;
  let ayah = start?.ayah ?? 1;
  const offset = offsets();
  const rules = data.rules;

  const lines = rawLines.map((line, index): MushafLine => {
    if (typeof line === "number") {
      if (line === 0) return { kind: "basmala" };
      surah = line;
      ayah = 1;
      return { kind: "surah", surah: line };
    }
    if (line.length === 0) return { kind: "empty" };
    const words = line.map((word): LineWord => {
      const [text, tajweed] = typeof word === "string" ? [word, null] : word;
      const end = /^[٠-٩]+$/.test(text);
      const entry: LineWord = {
        text,
        // Joined like the flowing reader's tajweed (tajweedStore), or Android breaks the word at each colour.
        tajweed: tajweed ? joinSegments(parseTajweed(tajweed, rules)) : null,
        ayahId: (offset[surah] ?? 0) + ayah,
        surah,
        ayah,
        end,
        jalala: !end && isJalala(text),
      };
      if (end) ayah += 1;
      return entry;
    });
    return { kind: "text", words, width: widths[index] ?? TARGET_LINE_EM };
  });

  parsed.set(page, lines);
  if (parsed.size > 8) parsed.delete(parsed.keys().next().value!);
  return lines;
}
