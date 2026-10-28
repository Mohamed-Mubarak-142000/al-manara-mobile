import { themeTajweedFont } from "@/core/quran/fontPalette";

const ENTRIES = 16;

/** A font with only the tables the recolouring reads: head and a CPAL of a light and a dark palette. */
function fakeFont(): Uint8Array {
  const headLength = 54;
  const cpalLength = 12 + 2 * 2 + 2 * ENTRIES * 4;
  const headOffset = 12 + 2 * 16;
  const cpalOffset = headOffset + 56;
  const bytes = new Uint8Array(cpalOffset + cpalLength);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x00010000);
  view.setUint16(4, 2);
  const record = (index: number, tag: string, offset: number, length: number) => {
    for (let char = 0; char < 4; char += 1) view.setUint8(12 + index * 16 + char, tag.charCodeAt(char));
    view.setUint32(12 + index * 16 + 8, offset);
    view.setUint32(12 + index * 16 + 12, length);
  };
  record(0, "CPAL", cpalOffset, cpalLength);
  record(1, "head", headOffset, headLength);
  view.setUint16(cpalOffset + 2, ENTRIES);
  view.setUint16(cpalOffset + 4, 2);
  view.setUint16(cpalOffset + 6, 2 * ENTRIES);
  view.setUint32(cpalOffset + 8, 16);
  view.setUint16(cpalOffset + 12, 0);
  view.setUint16(cpalOffset + 14, ENTRIES);
  // Light palette: black ink, every rule colour 0x10 + entry; dark: white ink, 0x80 + entry.
  for (let entry = 0; entry < ENTRIES; entry += 1) {
    const ink = [0, 13, 14].includes(entry);
    bytes.set(ink ? [0, 0, 0, 255] : [0x10 + entry, 0, 0, 255], cpalOffset + 16 + entry * 4);
    bytes.set(ink ? [255, 255, 255, 255] : [0x80 + entry, 0, 0, 255], cpalOffset + 16 + (ENTRIES + entry) * 4);
  }
  return bytes;
}

const colour = (font: Uint8Array, entry: number) => {
  const view = new DataView(font.buffer, font.byteOffset);
  const cpal = view.getUint32(12 + 8);
  return Array.from(font.slice(cpal + 16 + entry * 4, cpal + 16 + entry * 4 + 4));
};

function fontChecksum(font: Uint8Array): number {
  let sum = 0;
  for (let index = 0; index < font.length; index += 4) {
    let word = 0;
    for (let byte = 0; byte < 4; byte += 1) word = word * 256 + (font[index + byte] ?? 0);
    sum = (sum + word) >>> 0;
  }
  return sum;
}

describe("tajweed font palette", () => {
  it("draws the plain text in the theme's ink and keeps the light rule colours", () => {
    const font = themeTajweedFont(fakeFont(), "#1b2a24", false);
    // CPAL stores blue, green, red, alpha.
    for (const entry of [0, 13, 14]) expect(colour(font, entry)).toEqual([0x24, 0x2a, 0x1b, 255]);
    expect(colour(font, 3)).toEqual([0x13, 0, 0, 255]);
  });

  it("takes the dark palette's rule colours on a dark theme", () => {
    const font = themeTajweedFont(fakeFont(), "#ebe5d1", true);
    expect(colour(font, 0)).toEqual([0xd1, 0xe5, 0xeb, 255]);
    expect(colour(font, 3)).toEqual([0x83, 0, 0, 255]);
  });

  it("leaves a well-formed font: the whole-font checksum adds up", () => {
    expect(fontChecksum(themeTajweedFont(fakeFont(), "#3b2f1b", false))).toBe(0xb1b0afba);
  });

  it("doesn't change the font it is given", () => {
    const original = fakeFont();
    const copy = original.slice();
    themeTajweedFont(original, "#ffffff", true);
    expect(original).toEqual(copy);
  });
});
