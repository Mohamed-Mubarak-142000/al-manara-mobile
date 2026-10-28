import * as Font from "expo-font";
import { Directory, File, Paths } from "expo-file-system";
import { useEffect, useSyncExternalStore } from "react";

import { themeTajweedFont } from "@/core/quran/fontPalette";
import {
  buildGlyphLines,
  glyphFontUrl,
  glyphVersesUrl,
  type GlyphEdition,
  type GlyphLine,
  type GlyphRawVerse,
} from "@/core/quran/glyphLines";

import { TOTAL_PAGES } from "./mushaf";
import { READER_THEMES, type ReaderTheme } from "./readerPrefs";

/*
 * The printed pages' data on the device: each Hafs page's font (quran.com's TTF: QCF V1, or the
 * coloured V4 for tajweed) and its built lines, fetched the first time the page is shown and kept in
 * documents/mushaf-glyphs, so a page seen once draws offline. The neighbours are fetched along with it,
 * so turning the page is instant. The tajweed font is kept once and copied per reader theme, coloured
 * for it (fontPalette).
 */

export interface GlyphPage {
  /** The font family the page's glyphs are drawn in. */
  family: string;
  lines: GlyphLine[];
}

export type GlyphPageState = { status: "loading" } | { status: "ready"; page: GlyphPage } | { status: "failed" };

const dir = new Directory(Paths.document, "mushaf-glyphs");
/** quran.com's page fonts are 40–300 KB; anything this small is an error page, not a font. */
const MIN_FONT_BYTES = 8_000;
const DARK_THEMES: readonly ReaderTheme[] = ["night", "dusk"];

const states = new Map<string, GlyphPageState>();
const loading = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();
let version = 0;

/** The files of a page in an edition: V1 keeps the names it always had on devices. */
const fileBase = (page: number, edition: GlyphEdition) => (edition === "v1" ? `p${page}` : `t${page}`);
/** The V1 font draws in the text colour; the tajweed one has its colours in the font, so one per theme. */
const keyOf = (page: number, edition: GlyphEdition, theme: ReaderTheme) => (edition === "v1" ? `v1:${page}` : `t:${theme}:${page}`);

function set(key: string, state: GlyphPageState) {
  states.set(key, state);
  version += 1;
  listeners.forEach((listener) => listener());
}

function familyOf(page: number, edition: GlyphEdition, theme: ReaderTheme): string {
  return edition === "v1" ? `QCF1_P${page}` : `QCF4_${theme}_P${page}`;
}

async function fetchVerses(page: number, edition: GlyphEdition): Promise<GlyphRawVerse[]> {
  const verses: GlyphRawVerse[] = [];
  for (let part = 1; ; part += 1) {
    const response = await fetch(glyphVersesUrl(page, part, edition));
    if (!response.ok) throw new Error(`quran.com page ${page}: ${response.status}`);
    const data = (await response.json()) as { verses: GlyphRawVerse[]; pagination: { next_page: number | null } };
    verses.push(...data.verses);
    if (!data.pagination.next_page) return verses;
  }
}

/** The page's lines from the device, or built from quran.com (the page and the one before it) and saved. */
async function linesFor(page: number, edition: GlyphEdition): Promise<GlyphLine[]> {
  const file = new File(dir, `${fileBase(page, edition)}.json`);
  if (file.exists) {
    try {
      return JSON.parse(await file.text()) as GlyphLine[];
    } catch {
      file.delete();
    }
  }
  const [previous, current] = await Promise.all([page > 1 ? fetchVerses(page - 1, edition) : [], fetchVerses(page, edition)]);
  const lines = buildGlyphLines(page, [...previous, ...current], edition);
  if (!lines) throw new Error(`page ${page}: lines don't add up`);
  file.write(JSON.stringify(lines));
  return lines;
}

/** The page's font file, downloaded under a temporary name so an interrupted one never passes for a font. */
async function downloadFont(page: number, edition: GlyphEdition): Promise<File> {
  const name = `${fileBase(page, edition)}.ttf`;
  const file = new File(dir, name);
  if (file.exists && (file.size ?? 0) >= MIN_FONT_BYTES) return file;
  const part = new File(dir, `${fileBase(page, edition)}.part`);
  if (part.exists) part.delete();
  try {
    const downloaded = await File.downloadFileAsync(glyphFontUrl(page, edition), part);
    if ((downloaded.size ?? 0) < MIN_FONT_BYTES) throw new Error("not a font");
    if (file.exists) file.delete();
    part.rename(name);
    return new File(dir, name);
  } catch (error) {
    if (part.exists) part.delete();
    throw error;
  }
}

/** The font the page is drawn with: the download itself, or for tajweed its copy coloured for the theme. */
async function fontFor(page: number, edition: GlyphEdition, theme: ReaderTheme): Promise<File> {
  const original = await downloadFont(page, edition);
  if (edition === "v1") return original;
  const themed = new File(dir, `t${page}-${theme}.ttf`);
  if (themed.exists && (themed.size ?? 0) >= MIN_FONT_BYTES) return themed;
  const colours = themeTajweedFont(await original.bytes(), READER_THEMES[theme].ink, DARK_THEMES.includes(theme));
  if (themed.exists) themed.delete();
  themed.write(colours);
  return themed;
}

function load(page: number, edition: GlyphEdition, theme: ReaderTheme): Promise<void> {
  const key = keyOf(page, edition, theme);
  const current = states.get(key);
  if (current?.status === "ready") return Promise.resolve();
  let request = loading.get(key);
  if (!request) {
    if (current?.status !== "loading") set(key, { status: "loading" });
    request = (async () => {
      if (!dir.exists) dir.create({ intermediates: true });
      const [lines, font] = await Promise.all([linesFor(page, edition), fontFor(page, edition, theme)]);
      const family = familyOf(page, edition, theme);
      if (!Font.isLoaded(family)) await Font.loadAsync({ [family]: { uri: font.uri } });
      set(key, { status: "ready", page: { family, lines } });
    })()
      .catch(() => set(key, { status: "failed" }))
      // A failed page is tried again the next time it is shown (the network may be back).
      .finally(() => loading.delete(key));
    loading.set(key, request);
  }
  return request;
}

/**
 * The printed page, loading it (and its neighbours) when `enabled`. Ready pages come back synchronously
 * from memory, so a page turned to after its prefetch draws in print at once.
 */
export function useGlyphPage(page: number, edition: GlyphEdition, theme: ReaderTheme, enabled: boolean): GlyphPageState | null {
  useEffect(() => {
    if (!enabled) return;
    // Once per showing of the page: a failure is tried again the next time it comes on screen, not in a loop.
    void load(page, edition, theme);
    for (const neighbour of [page + 1, page - 1]) {
      if (neighbour >= 1 && neighbour <= TOTAL_PAGES && !states.has(keyOf(neighbour, edition, theme))) void load(neighbour, edition, theme);
    }
  }, [page, edition, theme, enabled]);
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => version,
  );
  if (!enabled) return null;
  return states.get(keyOf(page, edition, theme)) ?? { status: "loading" };
}
