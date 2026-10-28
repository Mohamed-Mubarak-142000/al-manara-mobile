// Builds src/data/mushaf-lines.json: the 604 Madinah pages line by line (15 lines each, as printed), in the
// KFGQPC Hafs text the bundled UthmanicHafs.ttf was made for (quran.com text_qpc_hafs + line_number). The
// reader draws every line justified to the page width, so a page looks like the printed mushaf and never
// scrolls.
//
// Shape: { rules, pages } where pages[p] is a JSON string of [lines, widths]. Each line is
//   a positive number  -> the frame of that surah's name
//   0                  -> the basmala
//   an array of words  -> a line of text; a word is its text, or [text, tajweed] when tajweed colours part
//                         of it. Ayah ends are words of Arabic-Indic digits only, which the font draws as the
//                         ayah ornament; the app walks the words from the page's first ayah.
// The tajweed form is quran.com's word markup made compact: U+E000 + i opens rules[i], U+E0FF closes it.
// widths[line] is that line's width in ems (word widths plus a minimal gap, 0 for frames), measured with
// the font itself, so the app sizes every line to the screen without measuring at runtime.
//
// Usage: npm run build:mushaf-lines (needs the network; fontkit is a dev dependency)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openSync } from "fontkit";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "src/data/mushaf-lines.json");
const API = "https://api.quran.com/api/v4/verses/by_page";
const LINES = 15;
/** The least space kept between two words, in ems; justification adds the rest. */
const MIN_GAP_EM = 0.18;

const font = openSync(path.join(root, "assets/fonts/UthmanicHafs.ttf"));
const em = (text) => font.layout(text).advanceWidth / font.unitsPerEm;
const { pageStarts } = JSON.parse(fs.readFileSync(path.join(root, "src/data/mushaf-index.json"), "utf8"));
const surahNames = JSON.parse(fs.readFileSync(path.join(root, "src/data/surah-names.json"), "utf8"));
const stripTags = (markup) => markup.replace(/<[^>]+>/g, "");
const rules = [];
const CLOSE = "";
function compact(markup) {
  return markup.replace(/<rule class=([\w-]+)>|<\/rule>/g, (_, name) => {
    if (!name) return CLOSE;
    if (!rules.includes(name)) rules.push(name);
    return String.fromCharCode(0xe000 + rules.indexOf(name));
  });
}

async function fetchPage(page, attempt = 1) {
  try {
    const verses = [];
    for (let next = 1; next;) {
      const response = await fetch(
        `${API}/${page}?words=true&word_fields=text_qpc_hafs,line_number,text_uthmani_tajweed&per_page=50&page=${next}`,
      );
      if (!response.ok) throw new Error(`quran.com answered ${response.status} for page ${page}`);
      const body = await response.json();
      verses.push(...body.verses);
      next = body.pagination?.next_page ?? null;
    }
    return verses;
  } catch (error) {
    if (attempt >= 4) throw error;
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    return fetchPage(page, attempt + 1);
  }
}

function buildPage(page, verses) {
  const lines = Array.from({ length: LINES }, () => null);
  const widths = [];
  for (const verse of verses) {
    const ayah = verse.verse_number;
    for (const word of verse.words) {
      const line = word.line_number;
      if (!(line >= 1 && line <= LINES)) throw new Error(`Page ${page}: ${verse.verse_key} on line ${line}`);
      const text = word.text_qpc_hafs;
      const end = word.char_type_name === "end";
      if (end !== /^[٠-٩]+$/.test(text)) throw new Error(`Page ${page}: unexpected ayah end ${JSON.stringify(text)}`);
      if (end && text !== String(ayah).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]))
        throw new Error(`Page ${page}: end ${text} for ${verse.verse_key}`);
      const markup = !end && word.text_uthmani_tajweed?.includes("<") ? word.text_uthmani_tajweed : null;
      if (markup && /<(?!\/?rule\b)/.test(markup)) throw new Error(`Page ${page}: unknown tag in ${markup}`);
      (lines[line - 1] ??= []).push(markup ? [text, compact(markup)] : text);
      (widths[line - 1] ??= []).push(Math.max(em(text), markup ? em(stripTags(markup)) : 0));
    }
  }
  // The lines without words before a surah's first ayah carry its name frame, then its basmala.
  const firsts = verses.filter((verse) => verse.verse_number === 1).map((verse) => Number(verse.verse_key.split(":")[0]));
  for (const surah of firsts) {
    const firstLine = verses.find((verse) => verse.verse_key === `${surah}:1`).words[0].line_number - 1;
    let free = 0;
    while (firstLine - free - 1 >= 0 && lines[firstLine - free - 1] === null) free += 1;
    const basmala = surah !== 1 && surah !== 9;
    if (free === 0) throw new Error(`Page ${page}: no room for the frame of surah ${surah}`);
    if (basmala && free >= 2) {
      lines[firstLine - 1] = 0;
      lines[firstLine - 2] = surah;
    } else lines[firstLine - 1] = surah;
  }
  // Any other empty line is space left at the end of a page (only the openings of al-Fatiha and al-Baqara).
  const lineWidths = lines.map((_, index) => {
    const words = widths[index];
    return words ? Number((words.reduce((sum, value) => sum + value, 0) + MIN_GAP_EM * (words.length - 1)).toFixed(2)) : 0;
  });
  return { lines: lines.map((line) => line ?? []), lineWidths };
}

const pages = [];
const widths = [];
const all = [];
for (let page = 1; page <= 604; page += 1) {
  const verses = await fetchPage(page);
  const [surah, ayah] = verses[0].verse_key.split(":").map(Number);
  const [startSurah, startAyah] = pageStarts[page - 1];
  if (surah !== startSurah || ayah !== startAyah)
    throw new Error(`Page ${page} starts at ${surah}:${ayah}, the bundle says ${startSurah}:${startAyah}`);
  const { lines, lineWidths } = buildPage(page, verses);
  pages.push(lines);
  widths.push(lineWidths);
  // The two opening pages are set larger and centred in print; they don't count toward the statistics.
  if (page > 2) all.push(...lineWidths.filter(Boolean));
  if (page % 50 === 0) console.log(`page ${page}`);
}
if (surahNames.length !== 114) throw new Error("surah-names.json is not loaded");

all.sort((a, b) => a - b);
const pct = (p) => all[Math.floor((all.length - 1) * p)].toFixed(2);
console.log(
  `Lines: ${all.length}, em p10 ${pct(0.1)} p50 ${pct(0.5)} p80 ${pct(0.8)} p90 ${pct(0.9)} p95 ${pct(0.95)} p99 ${pct(0.99)} max ${pct(1)}`,
);
// Each page is stored as its own JSON string: requiring the module then only creates 604 strings, and the
// reader parses a page when it is shown.
fs.writeFileSync(out, JSON.stringify({ rules, pages: pages.map((lines, index) => JSON.stringify([lines, widths[index]])) }));
console.log(`Wrote ${path.relative(root, out)}: ${(fs.statSync(out).size / 1024).toFixed(1)} KB`);
