// Builds src/data/surah-names.json: the 114 surahs' index rows from the bundled mushaf, so Home, widgets
// and surah lists can name a surah without evaluating the 1.4 MB mushaf-hafs.json.
// Each row is [number, name, meccan, ayahCount, startPage, juzStart] (the SurahInfo of src/features/mushaf/mushaf.ts).
// Usage: node scripts/build-surah-names.mjs (run again after npm run build:mushaf)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "src/data/mushaf-hafs.json");
const out = path.join(root, "src/data/surah-names.json");

const data = JSON.parse(fs.readFileSync(source, "utf8"));

// RawAyah: [surah, ayah, page, juz, hizbQuarter, sajda, text]
const firstAyah = new Map();
for (const [surah, ayah, page, juz] of data.ayahs) if (ayah === 1 && !firstAyah.has(surah)) firstAyah.set(surah, { page, juz });

const rows = data.surahs.map(([number, name, meccan, ayahCount]) => [
  number,
  name,
  meccan,
  ayahCount,
  firstAyah.get(number)?.page ?? 1,
  firstAyah.get(number)?.juz ?? 1,
]);

if (rows.length !== 114) throw new Error(`Expected 114 surahs, got ${rows.length}`);

// One surah per line: small, and diffs stay readable.
fs.writeFileSync(out, `[\n${rows.map((row) => `  ${JSON.stringify(row)}`).join(",\n")}\n]\n`);
console.log(`Wrote ${rows.length} surahs to ${path.relative(root, out)}`);
