const fs = require("fs");
const path = require("path");
const { withAndroidManifest, withDangerousMod, AndroidConfig } = require("expo/config-plugins");

/*
 * Static launcher shortcuts (long-press the app icon). Writes res/xml/shortcuts.xml, its Arabic labels
 * (res/values/shortcuts_strings.xml) and simple vector icons, and points the launcher activity at
 * them. Each shortcut opens an almanara:// link that Expo Router (src/app/+native-intent.tsx) routes.
 */

const BRAND = "#003e32";
const IVORY = "#fbf8f1";

const SHORTCUTS = [
  {
    id: "continue",
    uri: "almanara://continue",
    short: "أكمل القراءة",
    long: "أكمل القراءة من حيث توقفت",
    // Material "menu_book".
    glyph:
      "M21,5c-1.11,-0.35 -2.33,-0.5 -3.5,-0.5 -1.95,0 -4.05,0.4 -5.5,1.5 -1.45,-1.1 -3.55,-1.5 -5.5,-1.5S2.45,4.9 1,6v14.65c0,0.25 0.25,0.5 0.5,0.5 0.1,0 0.15,-0.05 0.25,-0.05C3.1,20.45 5.05,20 6.5,20c1.95,0 4.05,0.4 5.5,1.5 1.35,-0.85 3.8,-1.5 5.5,-1.5 1.65,0 3.35,0.3 4.75,1.05 0.1,0.05 0.15,0.05 0.25,0.05 0.25,0 0.5,-0.25 0.5,-0.5V6c-0.6,-0.45 -1.25,-0.75 -2,-1zM21,18.5c-1.1,-0.35 -2.3,-0.5 -3.5,-0.5 -1.7,0 -4.15,0.65 -5.5,1.5V8c1.35,-0.85 3.8,-1.5 5.5,-1.5 1.2,0 2.4,0.15 3.5,0.5v11.5z",
  },
  {
    id: "adhkar",
    uri: "almanara://adhkar",
    short: "أذكار",
    long: "الأذكار",
    // Material "favorite".
    glyph:
      "M12,21.35l-1.45,-1.32C5.4,15.36 2,12.28 2,8.5 2,5.42 4.42,3 7.5,3c1.74,0 3.41,0.81 4.5,2.09C13.09,3.81 14.76,3 16.5,3 19.58,3 22,5.42 22,8.5c0,3.78 -3.4,6.86 -8.55,11.54L12,21.35z",
  },
  {
    id: "qibla",
    uri: "almanara://qibla",
    short: "القبلة",
    long: "اتجاه القبلة",
    // Material "explore".
    glyph:
      "M12,10.9c-0.61,0 -1.1,0.49 -1.1,1.1s0.49,1.1 1.1,1.1c0.61,0 1.1,-0.49 1.1,-1.1s-0.49,-1.1 -1.1,-1.1zM12,2C6.48,2 2,6.48 2,12s4.48,10 10,10 10,-4.48 10,-10S17.52,2 12,2zM14.19,14.19L6,18l3.81,-8.19L18,6l-3.81,8.19z",
  },
  {
    id: "radio",
    uri: "almanara://radio",
    short: "الراديو",
    long: "إذاعة القرآن الكريم",
    // Material "radio".
    glyph:
      "M3.24,6.15C2.51,6.43 2,7.17 2,8v12c0,1.1 0.89,2 2,2h16c1.11,0 2,-0.9 2,-2V8c0,-1.11 -0.89,-2 -2,-2H8.3l8.26,-3.34L15.88,1 3.24,6.15zM7,20c-1.66,0 -3,-1.34 -3,-3s1.34,-3 3,-3 3,1.34 3,3 -1.34,3 -3,3zM20,12h-2v-2h-2v2H4V8h16v4z",
  },
];

const escapeXml = (text) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "\\'");

function shortcutsXml(pkg) {
  const items = SHORTCUTS.map(
    (s) => `  <shortcut
    android:shortcutId="${s.id}"
    android:enabled="true"
    android:icon="@drawable/shortcut_${s.id}"
    android:shortcutShortLabel="@string/shortcut_${s.id}_short"
    android:shortcutLongLabel="@string/shortcut_${s.id}_long">
    <intent
      android:action="android.intent.action.VIEW"
      android:data="${s.uri}"
      android:targetPackage="${pkg}"
      android:targetClass="${pkg}.MainActivity" />
  </shortcut>`,
  ).join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>\n<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">\n${items}\n</shortcuts>\n`;
}

function stringsXml() {
  const items = SHORTCUTS.flatMap((s) => [
    `  <string name="shortcut_${s.id}_short">${escapeXml(s.short)}</string>`,
    `  <string name="shortcut_${s.id}_long">${escapeXml(s.long)}</string>`,
  ]).join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${items}\n</resources>\n`;
}

// A brand-green disc with the glyph in ivory, sized like a launcher shortcut icon.
function iconXml(glyph) {
  return `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
  android:width="48dp"
  android:height="48dp"
  android:viewportWidth="24"
  android:viewportHeight="24">
  <path android:fillColor="${BRAND}" android:pathData="M12,0A12,12 0,1 1,12 24A12,12 0,1 1,12 0z" />
  <group android:pivotX="12" android:pivotY="12" android:scaleX="0.55" android:scaleY="0.55">
    <path android:fillColor="${IVORY}" android:pathData="${glyph}" />
  </group>
</vector>
`;
}

function isLauncherActivity(activity) {
  return (activity["intent-filter"] ?? []).some(
    (filter) =>
      (filter.action ?? []).some((a) => a.$["android:name"] === "android.intent.action.MAIN") &&
      (filter.category ?? []).some((c) => c.$["android:name"] === "android.intent.category.LAUNCHER"),
  );
}

const withShortcutsMetaData = (config) =>
  withAndroidManifest(config, (mod) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    const activity = (app.activity ?? []).find(isLauncherActivity);
    if (!activity) throw new Error("withAppShortcuts: no MAIN/LAUNCHER activity in AndroidManifest.xml");
    const meta = { $: { "android:name": "android.app.shortcuts", "android:resource": "@xml/shortcuts" } };
    activity["meta-data"] = (activity["meta-data"] ?? []).filter((item) => item.$["android:name"] !== "android.app.shortcuts");
    activity["meta-data"].push(meta);
    return mod;
  });

const withShortcutResources = (config) =>
  withDangerousMod(config, [
    "android",
    (mod) => {
      const pkg = mod.android?.package;
      if (!pkg) throw new Error("withAppShortcuts: expo.android.package is required");
      const res = path.join(mod.modRequest.platformProjectRoot, "app", "src", "main", "res");
      const write = (dir, file, content) => {
        fs.mkdirSync(path.join(res, dir), { recursive: true });
        fs.writeFileSync(path.join(res, dir, file), content, "utf8");
      };
      write("xml", "shortcuts.xml", shortcutsXml(pkg));
      write("values", "shortcuts_strings.xml", stringsXml());
      for (const s of SHORTCUTS) write("drawable", `shortcut_${s.id}.xml`, iconXml(s.glyph));
      return mod;
    },
  ]);

module.exports = function withAppShortcuts(config) {
  return withShortcutResources(withShortcutsMetaData(config));
};
module.exports.SHORTCUTS = SHORTCUTS;
module.exports.shortcutsXml = shortcutsXml;
module.exports.stringsXml = stringsXml;
