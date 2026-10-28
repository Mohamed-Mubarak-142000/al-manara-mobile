/*
 * The tajweed page fonts (COLRv1) colour their words from their CPAL palettes: 0 for light pages, 1 for
 * dark ones. Native text always draws palette 0 and can't set its colours as the website does with
 * font-palette, so each reader theme gets its own copy of the font with palette 0 rewritten: the plain
 * text takes the theme's ink, and on a dark theme the tajweed colours are the dark palette's.
 */

/** Palette entries that are the plain text, not a tajweed rule. */
const INK_ENTRIES = [0, 13, 14];
const LIGHT_PALETTE = 0;
const DARK_PALETTE = 1;
/** OpenType's whole-font checksum target (the head table's checksumAdjustment makes the sum this). */
const CHECKSUM_MAGIC = 0xb1b0afba;

interface TableRecord {
  /** Where the record sits in the table directory. */
  at: number;
  offset: number;
  length: number;
}

function tables(view: DataView): Map<string, TableRecord> {
  const result = new Map<string, TableRecord>();
  const count = view.getUint16(4);
  for (let index = 0; index < count; index += 1) {
    const at = 12 + index * 16;
    const tag = String.fromCharCode(view.getUint8(at), view.getUint8(at + 1), view.getUint8(at + 2), view.getUint8(at + 3));
    result.set(tag, { at, offset: view.getUint32(at + 8), length: view.getUint32(at + 12) });
  }
  return result;
}

/** OpenType's checksum: the sum of the big-endian 32-bit words, the last one padded with zeros. */
function checksum(bytes: Uint8Array, start: number, length: number): number {
  let sum = 0;
  for (let index = 0; index < length; index += 4) {
    let word = 0;
    for (let byte = 0; byte < 4; byte += 1) {
      const at = start + index + byte;
      word = word * 256 + (index + byte < length && at < bytes.length ? bytes[at]! : 0);
    }
    sum = (sum + word) >>> 0;
  }
  return sum;
}

/** "#rrggbb" as CPAL's blue, green, red, alpha. */
function bgra(hex: string): [number, number, number, number] {
  const value = Number.parseInt(hex.replace("#", "").slice(0, 6), 16);
  return [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, 0xff];
}

/**
 * A copy of the font whose palette 0 draws the plain text in `ink`, and the tajweed rules in the dark
 * palette's colours when `dark`. The checksums are set again, so the copy is a well-formed font. A font
 * without the two palettes comes back unchanged.
 */
export function themeTajweedFont(font: Uint8Array, ink: string, dark: boolean): Uint8Array {
  const bytes = new Uint8Array(font);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const directory = tables(view);
  const cpal = directory.get("CPAL");
  const head = directory.get("head");
  if (!cpal || !head) return bytes;
  const entries = view.getUint16(cpal.offset + 2);
  const palettes = view.getUint16(cpal.offset + 4);
  if (palettes <= DARK_PALETTE) return bytes;
  const records = cpal.offset + view.getUint32(cpal.offset + 8);
  const first = (palette: number) => records + view.getUint16(cpal.offset + 12 + palette * 2) * 4;
  const light = first(LIGHT_PALETTE);

  if (dark) {
    const night = first(DARK_PALETTE);
    bytes.copyWithin(light, night, night + entries * 4);
  }
  const color = bgra(ink);
  for (const entry of INK_ENTRIES) if (entry < entries) bytes.set(color, light + entry * 4);

  view.setUint32(cpal.at + 4, checksum(bytes, cpal.offset, cpal.length));
  view.setUint32(head.offset + 8, 0);
  view.setUint32(head.offset + 8, (CHECKSUM_MAGIC - checksum(bytes, 0, bytes.length)) >>> 0);
  return bytes;
}
