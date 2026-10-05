import type { TajweedSegment } from "./tajweedApi";

/**
 * Android draws each differently-styled span on its own, so a tajweed colour that starts mid-word cuts
 * the Arabic joining ("ٱل رَّحۡمَ ـٰ نِ"). Two repairs keep the word whole while keeping the colours:
 * marks that begin a segment move back onto their letter, and a zero-width joiner on both sides of a
 * mid-word cut asks each half for its joined form.
 */

const ZWJ = "‍";
/** Harakat, Quranic annotation marks and the dagger alif: they belong to the letter before them. */
const MARK = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭ]/;
const LETTER = /[ؠ-يٱ-ۓۺ-ۼ]/;
/** Letters that never join to the following letter (alifs, dal, dhal, ra, zay, waw, ta marbuta...). */
const RIGHT_JOINING = /[آ-إاةد-زوٱ-ٳٵ-ٷڈ-ڙۀۃ-ۋۍۏےۓ]/;
const TATWEEL = "ـ";

/** The last letter of the text, skipping its marks; null when it ends in a space or anything else. */
function lastLetter(text: string): string | null {
  for (let i = text.length - 1; i >= 0; i -= 1) {
    const char = text[i]!;
    if (MARK.test(char) || char === ZWJ) continue;
    return LETTER.test(char) || char === TATWEEL ? char : null;
  }
  return null;
}

export function joinSegments(segments: readonly TajweedSegment[]): TajweedSegment[] {
  // 1. Leading marks go back to the previous segment's letter.
  const moved: TajweedSegment[] = [];
  for (const segment of segments) {
    let text = segment.text;
    const previous = moved[moved.length - 1];
    if (previous) {
      let cut = 0;
      while (cut < text.length && MARK.test(text[cut]!)) cut += 1;
      if (cut > 0) {
        previous.text += text.slice(0, cut);
        text = text.slice(cut);
      }
    }
    if (text) moved.push({ ...segment, text });
  }

  // 2. A joiner on each side of a cut inside a word whose letter before the cut joins forward.
  for (let i = 0; i + 1 < moved.length; i += 1) {
    const before = lastLetter(moved[i]!.text);
    const after = moved[i + 1]!.text[0];
    if (!before || !after || !LETTER.test(after) || RIGHT_JOINING.test(before)) continue;
    moved[i]!.text += ZWJ;
    moved[i + 1]!.text = ZWJ + moved[i + 1]!.text;
  }
  return moved;
}
