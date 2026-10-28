/*
 * The geometry of the surah header (SurahFrame): an ornamental cartouche like the printed Madinah
 * mushaf's, drawn for any line size. Pure numbers, so it is tested; the drawing lives in SurahFrame.tsx.
 */

/** quran.com's surah-name font: U+E000 is «سورة», and surah n is U+E000 + n written in hex digits (114 → U+E114). */
export const SURAH_WORD_GLYPH = "";

export function surahNameGlyph(surah: number): string {
  if (!Number.isInteger(surah) || surah < 1 || surah > 114) return "";
  return String.fromCharCode(0xe000 + Number.parseInt(String(surah), 16));
}

export interface BannerGeometry {
  /** The band's rectangle and corner radius. */
  band: { x: number; y: number; width: number; height: number; radius: number };
  /** The two rosettes: centres (start = the right side in RTL, with مكية/مدنية; end = the ayah count). */
  rosette: { radius: number; start: number; end: number; cy: number };
  /** The central cartouche for the name: its ends and the depth of its pointed tips. */
  cartouche: { left: number; right: number; top: number; bottom: number; tip: number };
  /** Centres of the small lozenges between the rosettes and the cartouche, on each side. */
  ornaments: number[];
  ornamentSize: number;
}

/** Lays the header out in a width × height box (one printed line). */
export function bannerGeometry(width: number, height: number): BannerGeometry {
  const w = Math.max(width, 1);
  const h = Math.max(height, 1);
  const pad = Math.max(1, h * 0.06);
  const band = { x: pad, y: pad, width: w - pad * 2, height: h - pad * 2, radius: h * 0.2 };
  const radius = band.height * 0.47;
  const inset = pad + radius + h * 0.08;
  const rosette = { radius, start: w - inset, end: inset, cy: h / 2 };
  // The cartouche takes the middle: about half the band, never over the rosettes.
  const room = rosette.start - radius - (rosette.end + radius) - h * 0.6;
  const cartoucheWidth = Math.max(h * 2, Math.min(w * 0.52, room));
  const cartouche = {
    left: w / 2 - cartoucheWidth / 2,
    right: w / 2 + cartoucheWidth / 2,
    top: pad + band.height * 0.12,
    bottom: h - pad - band.height * 0.12,
    tip: h * 0.32,
  };
  // Lozenges between each rosette and the cartouche, evenly spaced, as many as fit.
  const ornamentSize = h * 0.11;
  const step = h * 0.34;
  const ornaments: number[] = [];
  const fill = (from: number, to: number) => {
    const span = to - from;
    const count = Math.floor(span / step);
    if (count < 1) return;
    const gap = span / count;
    for (let index = 0; index < count; index += 1) ornaments.push(from + gap * (index + 0.5));
  };
  fill(rosette.end + radius + h * 0.12, cartouche.left - h * 0.12);
  fill(cartouche.right + h * 0.12, rosette.start - radius - h * 0.12);
  return { band, rosette, cartouche, ornaments, ornamentSize };
}

/** The points of an eight-pointed star (two squares turned 45°) around a centre, as an SVG polygon list. */
export function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  const points: string[] = [];
  for (let index = 0; index < 16; index += 1) {
    const angle = (Math.PI / 8) * index - Math.PI / 2;
    const radius = index % 2 === 0 ? outer : inner;
    points.push(`${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`);
  }
  return points.join(" ");
}
