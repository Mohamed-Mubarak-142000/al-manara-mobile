import { Directory, File, Paths, type DownloadTask } from "expo-file-system";
import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";
import { Platform } from "react-native";

import { getRadioMediaUrl } from "@/core/sounds/soundsApi";
import { track as trackEvent } from "@/lib/telemetry";

import { DownloadCancelledError, NotDownloadableError, cleanStaleParts, downloadHls } from "./hls";
import { canonicalDownloadId, fileStem, legacyFileStem } from "./trackIds";

export interface DownloadMeta {
  id: string;
  title: string;
  artist: string;
  url: string;
  bytes: number;
  savedAt: number;
  /** File extension; entries saved before HLS downloads have none and are mp3. */
  ext?: string;
  /** File name on disk when it isn't the one `fileFor` gives (entries saved under the old naming). */
  file?: string;
}

export type DownloadEntry =
  | { status: "done"; meta: DownloadMeta }
  | { status: "active"; progress: number }
  | { status: "failed" }
  /** The recording can't be saved (encrypted or live HLS, or not on this platform). Not persisted. */
  | { status: "unsupported" };

/**
 * Radio library clips (ابتهالات، تواشيح) are HLS. The download path works, but a spike against the
 * misrquran API (Oct 2026) found every recording AES-128 encrypted, so `downloadHls` refuses them;
 * the button stays hidden for HLS tracks until the source changes. Android only (iOS untested).
 */
export const HLS_DOWNLOADS_ENABLED = false;
let hlsEnabled: boolean = HLS_DOWNLOADS_ENABLED;

export function canDownloadHls(): boolean {
  return hlsEnabled && Platform.OS === "android";
}

/** Tests only: exercise the (disabled) HLS path. */
export function setHlsDownloadsEnabledForTests(enabled: boolean) {
  hlsEnabled = enabled;
}

/** Whether to offer a download button for this track at all (radio clips are HLS, behind the flag). */
export function canDownload(track: { url: string }): boolean {
  return !track.url.startsWith(RADIO_REF) || canDownloadHls();
}

const INDEX_KEY = "al-manara:downloads:v1";
/** Same prefix as playerStore's RADIO_REF (kept literal to avoid a circular import). */
const RADIO_REF = "radio-ref:";
const dir = new Directory(Paths.document, "audio");

let entries: Record<string, DownloadEntry> | null = null;
const tasks = new Map<string, DownloadTask>();
/** HLS downloads in flight, checked between segments. */
const hlsJobs = new Map<string, { cancelled: boolean }>();
const cancelled = new Set<string>();
const listeners = new Set<() => void>();

export function fileFor(id: string, ext = "mp3"): File {
  return new File(dir, `${fileStem(id)}.${ext}`);
}

function fileOf(meta: DownloadMeta): File {
  return meta.file ? new File(dir, meta.file) : fileFor(meta.id, meta.ext);
}

function newer(a: DownloadMeta | undefined, b: DownloadMeta): DownloadMeta {
  return a && a.savedAt >= b.savedAt ? a : b;
}

function all(): Record<string, DownloadEntry> {
  if (entries) return entries;
  entries = {};
  // A download the app was killed during leaves a .part file nothing points at.
  cleanStaleParts(dir);
  try {
    const saved = JSON.parse(Storage.getItemSync(INDEX_KEY) ?? "[]") as DownloadMeta[];
    /** Files under the old naming, by name → the entry that owns it. */
    const legacyOwners = new Map<string, DownloadMeta>();
    for (const raw of saved) {
      const meta: DownloadMeta = { ...raw, id: canonicalDownloadId(raw.id) };
      // The OS can clear files behind our back; only trust the index for files that still exist.
      if (fileOf(meta).exists) {
        if (meta.file) legacyOwners.set(meta.file, newer(legacyOwners.get(meta.file), meta));
        else entries[meta.id] = { status: "done", meta };
        continue;
      }
      // Saved before Arabic ids got a hashed name: the file still has its old name.
      const legacy = `${legacyFileStem(meta.id)}.${meta.ext ?? "mp3"}`;
      if (!meta.file && new File(dir, legacy).exists) legacyOwners.set(legacy, newer(legacyOwners.get(legacy), { ...meta, file: legacy }));
    }
    // Recordings whose old names collided share one file, which holds the newest download only.
    for (const meta of legacyOwners.values()) entries[meta.id] = { status: "done", meta };
  } catch {
    // A corrupt index only loses the list; the files are re-indexed on their next download.
  }
  return entries;
}

function commit(next: Record<string, DownloadEntry>) {
  entries = next;
  const done = Object.values(next).flatMap((entry) => (entry.status === "done" ? [entry.meta] : []));
  try {
    Storage.setItemSync(INDEX_KEY, JSON.stringify(done));
  } catch {
    // Keep the in-memory state.
  }
  listeners.forEach((notify) => notify());
}

function patch(id: string, entry: DownloadEntry | null) {
  const next = { ...all() };
  if (entry) next[id] = entry;
  else delete next[id];
  commit(next);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The downloaded file's URI, for the player to prefer over the network. */
export function localUriFor(id: string): string | null {
  const entry = all()[canonicalDownloadId(id)];
  return entry?.status === "done" ? fileOf(entry.meta).uri : null;
}

type Downloadable = { id: string; title: string; artist: string; url: string; fallbackUrls?: string[] };

/** A 2% step is plenty for a ring; progress fires many times a second. */
function progressReporter(id: string) {
  let lastReported = 0;
  return (raw: number) => {
    // Content-Length can undercount (compressed responses): never draw past a full ring.
    const progress = Math.min(1, Math.max(0, raw));
    if (progress - lastReported >= 0.02) {
      lastReported = progress;
      patch(id, { status: "active", progress });
    }
  };
}

async function startHls(track: Downloadable) {
  if (Platform.OS !== "android") {
    patch(track.id, { status: "unsupported" });
    return;
  }
  const job = { cancelled: false };
  hlsJobs.set(track.id, job);
  patch(track.id, { status: "active", progress: 0 });
  try {
    const playlist = await getRadioMediaUrl(track.url.slice(RADIO_REF.length));
    if (!playlist) throw new Error("no playlist");
    const result = await downloadHls(playlist, dir, fileStem(track.id), {
      onProgress: progressReporter(track.id),
      isCancelled: () => job.cancelled,
    });
    if (job.cancelled) {
      result.file.delete();
      patch(track.id, null);
      return;
    }
    patch(track.id, { status: "done", meta: { id: track.id, title: track.title, artist: track.artist, url: track.url, bytes: result.bytes, savedAt: Date.now(), ext: result.ext } });
    trackEvent("surah_downloaded");
  } catch (error) {
    if (error instanceof DownloadCancelledError || job.cancelled) patch(track.id, null);
    else if (error instanceof NotDownloadableError) patch(track.id, { status: "unsupported" });
    else patch(track.id, { status: "failed" });
  } finally {
    hlsJobs.delete(track.id);
  }
}

export const downloads = {
  async start(input: Downloadable) {
    const track = { ...input, id: canonicalDownloadId(input.id) };
    const current = all()[track.id]?.status;
    if (tasks.has(track.id) || hlsJobs.has(track.id) || current === "done" || current === "unsupported") return;
    if (track.url.startsWith(RADIO_REF)) {
      // The player shows this button for radio clips too; keep HLS behind its flag.
      if (canDownloadHls()) return startHls(track);
      patch(track.id, { status: "unsupported" });
      return;
    }
    // A saved ayah plays from file:// with its stream as backup: download the stream.
    const url = [track.url, ...(track.fallbackUrls ?? [])].find((candidate) => /^https?:\/\//i.test(candidate));
    if (!url) {
      patch(track.id, { status: "unsupported" });
      return;
    }

    if (!dir.exists) dir.create({ intermediates: true });
    const destination = fileFor(track.id);
    if (destination.exists) destination.delete();

    const report = progressReporter(track.id);
    const task = File.createDownloadTask(url, destination, {
      onProgress: ({ bytesWritten, totalBytes }) => report(totalBytes > 0 ? bytesWritten / totalBytes : 0),
    });
    tasks.set(track.id, task);
    cancelled.delete(track.id);
    patch(track.id, { status: "active", progress: 0 });

    try {
      const file = await task.downloadAsync();
      if (!file) {
        // Paused (not used here) or cancelled.
        patch(track.id, null);
        return;
      }
      const meta: DownloadMeta = { id: track.id, title: track.title, artist: track.artist, url, bytes: file.size ?? 0, savedAt: Date.now() };
      patch(track.id, { status: "done", meta });
      trackEvent("surah_downloaded");
    } catch {
      if (destination.exists) destination.delete();
      // cancel() rejects downloadAsync(); that is not a failure to show.
      patch(track.id, cancelled.has(track.id) ? null : { status: "failed" });
    } finally {
      tasks.delete(track.id);
      cancelled.delete(track.id);
    }
  },
  cancel(rawId: string) {
    const id = canonicalDownloadId(rawId);
    const job = hlsJobs.get(id);
    if (job) {
      job.cancelled = true;
      return;
    }
    if (tasks.has(id)) {
      cancelled.add(id);
      tasks.get(id)?.cancel();
    }
  },
  remove(rawId: string) {
    const id = canonicalDownloadId(rawId);
    const entry = all()[id];
    const file = entry?.status === "done" ? fileOf(entry.meta) : fileFor(id);
    if (file.exists) file.delete();
    patch(id, null);
  },
};

export function useDownloads(): Record<string, DownloadEntry> {
  return useSyncExternalStore(subscribe, all);
}

export function downloadEntry(id: string): DownloadEntry | undefined {
  return all()[canonicalDownloadId(id)];
}

export function useDownload(id: string): DownloadEntry | undefined {
  return useSyncExternalStore(subscribe, () => downloadEntry(id));
}
