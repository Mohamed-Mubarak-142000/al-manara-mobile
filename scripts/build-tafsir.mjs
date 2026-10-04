// Builds src/data/tafsir-muyassar.json: Tafsir al-Muyassar for all 6236 ayahs (the website's tafsir,
// api.alquran.cloud edition ar.muyassar), bundled so the tafsir works offline from the first launch.
// Usage: npm run build:tafsir
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "src/data/tafsir-muyassar.json");
const BOM = new RegExp(`^${String.fromCodePoint(0xfeff)}`);

const response = await fetch("https://api.alquran.cloud/v1/quran/ar.muyassar");
if (!response.ok) throw new Error(`alquran.cloud answered ${response.status}`);
const { data } = await response.json();

// One string per ayah, in mushaf order: index = global ayah number - 1 (the same order as mushaf-hafs.json).
const texts = data.surahs.flatMap((surah) => surah.ayahs.map((ayah) => ayah.text.replace(BOM, "").trim()));
if (texts.length !== 6236) throw new Error(`Expected 6236 ayahs, got ${texts.length}`);
if (texts.some((text) => !text)) throw new Error("Some ayahs have no tafsir text");

fs.writeFileSync(out, JSON.stringify({ source: "api.alquran.cloud ar.muyassar", texts }));
console.log(`Wrote ${path.relative(root, out)}: ${texts.length} ayahs, ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
