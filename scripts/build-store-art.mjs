// Builds the Google Play store art in store/play/ with headless Chrome:
//   feature-graphic.png (1024×500), icon-512.png (512×512), and screenshot-*.png (1080×1920, 9:16) — each
//   phone screenshot from store/screens/ with its status and navigation bars cropped away, on the brand's
//   emerald ground under an Arabic caption.
// Run: node scripts/build-store-art.mjs   (needs Google Chrome installed)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "store/play");
const workDir = path.join(root, "store/.work");
const url = (file) => pathToFileURL(path.join(root, file)).href;

const CHROME = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].find((candidate) => candidate && fs.existsSync(candidate));
if (!CHROME) throw new Error("Google Chrome not found (set CHROME_PATH)");

const FONT = (weight, file) =>
  `@font-face { font-family: Plex; font-weight: ${weight}; src: url("${url(`node_modules/@expo-google-fonts/ibm-plex-sans-arabic/${file}`)}"); }`;
const BASE_CSS = `
  ${FONT(400, "400Regular/IBMPlexSansArabic_400Regular.ttf")}
  ${FONT(600, "600SemiBold/IBMPlexSansArabic_600SemiBold.ttf")}
  ${FONT(700, "700Bold/IBMPlexSansArabic_700Bold.ttf")}
  * { margin: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; }
  body { font-family: Plex, sans-serif; direction: rtl; -webkit-font-smoothing: antialiased; }
`;

/** Status bar (top) and navigation bar (bottom) of the 720×1600 captures, cropped off. */
const CROP_TOP = 52;
const CROP_BOTTOM = 92;

const SCREENS = [
  ["01-home", "كل يومك في مكان واحد", "المصحف والمواقيت والأذكار والأحاديث"],
  ["02-mushaf", "مصحف المدينة كما في المطبوع", "١٥ سطرًا ثابتة مع ألوان التجويد"],
  ["03-prayer", "مواقيت دقيقة وأذان كامل", "بصوت المؤذن الذي تختاره حتى والتطبيق مغلق"],
  ["04-adhkar", "أذكار الصباح والمساء", "من حصن المسلم مع العدّاد والاستماع"],
  ["05-tasbih", "سبحة إلكترونية", "بأذكارك وعددك وصوت التكة"],
  ["06-radio", "إذاعة القرآن الكريم", "بث مباشر وتسجيلات الإذاعة"],
  ["07-reader-settings", "اقرأ كما تحب", "الروايات وألوان الصفحة وحجم الخط"],
  ["08-kids", "حديقة القرآن للأطفال", "رحلة في السور وألعاب وقصص وجوائز"],
];

function render(name, width, height, html) {
  const file = path.join(workDir, `${name}.html`);
  fs.writeFileSync(file, `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}</style></head><body>${html}</body></html>`);
  const out = path.join(outDir, `${name}.png`);
  execFileSync(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--allow-file-access-from-files",
    "--virtual-time-budget=3000",
    `--window-size=${width},${height}`,
    `--screenshot=${out}`,
    pathToFileURL(file).href,
  ], { stdio: "ignore" });
  console.log(`${path.relative(root, out)} (${width}×${height}, ${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
}

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(workDir, { recursive: true });

// ── Phone screenshots, 1080×1920 ──
const PHONE_W = 660;
const SHOT_H = Math.round((PHONE_W / 720) * (1600 - CROP_TOP - CROP_BOTTOM));
for (const [name, title, subtitle] of SCREENS) {
  render(`screenshot-${name}`, 1080, 1920, `
    <div style="position:absolute;inset:0;background:linear-gradient(160deg,#00473a 0%,#012a22 70%);"></div>
    <div style="position:absolute;width:900px;height:900px;border-radius:50%;background:radial-gradient(circle,rgba(205,162,62,.28),transparent 65%);top:-380px;left:90px;"></div>
    <div style="position:absolute;top:96px;left:0;right:0;text-align:center;padding:0 60px;">
      <div style="color:#fff;font-weight:700;font-size:70px;line-height:1.35;">${title}</div>
      <div style="color:#e8d7a6;font-weight:400;font-size:36px;margin-top:14px;">${subtitle}</div>
    </div>
    <div style="position:absolute;top:400px;left:${(1080 - PHONE_W - 28) / 2}px;width:${PHONE_W + 28}px;height:${SHOT_H + 28}px;border-radius:64px;background:#0b1512;padding:14px;box-shadow:0 40px 90px -30px rgba(0,0,0,.65), 0 0 0 2px rgba(232,215,166,.35);">
      <div style="width:${PHONE_W}px;height:${SHOT_H}px;border-radius:52px;overflow:hidden;background:#fff;">
        <img src="${url(`store/screens/${name}.jpg`)}" style="display:block;width:${PHONE_W}px;margin-top:-${Math.round((PHONE_W / 720) * CROP_TOP)}px;">
      </div>
    </div>`);
}

// ── Feature graphic, 1024×500 ──
render("feature-graphic", 1024, 500, `
  <img src="${url("assets/images/scenes/quran-terrace.webp")}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">
  <div style="position:absolute;inset:0;background:linear-gradient(270deg,rgba(1,42,34,.96) 0%,rgba(1,42,34,.88) 42%,rgba(1,42,34,.25) 78%,rgba(1,42,34,.1) 100%);"></div>
  <div style="position:absolute;top:0;bottom:0;right:64px;display:flex;align-items:center;gap:34px;">
    <div style="width:190px;height:190px;border-radius:50%;background:#fbf8f1;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 6px rgba(205,162,62,.55), 0 24px 50px -20px rgba(0,0,0,.6);">
      <img src="${url("assets/images/brand/logo.png")}" style="width:128px;height:128px;object-fit:contain;">
    </div>
    <div>
      <div style="color:#fff;font-weight:700;font-size:92px;line-height:1.1;">المنارة</div>
      <div style="color:#e8d7a6;font-weight:600;font-size:30px;margin-top:10px;">قرآن · أذان · أذكار · أحاديث</div>
      <div style="color:rgba(255,255,255,.82);font-weight:400;font-size:22px;margin-top:14px;">علمٌ ينير قلبك، ومعرفةٌ ترافق يومك</div>
    </div>
  </div>`);

// ── Store icon, 512×512 ──
render("icon-512", 512, 512, `
  <img src="${url("assets/images/brand/icon.png")}" style="position:absolute;inset:0;width:512px;height:512px;object-fit:cover;">`);

fs.rmSync(workDir, { recursive: true, force: true });
