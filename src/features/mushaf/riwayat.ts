import * as Font from "expo-font";
import { Directory, File, Paths } from "expo-file-system";
import { useEffect, useSyncExternalStore } from "react";

import type { MushafAyah } from "./mushaf";

/**
 * The website's RIWAYAT (features/quran/riwayat.ts). Hafs is the bundled mushaf; the other seven are
 * the King Fahd Complex mushafs, downloaded once from the website (/api/v1/riwayat/{key}) and kept on
 * the device, each drawn in its own KFGQPC typeface (bundled, loaded on first use).
 */
export const RIWAYAT = [
  { key: "hafs", label: "حفص عن عاصم", short: "حفص" },
  { key: "shouba", label: "شعبة عن عاصم", short: "شعبة" },
  { key: "warsh", label: "ورش عن نافع", short: "ورش" },
  { key: "qaloon", label: "قالون عن نافع", short: "قالون" },
  { key: "bazzi", label: "البزّي عن ابن كثير", short: "البزّي" },
  { key: "qumbul", label: "قنبل عن ابن كثير", short: "قنبل" },
  { key: "doori", label: "الدوري عن أبي عمرو", short: "الدوري" },
  { key: "soosi", label: "السوسي عن أبي عمرو", short: "السوسي" },
] as const;

export type RiwayaKey = (typeof RIWAYAT)[number]["key"];
export type OtherRiwayaKey = Exclude<RiwayaKey, "hafs">;

const FONT_FILES: Record<OtherRiwayaKey, number> = {
  shouba: require("@/assets/fonts/riwayat/shouba.ttf"),
  warsh: require("@/assets/fonts/riwayat/warsh.ttf"),
  qaloon: require("@/assets/fonts/riwayat/qaloon.ttf"),
  bazzi: require("@/assets/fonts/riwayat/bazzi.ttf"),
  qumbul: require("@/assets/fonts/riwayat/qumbul.ttf"),
  doori: require("@/assets/fonts/riwayat/doori.ttf"),
  soosi: require("@/assets/fonts/riwayat/soosi.ttf"),
};

export function riwayaFontFamily(key: OtherRiwayaKey): string {
  return `Riwaya_${key}`;
}

/** [surah, ayah, page, juz, text] in the riwaya's own numbering and pages. */
type Row = [number, number, number, number, string];

export interface RiwayaMushaf {
  basmala: string;
  pages: MushafAyah[][];
}

export type RiwayaState =
  | { status: "opening" }
  | { status: "missing" }
  | { status: "downloading" }
  | { status: "ready"; mushaf: RiwayaMushaf }
  | { status: "failed" };

const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
const dir = new Directory(Paths.document, "riwayat");
const states = new Map<OtherRiwayaKey, RiwayaState>();
const listeners = new Set<() => void>();
let version = 0;

function set(key: OtherRiwayaKey, next: RiwayaState) {
  states.set(key, next);
  version += 1;
  listeners.forEach((listener) => listener());
}

function fileFor(key: OtherRiwayaKey): File {
  return new File(dir, `${key}.json`);
}

function parse(raw: string): RiwayaMushaf {
  const data = JSON.parse(raw) as { basmala: string; ayahs: Row[] };
  const pages: MushafAyah[][] = Array.from({ length: 604 }, () => []);
  for (const [surah, ayah, page, juz, text] of data.ayahs) {
    // No hizb data or global numbering in these mushafs; the id only has to be unique.
    pages[page - 1]?.push({ id: surah * 1000 + ayah, surah, ayah, page, juz, hizbQuarter: 0, sajda: false, text });
  }
  return { basmala: data.basmala, pages };
}

/** Reads a downloaded riwaya (and loads its font) into memory, or reports it missing. */
async function open(key: OtherRiwayaKey) {
  const file = fileFor(key);
  if (!file.exists) {
    set(key, { status: "missing" });
    return;
  }
  try {
    const [raw] = await Promise.all([file.text(), Font.loadAsync({ [riwayaFontFamily(key)]: FONT_FILES[key] })]);
    set(key, { status: "ready", mushaf: parse(raw) });
  } catch {
    set(key, { status: "failed" });
  }
}

export const riwayat = {
  async download(key: OtherRiwayaKey) {
    if (!SITE_URL) {
      set(key, { status: "failed" });
      return;
    }
    set(key, { status: "downloading" });
    try {
      if (!dir.exists) dir.create({ intermediates: true });
      const file = fileFor(key);
      if (file.exists) file.delete();
      await File.downloadFileAsync(`${SITE_URL}/api/v1/riwayat/${key}`, file);
      await open(key);
    } catch {
      set(key, { status: "failed" });
    }
  },
  remove(key: OtherRiwayaKey) {
    const file = fileFor(key);
    if (file.exists) file.delete();
    set(key, { status: "missing" });
  },
};

/** The state of one riwaya; a downloaded one is opened (read + font) on first use. */
export function useRiwaya(key: RiwayaKey): RiwayaState | null {
  useEffect(() => {
    if (key === "hafs" || states.has(key)) return;
    set(key, { status: "opening" });
    open(key);
  }, [key]);
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => version,
  );
  if (key === "hafs") return null;
  return states.get(key) ?? { status: "opening" };
}

export function isRiwayaDownloaded(key: OtherRiwayaKey): boolean {
  return fileFor(key).exists;
}
