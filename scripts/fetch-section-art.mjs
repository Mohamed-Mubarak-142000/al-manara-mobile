// Downloads the section artwork (assets/images/sections/*.png): Microsoft's Fluent Emoji in their 3D style
// (https://github.com/microsoft/fluentui-emoji, MIT licence — see assets/images/sections/LICENSE.md).
// Run: node scripts/fetch-section-art.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "assets/images/sections");
const BASE = "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets";

/** Our file name → the emoji's folder in the Fluent repo. */
const ART = {
  quran: "Open book",
  listen: "Headphone",
  radio: "Radio",
  hadith: "Scroll",
  nawawi: "Notebook with decorative cover",
  ibtihalat: "Crescent moon",
  tawasheeh: "Microphone",
  duas: "Palms up together",
  "khatm-dua": "Folded hands",
  ruqyah: "Shield",
  adhan: "Mosque",
  prayer: "Mantelpiece clock",
  calendar: "Spiral calendar",
  adhkar: "Sparkles",
  tasbih: "Prayer beads",
  stories: "Clapper board",
  journey: "Trophy",
  plan: "Calendar",
  khatma: "Bookmark",
  tasmee: "Studio microphone",
  exams: "Graduation cap",
  downloads: "Inbox tray",
  kids: "Deciduous tree",
  qibla: "Kaaba",
  home: "House",
  sections: "Card index dividers",
  settings: "Gear",
  account: "Bust in silhouette",
  about: "Information",
  share: "Megaphone",
  support: "Red heart",
  search: "Magnifying glass tilted left",
  privacy: "Locked",
  terms: "Page facing up",
  email: "E-mail",
  website: "Globe with meridians",
  certificates: "Sports medal",
};

const snake = (name) => name.toLowerCase().replace(/\s+/g, "_");

async function fetchArt(folder) {
  // Emoji with skin tones keep their neutral one under Default/.
  const urls = [
    `${BASE}/${encodeURIComponent(folder)}/3D/${snake(folder)}_3d.png`,
    `${BASE}/${encodeURIComponent(folder)}/Default/3D/${snake(folder)}_3d_default.png`,
  ];
  for (const url of urls) {
    const response = await fetch(url);
    if (response.ok) return Buffer.from(await response.arrayBuffer());
  }
  throw new Error(`No 3D art for "${folder}"`);
}

fs.mkdirSync(outDir, { recursive: true });
for (const [name, folder] of Object.entries(ART)) {
  const file = path.join(outDir, `${name}.png`);
  fs.writeFileSync(file, await fetchArt(folder));
  console.log(`${name}.png ← ${folder} (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);
}
