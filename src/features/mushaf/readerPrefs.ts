import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";

import type { RiwayaKey } from "./riwayat";

export type ReaderTheme = "light" | "sepia" | "night" | "emerald" | "dusk";

/** The website reader's three themes (MushafReader.tsx THEMES), as plain values. */
export const READER_THEMES: Record<
  ReaderTheme,
  { label: string; shell: string; page: string; ink: string; frame: string; accent: string }
> = {
  light: { label: "فاتح", shell: "#fbf8f1", page: "#fffdf7", ink: "#1b2a24", frame: "#f1e7cc", accent: "#9c7a26" },
  sepia: { label: "دافئ", shell: "#eadcb9", page: "#f6ead0", ink: "#3b2f1b", frame: "#e2cf9e", accent: "#8a6a1f" },
  night: { label: "ليلي", shell: "#06110d", page: "#0d1d18", ink: "#ebe5d1", frame: "#132b24", accent: "#d9b35a" },
  // Supporter pack themes (cosmetic only).
  emerald: { label: "زمردي", shell: "#e3eee9", page: "#f2f8f5", ink: "#12302a", frame: "#cfe3da", accent: "#005544" },
  dusk: { label: "غسقي", shell: "#16121f", page: "#1e1a2b", ink: "#ece6f5", frame: "#2b2540", accent: "#d9b35a" },
};

/** Page colours that come with the supporter pack. */
export const SUPPORTER_THEMES: readonly ReaderTheme[] = ["emerald", "dusk"];

export const FONT_SIZES = [19, 22, 25, 28, 32] as const;

export interface ReaderPrefs {
  theme: ReaderTheme;
  fontStep: number;
  /** On by default, like the website reader. */
  tajweed: boolean;
  riwaya: RiwayaKey;
}

export interface Bookmark {
  surah: number;
  ayah: number;
  page: number;
  savedAt: number;
}

export interface LastRead {
  page: number;
  surah: number;
  ayah: number;
  at: number;
}

interface ReaderState {
  prefs: ReaderPrefs;
  bookmarks: Bookmark[];
  lastRead: LastRead | null;
}

const KEY = "al-manara:reader:v1";
const DEFAULTS: ReaderState = { prefs: { theme: "light", fontStep: 1, tajweed: true, riwaya: "hafs" }, bookmarks: [], lastRead: null };

let cached: ReaderState | null = null;
const listeners = new Set<() => void>();

function read(): ReaderState {
  if (cached) return cached;
  try {
    const saved = JSON.parse(Storage.getItemSync(KEY) ?? "null") as Partial<ReaderState> | null;
    cached = { ...DEFAULTS, ...saved, prefs: { ...DEFAULTS.prefs, ...saved?.prefs } };
  } catch {
    cached = DEFAULTS;
  }
  return cached;
}

function write(patch: Partial<ReaderState>) {
  cached = { ...read(), ...patch };
  try {
    Storage.setItemSync(KEY, JSON.stringify(cached));
  } catch {
    // Keep the in-memory state.
  }
  listeners.forEach((notify) => notify());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useReaderState(): ReaderState {
  return useSyncExternalStore(subscribe, read);
}

export const reader = {
  current(): ReaderState {
    return read();
  },
  /** A position pulled from the account (keeps the remote timestamp so it isn't pushed straight back). */
  applyLastRead(position: LastRead) {
    write({ lastRead: position });
  },
  setTheme(theme: ReaderTheme) {
    write({ prefs: { ...read().prefs, theme } });
  },
  setRiwaya(riwaya: RiwayaKey) {
    write({ prefs: { ...read().prefs, riwaya } });
  },
  setTajweed(tajweed: boolean) {
    write({ prefs: { ...read().prefs, tajweed } });
  },
  setFontStep(fontStep: number) {
    write({ prefs: { ...read().prefs, fontStep: Math.max(0, Math.min(FONT_SIZES.length - 1, fontStep)) } });
  },
  saveLastRead(position: Omit<LastRead, "at">) {
    const last = read().lastRead;
    if (last?.page === position.page && last.surah === position.surah && last.ayah === position.ayah) return;
    write({ lastRead: { ...position, at: Date.now() } });
  },
  toggleBookmark(bookmark: Omit<Bookmark, "savedAt">) {
    const { bookmarks } = read();
    const exists = bookmarks.some((entry) => entry.surah === bookmark.surah && entry.ayah === bookmark.ayah);
    write({
      bookmarks: exists
        ? bookmarks.filter((entry) => !(entry.surah === bookmark.surah && entry.ayah === bookmark.ayah))
        : [{ ...bookmark, savedAt: Date.now() }, ...bookmarks],
    });
  },
};

export function isBookmarked(state: ReaderState, surah: number, ayah: number): boolean {
  return state.bookmarks.some((entry) => entry.surah === surah && entry.ayah === ayah);
}
