import { Directory, File, Paths, type DownloadTask } from "expo-file-system";
import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";

export interface DownloadMeta {
  id: string;
  title: string;
  artist: string;
  url: string;
  bytes: number;
  savedAt: number;
}

export type DownloadEntry = { status: "done"; meta: DownloadMeta } | { status: "active"; progress: number } | { status: "failed" };

const INDEX_KEY = "al-manara:downloads:v1";
const dir = new Directory(Paths.document, "audio");

let entries: Record<string, DownloadEntry> | null = null;
const tasks = new Map<string, DownloadTask>();
const listeners = new Set<() => void>();

function fileFor(id: string): File {
  return new File(dir, `${id.replace(/[^\w-]/g, "_")}.mp3`);
}

function all(): Record<string, DownloadEntry> {
  if (entries) return entries;
  entries = {};
  try {
    const saved = JSON.parse(Storage.getItemSync(INDEX_KEY) ?? "[]") as DownloadMeta[];
    for (const meta of saved) {
      // The OS can clear files behind our back; only trust the index for files that still exist.
      if (fileFor(meta.id).exists) entries[meta.id] = { status: "done", meta };
    }
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
  return all()[id]?.status === "done" ? fileFor(id).uri : null;
}

export const downloads = {
  async start(track: { id: string; title: string; artist: string; url: string }) {
    if (tasks.has(track.id) || all()[track.id]?.status === "done") return;
    if (!dir.exists) dir.create({ intermediates: true });
    const destination = fileFor(track.id);
    if (destination.exists) destination.delete();

    let lastReported = 0;
    const task = File.createDownloadTask(track.url, destination, {
      onProgress: ({ bytesWritten, totalBytes }) => {
        const progress = totalBytes > 0 ? bytesWritten / totalBytes : 0;
        // Progress fires many times a second; a 2% step is plenty for a ring.
        if (progress - lastReported >= 0.02) {
          lastReported = progress;
          patch(track.id, { status: "active", progress });
        }
      },
    });
    tasks.set(track.id, task);
    patch(track.id, { status: "active", progress: 0 });

    try {
      const file = await task.downloadAsync();
      if (!file) {
        // Cancelled.
        patch(track.id, null);
        return;
      }
      const meta: DownloadMeta = { ...track, bytes: file.size ?? 0, savedAt: Date.now() };
      patch(track.id, { status: "done", meta });
    } catch {
      if (destination.exists) destination.delete();
      patch(track.id, { status: "failed" });
    } finally {
      tasks.delete(track.id);
    }
  },
  cancel(id: string) {
    tasks.get(id)?.cancel();
  },
  remove(id: string) {
    const file = fileFor(id);
    if (file.exists) file.delete();
    patch(id, null);
  },
};

export function useDownloads(): Record<string, DownloadEntry> {
  return useSyncExternalStore(subscribe, all);
}

export function useDownload(id: string): DownloadEntry | undefined {
  return useSyncExternalStore(subscribe, () => all()[id]);
}
