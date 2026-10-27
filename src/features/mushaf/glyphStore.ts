import * as Font from "expo-font";
import { Directory, File, Paths } from "expo-file-system";
import { useEffect, useSyncExternalStore } from "react";

import { buildGlyphLines, glyphFontUrl, glyphVersesUrl, type GlyphLine, type GlyphRawVerse } from "@/core/quran/glyphLines";

import { TOTAL_PAGES } from "./mushaf";

/*
 * The printed pages' data on the device: each Hafs page's QCF V1 font (quran.com's TTF) and its built
 * lines, fetched the first time the page is shown and kept in documents/mushaf-glyphs, so a page seen
 * once draws offline. The neighbours are fetched along with it, so turning the page is instant.
 */

export interface GlyphPage {
  /** The font family the page's glyphs are drawn in. */
  family: string;
  lines: GlyphLine[];
}

export type GlyphPageState = { status: "loading" } | { status: "ready"; page: GlyphPage } | { status: "failed" };

const dir = new Directory(Paths.document, "mushaf-glyphs");
/** quran.com's page fonts are 40–160 KB; anything this small is an error page, not a font. */
const MIN_FONT_BYTES = 8_000;

const states = new Map<number, GlyphPageState>();
const loading = new Map<number, Promise<void>>();
const listeners = new Set<() => void>();
let version = 0;

function set(page: number, state: GlyphPageState) {
  states.set(page, state);
  version += 1;
  listeners.forEach((listener) => listener());
}

export function glyphFamily(page: number): string {
  return `QCF1_P${page}`;
}

async function fetchVerses(page: number): Promise<GlyphRawVerse[]> {
  const verses: GlyphRawVerse[] = [];
  for (let part = 1; ; part += 1) {
    const response = await fetch(glyphVersesUrl(page, part));
    if (!response.ok) throw new Error(`quran.com page ${page}: ${response.status}`);
    const data = (await response.json()) as { verses: GlyphRawVerse[]; pagination: { next_page: number | null } };
    verses.push(...data.verses);
    if (!data.pagination.next_page) return verses;
  }
}

/** The page's lines from the device, or built from quran.com (the page and the one before it) and saved. */
async function linesFor(page: number): Promise<GlyphLine[]> {
  const file = new File(dir, `p${page}.json`);
  if (file.exists) {
    try {
      return JSON.parse(await file.text()) as GlyphLine[];
    } catch {
      file.delete();
    }
  }
  const [previous, current] = await Promise.all([page > 1 ? fetchVerses(page - 1) : [], fetchVerses(page)]);
  const lines = buildGlyphLines(page, [...previous, ...current]);
  if (!lines) throw new Error(`page ${page}: lines don't add up`);
  file.write(JSON.stringify(lines));
  return lines;
}

/** The page's font file, downloaded under a temporary name so an interrupted one never passes for a font. */
async function fontFor(page: number): Promise<File> {
  const file = new File(dir, `p${page}.ttf`);
  if (file.exists && (file.size ?? 0) >= MIN_FONT_BYTES) return file;
  const part = new File(dir, `p${page}.part`);
  if (part.exists) part.delete();
  try {
    const downloaded = await File.downloadFileAsync(glyphFontUrl(page), part);
    if ((downloaded.size ?? 0) < MIN_FONT_BYTES) throw new Error("not a font");
    if (file.exists) file.delete();
    part.rename(file.name);
    return new File(dir, `p${page}.ttf`);
  } catch (error) {
    if (part.exists) part.delete();
    throw error;
  }
}

function load(page: number): Promise<void> {
  const current = states.get(page);
  if (current?.status === "ready") return Promise.resolve();
  let request = loading.get(page);
  if (!request) {
    if (current?.status !== "loading") set(page, { status: "loading" });
    request = (async () => {
      if (!dir.exists) dir.create({ intermediates: true });
      const [lines, font] = await Promise.all([linesFor(page), fontFor(page)]);
      const family = glyphFamily(page);
      if (!Font.isLoaded(family)) await Font.loadAsync({ [family]: { uri: font.uri } });
      set(page, { status: "ready", page: { family, lines } });
    })()
      .catch(() => set(page, { status: "failed" }))
      // A failed page is tried again the next time it is shown (the network may be back).
      .finally(() => loading.delete(page));
    loading.set(page, request);
  }
  return request;
}

/**
 * The printed page, loading it (and its neighbours) when `enabled`. Ready pages come back synchronously
 * from memory, so a page turned to after its prefetch draws in print at once.
 */
export function useGlyphPage(page: number, enabled: boolean): GlyphPageState | null {
  useEffect(() => {
    if (!enabled) return;
    // Once per showing of the page: a failure is tried again the next time it comes on screen, not in a loop.
    void load(page);
    for (const neighbour of [page + 1, page - 1]) {
      if (neighbour >= 1 && neighbour <= TOTAL_PAGES && !states.has(neighbour)) void load(neighbour);
    }
  }, [page, enabled]);
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => version,
  );
  if (!enabled) return null;
  return states.get(page) ?? { status: "loading" };
}
