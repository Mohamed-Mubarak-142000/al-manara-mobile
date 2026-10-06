import { Directory, File, Paths, type DownloadTask } from "expo-file-system";
import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";

import { remoteAyahUrl, type AyahVoice } from "@/core/quran/ayahAudio";
import { getSurahAyahCount } from "@/core/quran/surahAyahCounts";

import { ayahRefOf } from "./trackIds";

/**
 * Ayah-by-ayah audio saved per surah and voice, so repeat-to-memorize, the ayah sheet and tasmee
 * play offline: Paths.document/ayahs/{voice}/{surah}/{ayah}.mp3. A cancelled or failed download
 * keeps the ayahs it finished (a "partial" pack) and the next download only fetches the rest.
 */

export interface AyahPackIndexEntry {
  /** Ayahs saved. */
  count: number;
  /** Ayahs in the surah. */
  total: number;
  bytes: number;
  savedAt: number;
  complete: boolean;
}

export type AyahPackState =
  | { status: "missing" }
  | { status: "downloading"; progress: number; count: number; total: number }
  | { status: "partial"; count: number; total: number; bytes: number; failed: boolean }
  | { status: "ready"; total: number; bytes: number };

export interface AyahPackSummary {
  voice: AyahVoice;
  surah: number;
  entry: AyahPackIndexEntry;
}

const INDEX_KEY = "al-manara:ayah-packs:v1";
const CONCURRENCY = 4;
const ATTEMPTS = 3;
/** Smaller than any real ayah recording: an error page saved as a file. */
const MIN_AYAH_BYTES = 512;
const VOICES: readonly AyahVoice[] = ["husary", "muallim", "alafasy"];
const root = new Directory(Paths.document, "ayahs");

interface Job {
  count: number;
  total: number;
  cancelled: boolean;
  tasks: Set<DownloadTask>;
}

let index: Record<string, AyahPackIndexEntry> | null = null;
const jobs = new Map<string, Job>();
const failed = new Set<string>();
const snapshots = new Map<string, AyahPackState>();
let listSnapshot: AyahPackSummary[] | null = null;
const listeners = new Set<() => void>();

export function packKey(voice: AyahVoice, surah: number): string {
  return `${voice}:${surah}`;
}

export function parsePackKey(key: string): { voice: AyahVoice; surah: number } | null {
  const [voice, surah] = key.split(":");
  const number = Number(surah);
  return VOICES.includes(voice as AyahVoice) && Number.isInteger(number) && number >= 1 && number <= 114
    ? { voice: voice as AyahVoice, surah: number }
    : null;
}

function surahDir(voice: AyahVoice, surah: number): Directory {
  return new Directory(root, voice, String(surah));
}

export function ayahFile(voice: AyahVoice, surah: number, ayah: number): File {
  return new File(surahDir(voice, surah), `${ayah}.mp3`);
}

function readIndex(): Record<string, AyahPackIndexEntry> {
  if (index) return index;
  index = {};
  try {
    const saved = JSON.parse(Storage.getItemSync(INDEX_KEY) ?? "{}") as Record<string, AyahPackIndexEntry>;
    for (const [key, entry] of Object.entries(saved)) {
      const pack = parsePackKey(key);
      // The OS can clear files behind our back; a pack whose folder is gone is forgotten.
      if (pack && entry && entry.count > 0 && surahDir(pack.voice, pack.surah).exists) index[key] = entry;
    }
  } catch {
    // A corrupt index only loses the list; the files are found again on the next download.
  }
  return index;
}

function notify() {
  snapshots.clear();
  listSnapshot = null;
  listeners.forEach((listener) => listener());
}

function writeIndex(next: Record<string, AyahPackIndexEntry>) {
  index = next;
  try {
    Storage.setItemSync(INDEX_KEY, JSON.stringify(next));
  } catch {
    // Keep the in-memory state.
  }
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function packState(voice: AyahVoice, surah: number): AyahPackState {
  const key = packKey(voice, surah);
  const cached = snapshots.get(key);
  if (cached) return cached;
  const job = jobs.get(key);
  const entry = readIndex()[key];
  const state: AyahPackState = job
    ? { status: "downloading", progress: job.total ? job.count / job.total : 0, count: job.count, total: job.total }
    : !entry
      ? // Every ayah failed (e.g. offline): show the retry state rather than silently nothing.
        failed.has(key)
        ? { status: "partial", count: 0, total: getSurahAyahCount(surah), bytes: 0, failed: true }
        : { status: "missing" }
      : entry.complete
        ? { status: "ready", total: entry.total, bytes: entry.bytes }
        : { status: "partial", count: entry.count, total: entry.total, bytes: entry.bytes, failed: failed.has(key) };
  snapshots.set(key, state);
  return state;
}

/** Every saved (complete or partial) pack, by surah then voice. */
export function allAyahPacks(): AyahPackSummary[] {
  if (listSnapshot) return listSnapshot;
  listSnapshot = Object.entries(readIndex())
    .flatMap(([key, entry]) => {
      const pack = parsePackKey(key);
      return pack ? [{ ...pack, entry }] : [];
    })
    .sort((a, b) => a.surah - b.surah || VOICES.indexOf(a.voice) - VOICES.indexOf(b.voice));
  return listSnapshot;
}

/** The saved file of one ayah, or null to stream it. */
export function localAyahUri(voice: AyahVoice, surah: number, ayah: number): string | null {
  const key = packKey(voice, surah);
  if (!readIndex()[key] && !jobs.has(key)) return null;
  try {
    const file = ayahFile(voice, surah, ayah);
    return file.exists ? file.uri : null;
  } catch {
    return null;
  }
}

/**
 * The saved file for an ayah track from any screen (ayah sheet, repeat, tasmee, a queue restored after
 * a restart), found from its streaming URL: a pack downloaded after the queue was built still plays
 * offline.
 */
export function localAyahFor(track: { url: string; fallbackUrls?: string[] }): string | null {
  const ref = ayahRefOf(track);
  return ref ? localAyahUri(ref.voice, ref.surah, ref.ayah) : null;
}

/** Local file when the ayah is saved, otherwise the streaming URL. */
export function ayahUrl(voice: AyahVoice, surah: number, ayah: number): string {
  return localAyahUri(voice, surah, ayah) ?? remoteAyahUrl(voice, surah, ayah);
}

/**
 * Track fields for one ayah: the saved file first with the stream as backup (a queue restored after
 * the pack was deleted still plays), or just the stream.
 */
export function ayahSource(voice: AyahVoice, surah: number, ayah: number): { url: string; fallbackUrls?: string[] } {
  const remote = remoteAyahUrl(voice, surah, ayah);
  const local = localAyahUri(voice, surah, ayah);
  return local ? { url: local, fallbackUrls: [remote] } : { url: remote };
}

/** Counts what is on disk for a pack and records it (or forgets the pack when nothing is left). */
function settle(voice: AyahVoice, surah: number, total: number) {
  const key = packKey(voice, surah);
  const folder = surahDir(voice, surah);
  let count = 0;
  let bytes = 0;
  try {
    if (folder.exists) {
      for (const item of folder.list()) {
        if (!(item instanceof File)) continue;
        if (item.name.endsWith(".mp3")) {
          count += 1;
          bytes += item.size ?? 0;
        } else item.delete();
      }
    }
  } catch {
    // Leave the count at what was readable.
  }
  const next = { ...readIndex() };
  if (count > 0) next[key] = { count, total, bytes, savedAt: Date.now(), complete: count >= total };
  else {
    delete next[key];
    try {
      if (folder.exists) folder.delete();
    } catch {
      // An empty folder costs nothing.
    }
  }
  writeIndex(next);
}

async function fetchAyah(voice: AyahVoice, surah: number, ayah: number, job: Job): Promise<boolean> {
  const folder = surahDir(voice, surah);
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    if (job.cancelled) return false;
    // Written under a temporary name, so an interrupted ayah never passes for a saved one.
    const part = new File(folder, `${ayah}.part`);
    if (part.exists) part.delete();
    const task = File.createDownloadTask(remoteAyahUrl(voice, surah, ayah), part);
    job.tasks.add(task);
    try {
      const file = await task.downloadAsync();
      if (!file) return false;
      if ((file.size ?? 0) < MIN_AYAH_BYTES) throw new Error("too small");
      const final = ayahFile(voice, surah, ayah);
      if (final.exists) final.delete();
      part.rename(final.name);
      return true;
    } catch {
      if (part.exists) part.delete();
      if (!job.cancelled && attempt < ATTEMPTS - 1) await new Promise((resolve) => setTimeout(resolve, 700 * 2 ** attempt));
    } finally {
      job.tasks.delete(task);
    }
  }
  return false;
}

/** Downloads (or resumes) every ayah of a surah in one voice, four at a time. */
export async function downloadSurah(voice: AyahVoice, surah: number): Promise<void> {
  const key = packKey(voice, surah);
  const total = getSurahAyahCount(surah);
  if (jobs.has(key) || !total) return;
  const job: Job = { count: 0, total, cancelled: false, tasks: new Set() };
  jobs.set(key, job);
  failed.delete(key);
  notify();

  let failures = 0;
  try {
    const folder = surahDir(voice, surah);
    if (!folder.exists) folder.create({ intermediates: true });
    const pending: number[] = [];
    for (let ayah = 1; ayah <= total; ayah += 1) {
      if (ayahFile(voice, surah, ayah).exists) job.count += 1;
      else pending.push(ayah);
    }
    notify();

    const worker = async () => {
      while (!job.cancelled) {
        const ayah = pending.shift();
        if (ayah === undefined) return;
        if (await fetchAyah(voice, surah, ayah, job)) {
          job.count += 1;
          notify();
        } else if (!job.cancelled) failures += 1;
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  } catch {
    failures += 1;
  } finally {
    jobs.delete(key);
    if (failures > 0 && !job.cancelled) failed.add(key);
    settle(voice, surah, total);
  }
}

/** Stops a download; the ayahs already saved stay. */
export function cancelSurah(voice: AyahVoice, surah: number) {
  const job = jobs.get(packKey(voice, surah));
  if (!job) return;
  job.cancelled = true;
  job.tasks.forEach((task) => task.cancel());
}

export function removeSurah(voice: AyahVoice, surah: number) {
  cancelSurah(voice, surah);
  const key = packKey(voice, surah);
  try {
    const folder = surahDir(voice, surah);
    if (folder.exists) folder.delete();
  } catch {
    // The index entry goes either way.
  }
  failed.delete(key);
  const next = { ...readIndex() };
  delete next[key];
  writeIndex(next);
}

export function useAyahPack(voice: AyahVoice, surah: number): AyahPackState {
  return useSyncExternalStore(subscribe, () => packState(voice, surah));
}

export function useAyahPacks(): AyahPackSummary[] {
  return useSyncExternalStore(subscribe, allAyahPacks);
}
