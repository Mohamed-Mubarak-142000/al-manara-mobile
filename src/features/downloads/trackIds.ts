import { parseRemoteAyahUrl, type AyahVoice } from "@/core/quran/ayahAudio";

/**
 * Pure helpers that tie a player track to what is saved for it, so a recording downloaded on one
 * screen plays from the device when it is started from any other.
 */

/** Same prefix as playerStore's RADIO_REF (kept literal to avoid a circular import). */
const RADIO_REF = "radio-ref:";

/**
 * One id per recording for the download index. The adhan picker lists the adhan library under
 * "adhan-voice-<id>" (the saved alarm voice keeps that id) while the sounds screen uses "sound-<id>"
 * for the same file: both resolve to the sound id, which is what downloads were always saved under.
 */
export function canonicalDownloadId(id: string): string {
  return id.startsWith("adhan-voice-") ? `sound-${id.slice("adhan-voice-".length)}` : id;
}

export interface AyahRef {
  voice: AyahVoice;
  surah: number;
  ayah: number;
}

/**
 * The ayah a track recites, from its streaming URL (its `url`, or the backup when it plays from a
 * saved pack): ayah tracks are saved as per-surah packs rather than one file per track.
 */
export function ayahRefOf(track: { url: string; fallbackUrls?: string[] }): AyahRef | null {
  for (const url of [track.url, ...(track.fallbackUrls ?? [])]) {
    const ref = parseRemoteAyahUrl(url);
    if (ref) return ref;
  }
  return null;
}

export type TrackDownloadKind = "file" | "ayah-pack" | null;

/**
 * How a track can be saved: as one file, as its surah's ayah pack, or not at all (live streams and
 * radio-library clips while their HLS is encrypted at the source).
 */
export function trackDownloadKind(
  track: { url: string; fallbackUrls?: string[]; live?: boolean },
  hlsAllowed: boolean,
): TrackDownloadKind {
  if (track.live) return null;
  if (ayahRefOf(track)) return "ayah-pack";
  if (track.url.startsWith(RADIO_REF)) return hlsAllowed ? "file" : null;
  return /^https?:\/\//i.test(track.url) ? "file" : null;
}

/** 32-bit FNV-1a in base 36: a short, stable tag for a file name. */
export function shortHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/** The pre-2026-10 file name stem: every non-word character became "_", so Arabic names collided. */
export function legacyFileStem(id: string): string {
  return id.replace(/[^\w-]/g, "_");
}

/**
 * File name stem of a download. ASCII ids keep their old name; ids with other characters (Arabic
 * archive file names) get a hash so two recordings never share one file.
 */
export function fileStem(id: string): string {
  const legacy = legacyFileStem(id);
  return /[^\x20-\x7e]/.test(id) ? `${legacy}-${shortHash(id)}` : legacy;
}
