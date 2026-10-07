// Builds src/data/mushaf-index.json from src/data/mushaf-hafs.json: where every page, juz and hizb
// begins (first ayah) and the first page of every juz and hizb. Small (a few KB), so the Quran index, the
// khatma and the memorization plan know the mushaf's divisions without loading the 1.4 MB text.
// Usage: npm run build:mushaf (runs after build-mushaf.mjs), or node scripts/build-mushaf-index.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { ayahs } = JSON.parse(fs.readFileSync(path.join(root, "src/data/mushaf-hafs.json"), "utf8"));

const pageStarts = [];
const juzStarts = [];
const hizbStarts = [];
const juzPages = [];
const hizbPages = [];
for (const [surah, ayah, page, juz, hizbQuarter] of ayahs) {
  // A hizb is four quarters; it starts where its first quarter does.
  const hizb = Math.ceil(hizbQuarter / 4);
  if (!pageStarts[page - 1]) pageStarts[page - 1] = [surah, ayah];
  if (!juzStarts[juz - 1]) {
    juzStarts[juz - 1] = [surah, ayah];
    juzPages[juz - 1] = page;
  }
  if (!hizbStarts[hizb - 1]) {
    hizbStarts[hizb - 1] = [surah, ayah];
    hizbPages[hizb - 1] = page;
  }
}
if (pageStarts.length !== 604 || juzStarts.length !== 30 || hizbStarts.length !== 60) {
  throw new Error(`Unexpected divisions: ${pageStarts.length} pages, ${juzStarts.length} juz, ${hizbStarts.length} hizb`);
}

const out = path.join(root, "src/data/mushaf-index.json");
fs.writeFileSync(out, JSON.stringify({ pageStarts, juzStarts, hizbStarts, juzPages, hizbPages }));
console.log(`Wrote ${path.relative(root, out)}: ${(fs.statSync(out).size / 1024).toFixed(1)} KB`);
