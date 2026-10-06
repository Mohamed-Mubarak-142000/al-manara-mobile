import { Directory, File, FileMode, type FileHandle } from "expo-file-system";

import {
  audioCandidates,
  detectFormat,
  isMasterPlaylist,
  parseMaster,
  parseMedia,
  stripId3,
  type HlsByteRange,
  type HlsFormat,
  type HlsMedia,
} from "@/core/sounds/hls";

/** The recording can't be saved as a file: encrypted, live, or empty. */
export class NotDownloadableError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "NotDownloadableError";
  }
}

export class DownloadCancelledError extends Error {
  constructor() {
    super("cancelled");
    this.name = "DownloadCancelledError";
  }
}

export interface HlsDownloadResult {
  file: File;
  ext: HlsFormat;
  bytes: number;
}

interface HlsDownloadOptions {
  onProgress?: (fraction: number) => void;
  isCancelled?: () => boolean;
}

const ATTEMPTS = 3;
const PART = ".part";

async function withRetry<T>(work: () => Promise<T>, isCancelled: () => boolean): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    if (isCancelled()) throw new DownloadCancelledError();
    try {
      return await work();
    } catch (error) {
      lastError = error;
      if (attempt < ATTEMPTS - 1) await new Promise((resolve) => setTimeout(resolve, 800 * 2 ** attempt));
    }
  }
  throw lastError;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function fetchBytes(url: string, range: HlsByteRange | null): Promise<Uint8Array> {
  const headers: Record<string, string> = range ? { Range: `bytes=${range.offset}-${range.offset + range.length - 1}` } : {};
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  // A server that ignores Range sends the whole file.
  if (range && response.status === 200 && bytes.length > range.length) return bytes.subarray(range.offset, range.offset + range.length);
  return bytes;
}

/** The first media playlist that answers, from a master (its audio candidates in order) or a media URL. */
async function loadMedia(url: string, isCancelled: () => boolean): Promise<{ media: HlsMedia; url: string }> {
  const text = await withRetry(() => fetchText(url), isCancelled);
  if (!isMasterPlaylist(text)) return { media: parseMedia(text, url), url };
  const candidates = audioCandidates(parseMaster(text, url));
  let lastError: unknown = new NotDownloadableError("no playlists");
  for (const candidate of candidates) {
    try {
      return { media: parseMedia(await withRetry(() => fetchText(candidate), isCancelled), candidate), url: candidate };
    } catch (error) {
      if (error instanceof DownloadCancelledError) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

/** Deletes `*.part` files left behind by a download the app was killed in the middle of. */
export function cleanStaleParts(dir: Directory) {
  try {
    if (!dir.exists) return;
    for (const entry of dir.list()) {
      if (entry instanceof File && entry.name.endsWith(PART)) entry.delete();
    }
  } catch {
    // Best effort: a leftover file only costs space.
  }
}

/**
 * Saves an HLS recording as one playable file `{baseName}.{ts|aac|mp4|mp3}` in `dir`. Segments are
 * appended one at a time to a `.part` file (only one segment is ever in memory) and the file gets
 * its real name only once complete, so a half-written file is never taken for a download.
 */
export async function downloadHls(
  playlistUrl: string,
  dir: Directory,
  baseName: string,
  { onProgress, isCancelled = () => false }: HlsDownloadOptions = {},
): Promise<HlsDownloadResult> {
  const { media } = await loadMedia(playlistUrl, isCancelled);
  if (media.encrypted) throw new NotDownloadableError("encrypted");
  if (!media.ended) throw new NotDownloadableError("live");
  if (!media.segments.length) throw new NotDownloadableError("empty");

  if (!dir.exists) dir.create({ intermediates: true });
  const part = new File(dir, `${baseName}${PART}`);
  if (part.exists) part.delete();
  part.create();

  let handle: FileHandle | null = null;
  let bytes = 0;
  try {
    handle = part.open(FileMode.Append);
    const total = media.duration > 0 ? media.duration : media.segments.length;
    let done = 0;
    let format: HlsFormat | null = null;

    for (const segment of media.segments) {
      let chunk = await withRetry(() => fetchBytes(segment.url, segment.byteRange), isCancelled);
      if (format === null) {
        format = detectFormat(media, chunk);
        if (format === "mp4" && media.init) {
          const init = media.init;
          const initBytes = await withRetry(() => fetchBytes(init.url, init.byteRange), isCancelled);
          handle.writeBytes(initBytes);
          bytes += initBytes.length;
        }
      }
      // Packed audio repeats an ID3 timestamp tag per segment; mid-file tags confuse some decoders.
      if (format === "aac" || format === "mp3") chunk = stripId3(chunk);
      handle.writeBytes(chunk);
      bytes += chunk.length;
      done += media.duration > 0 ? segment.duration : 1;
      onProgress?.(Math.min(1, done / total));
    }
    handle.close();
    handle = null;

    const ext = format ?? "ts";
    const final = new File(dir, `${baseName}.${ext}`);
    if (final.exists) final.delete();
    part.rename(final.name);
    return { file: final, ext, bytes };
  } catch (error) {
    try {
      handle?.close();
    } catch {
      // Already closed.
    }
    if (part.exists) part.delete();
    throw error;
  }
}
