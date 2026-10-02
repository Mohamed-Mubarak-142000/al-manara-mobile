// Builds src/data/mushaf-hafs.json: the whole Uthmani Hafs text, bundled so the mushaf works
// offline from the first launch. Source: api.alquran.cloud quran-uthmani (the website's text source).
// Usage: npm run build:mushaf
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "src/data/mushaf-hafs.json");

// Must match BASMALA in src/core/quran/textApi.ts (built from codepoints for the same reason).
const BASMALA = String.fromCodePoint(
  0x628,
  0x650,
  0x633,
  0x652,
  0x645,
  0x650,
  0x20,
  0x671,
  0x644,
  0x644,
  0x651,
  0x64e,
  0x647,
  0x650,
  0x20,
  0x671,
  0x644,
  0x631,
  0x651,
  0x64e,
  0x62d,
  0x652,
  0x645,
  0x64e,
  0x670,
  0x646,
  0x650,
  0x20,
  0x671,
  0x644,
  0x631,
  0x651,
  0x64e,
  0x62d,
  0x650,
  0x64a,
  0x645,
  0x650,
);
// Combining marks and special letters, by codepoint: typed literally they are invisible in an editor.
const cp = (...codes) => String.fromCodePoint(...codes);
const SHADDA = cp(0x651);
const ALIF_MADDA_COMBINING = new RegExp(cp(0x627, 0x653), "g"); // ا + ٓ
const ALIF_MADDA = cp(0x622); // آ
const MARKS = new RegExp(`[${cp(0x64b)}-${cp(0x65f)}${cp(0x670)}${cp(0x6d6)}-${cp(0x6ed)}]`, "g"); // harakat, Quranic annotation marks
const ALIF_WASLA = new RegExp(cp(0x671), "g"); // ٱ
const TATWEEL = new RegExp(cp(0x640), "g"); // ـ
const BOM = new RegExp(`^${cp(0xfeff)}`);

// At-Tin (95) and Al-Qadr (97) carry the basmala with a shadda on the ba (بِّسْمِ) in this source.
const BASMALA_SHADDA = BASMALA.slice(0, 1) + SHADDA + BASMALA.slice(1);
const SURAHS_WITHOUT_SEPARATE_BASMALA = new Set([1, 9]);

// "سُورَةُ البَقَرَةِ" → "البقرة": a plain name for lists and headers, so they need no network either.
function plainName(name) {
  return (
    name
      .replace(/^سُورَةُ\s*/, "")
      // Alif + combining madda (آلِ عِمۡرَانَ) → the precomposed آ, before the marks are stripped.
      .replace(ALIF_MADDA_COMBINING, ALIF_MADDA)
      .replace(MARKS, "")
      .replace(ALIF_WASLA, "ا")
      .replace(TATWEEL, "")
      .trim()
  );
}
// The source spells these with the hamza under the alif (سبإ، النبإ); lists use the common spelling.
const NAME_OVERRIDES = { 34: "سبأ", 78: "النبأ" };

const response = await fetch("https://api.alquran.cloud/v1/quran/quran-uthmani");
if (!response.ok) throw new Error(`alquran.cloud answered ${response.status}`);
const { data } = await response.json();

const surahs = [];
const ayahs = [];
let stripped = 0;
for (const surah of data.surahs) {
  surahs.push([
    surah.number,
    NAME_OVERRIDES[surah.number] ?? plainName(surah.name),
    surah.revelationType === "Meccan" ? 1 : 0,
    surah.ayahs.length,
  ]);
  for (const ayah of surah.ayahs) {
    let text = ayah.text.replace(BOM, "");
    const prefix = [BASMALA, BASMALA_SHADDA].find((variant) => text.startsWith(variant));
    if (ayah.numberInSurah === 1 && !SURAHS_WITHOUT_SEPARATE_BASMALA.has(surah.number) && prefix) {
      text = text.slice(prefix.length).trim();
      stripped++;
    }
    // [surah, ayah, page, juz, hizbQuarter, sajda, text] — positional to keep the bundle small.
    ayahs.push([surah.number, ayah.numberInSurah, ayah.page, ayah.juz, ayah.hizbQuarter, ayah.sajda ? 1 : 0, text]);
  }
}

if (surahs.length !== 114 || ayahs.length !== 6236) throw new Error(`Unexpected counts: ${surahs.length} surahs, ${ayahs.length} ayahs`);
if (stripped !== 112) throw new Error(`Expected to separate 112 basmalas, separated ${stripped}`);
const pages = new Set(ayahs.map((a) => a[2]));
if (pages.size !== 604) throw new Error(`Expected 604 pages, got ${pages.size}`);

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ source: "api.alquran.cloud quran-uthmani", basmala: BASMALA, surahs, ayahs }));
console.log(
  `Wrote ${path.relative(root, out)}: ${ayahs.length} ayahs, ${pages.size} pages, ${(fs.statSync(out).size / 1024).toFixed(0)} KB`,
);
