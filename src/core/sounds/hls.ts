/**
 * A small HLS (m3u8) reader for saving a recording as one file: which playlist carries the audio,
 * which segments make it up, and what container they are in. Pure: no network, no file system.
 */

export interface HlsVariant {
  url: string;
  bandwidth: number;
  codecs: string | null;
  /** GROUP-ID of the EXT-X-MEDIA audio renditions this variant plays with. */
  audioGroup: string | null;
}

export interface HlsRendition {
  groupId: string;
  name: string;
  /** Absent when the audio is muxed into the variant itself. */
  url: string | null;
  isDefault: boolean;
}

export interface HlsMaster {
  variants: HlsVariant[];
  audio: HlsRendition[];
}

export interface HlsByteRange {
  length: number;
  offset: number;
}

export interface HlsSegment {
  url: string;
  duration: number;
  byteRange: HlsByteRange | null;
}

export interface HlsMedia {
  segments: HlsSegment[];
  /** EXT-X-MAP: the fMP4 init segment that has to come first in the file. */
  init: { url: string; byteRange: HlsByteRange | null } | null;
  /** Any EXT-X-KEY with a METHOD other than NONE. */
  encrypted: boolean;
  /** EXT-X-ENDLIST: a finished recording rather than a live stream. */
  ended: boolean;
  /** Seconds, the sum of the segments' EXTINF. */
  duration: number;
}

export type HlsFormat = "ts" | "aac" | "mp4" | "mp3";

/** `ref` against the playlist URL it appeared in: absolute, scheme-relative, root-relative, query-only or relative. */
export function resolveUrl(base: string, ref: string): string {
  const target = ref.trim();
  if (/^[a-z][a-z\d+.-]*:/i.test(target)) return target;
  const match = /^([a-z][a-z\d+.-]*:)\/\/([^/?#]*)([^?#]*)(\?[^#]*)?/i.exec(base);
  if (!match) return target;
  const [, scheme, host, basePath = ""] = match;
  if (target.startsWith("//")) return `${scheme}${target}`;
  if (target.startsWith("#") || target === "") return base.replace(/#.*$/, "");
  if (target.startsWith("?")) return `${scheme}//${host}${basePath || "/"}${target}`;

  const [pathPart, ...rest] = target.split(/(?=[?#])/);
  const suffix = rest.join("");
  const segments = pathPart.startsWith("/") ? [] : (basePath || "/").split("/").slice(1, -1);
  const parts = pathPart.split("/");
  if (pathPart.startsWith("/")) parts.shift();
  parts.forEach((part, index) => {
    if (part === "..") segments.pop();
    else if (part !== ".") segments.push(part);
    // A trailing "." or ".." still names a directory.
    if ((part === "." || part === "..") && index === parts.length - 1) segments.push("");
  });
  return `${scheme}//${host}/${segments.join("/")}${suffix}`;
}

/** KEY=value,KEY="quoted, value" → { KEY: "value", ... }. */
export function parseAttributes(list: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const pattern = /([A-Z0-9-]+)=("[^"]*"|[^,]*)/gi;
  for (const [, key, raw] of list.matchAll(pattern)) {
    attributes[key.toUpperCase()] = raw.startsWith('"') ? raw.slice(1, -1) : raw.trim();
  }
  return attributes;
}

function lines(text: string): string[] {
  return text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function tagValue(line: string, tag: string): string | null {
  return line.startsWith(`${tag}:`) ? line.slice(tag.length + 1) : null;
}

export function isMasterPlaylist(text: string): boolean {
  return /#EXT-X-STREAM-INF/.test(text);
}

export function parseMaster(text: string, baseUrl: string): HlsMaster {
  const variants: HlsVariant[] = [];
  const audio: HlsRendition[] = [];
  let pending: Record<string, string> | null = null;
  for (const line of lines(text)) {
    const media = tagValue(line, "#EXT-X-MEDIA");
    const stream = tagValue(line, "#EXT-X-STREAM-INF");
    if (media !== null) {
      const attributes = parseAttributes(media);
      if (attributes.TYPE?.toUpperCase() === "AUDIO") {
        audio.push({
          groupId: attributes["GROUP-ID"] ?? "",
          name: attributes.NAME ?? "",
          url: attributes.URI ? resolveUrl(baseUrl, attributes.URI) : null,
          isDefault: attributes.DEFAULT?.toUpperCase() === "YES",
        });
      }
    } else if (stream !== null) {
      pending = parseAttributes(stream);
    } else if (!line.startsWith("#") && pending) {
      variants.push({
        url: resolveUrl(baseUrl, line),
        bandwidth: Number(pending.BANDWIDTH) || 0,
        codecs: pending.CODECS ?? null,
        audioGroup: pending.AUDIO ?? null,
      });
      pending = null;
    }
  }
  return { variants, audio };
}

const AUDIO_ONLY_CODECS = /^(mp4a|ac-3|ec-3|mp3|opus|flac)/i;

/**
 * The playlists worth downloading, best first: a separate audio rendition (default first), then
 * audio-only variants, then every variant from the lowest bandwidth up. Variants of equal
 * bandwidth keep their order, so the rest work as backup CDNs.
 */
export function audioCandidates(master: HlsMaster): string[] {
  const renditions = master.audio
    .filter((rendition) => rendition.url)
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
    .map((rendition) => rendition.url!);
  const audioOnly = master.variants.filter(
    (variant) => variant.codecs && variant.codecs.split(",").every((codec) => AUDIO_ONLY_CODECS.test(codec.trim())),
  );
  const byBandwidth = [...master.variants].sort((a, b) => a.bandwidth - b.bandwidth);
  return [...new Set([...renditions, ...audioOnly.map((variant) => variant.url), ...byBandwidth.map((variant) => variant.url)])];
}

/** The single best audio playlist, or null for a master without any. */
export function pickAudio(master: HlsMaster): string | null {
  return audioCandidates(master)[0] ?? null;
}

function parseByteRange(value: string, previousEnd: number): HlsByteRange | null {
  const [length, offset] = value.split("@").map(Number);
  if (!Number.isFinite(length)) return null;
  return { length, offset: Number.isFinite(offset) ? offset : previousEnd };
}

export function parseMedia(text: string, baseUrl: string): HlsMedia {
  const segments: HlsSegment[] = [];
  let init: HlsMedia["init"] = null;
  let encrypted = false;
  let ended = false;
  let duration = 0;
  let pendingDuration: number | null = null;
  let pendingRange: string | null = null;
  // Without an @offset, a byte range starts where the previous one of the same file ended.
  const ends = new Map<string, number>();

  for (const line of lines(text)) {
    const inf = tagValue(line, "#EXTINF");
    const range = tagValue(line, "#EXT-X-BYTERANGE");
    const key = tagValue(line, "#EXT-X-KEY");
    const map = tagValue(line, "#EXT-X-MAP");
    if (inf !== null) pendingDuration = Number.parseFloat(inf) || 0;
    else if (range !== null) pendingRange = range;
    else if (key !== null) {
      if ((parseAttributes(key).METHOD ?? "NONE").toUpperCase() !== "NONE") encrypted = true;
    } else if (map !== null) {
      const attributes = parseAttributes(map);
      if (attributes.URI) {
        const url = resolveUrl(baseUrl, attributes.URI);
        init = { url, byteRange: attributes.BYTERANGE ? parseByteRange(attributes.BYTERANGE, 0) : null };
      }
    } else if (line === "#EXT-X-ENDLIST") ended = true;
    else if (!line.startsWith("#")) {
      const url = resolveUrl(baseUrl, line);
      const byteRange = pendingRange ? parseByteRange(pendingRange, ends.get(url) ?? 0) : null;
      if (byteRange) ends.set(url, byteRange.offset + byteRange.length);
      const seconds = pendingDuration ?? 0;
      segments.push({ url, duration: seconds, byteRange });
      duration += seconds;
      pendingDuration = null;
      pendingRange = null;
    }
  }
  return { segments, init, encrypted, ended, duration };
}

/** Bytes after any leading ID3v2 tags (packed audio segments carry one with their timestamp). */
export function stripId3(bytes: Uint8Array): Uint8Array {
  let start = 0;
  while (
    bytes.length - start >= 10 &&
    bytes[start] === 0x49 && // I
    bytes[start + 1] === 0x44 && // D
    bytes[start + 2] === 0x33 // 3
  ) {
    // Sizes are "syncsafe": 7 bits per byte.
    const size = ((bytes[start + 6] & 0x7f) << 21) | ((bytes[start + 7] & 0x7f) << 14) | ((bytes[start + 8] & 0x7f) << 7) | (bytes[start + 9] & 0x7f);
    const footer = bytes[start + 5] & 0x10 ? 10 : 0;
    start += 10 + size + footer;
  }
  return start === 0 ? bytes : bytes.subarray(Math.min(start, bytes.length));
}

function extensionOf(url: string): string {
  return /\.([a-z0-9]+)(?:[?#]|$)/i.exec(url.replace(/[?#].*$/, ""))?.[1]?.toLowerCase() ?? "";
}

/** The container of a recording: from the init map, the first segment's bytes, then its URL. */
export function detectFormat(media: HlsMedia, firstBytes: Uint8Array | null): HlsFormat {
  if (media.init) return "mp4";
  if (firstBytes && firstBytes.length > 0) {
    if (firstBytes[0] === 0x47 && (firstBytes.length <= 188 || firstBytes[188] === 0x47)) return "ts";
    if (firstBytes.length >= 8 && String.fromCharCode(...firstBytes.subarray(4, 8)) === "ftyp") return "mp4";
    const audio = stripId3(firstBytes);
    if (audio.length >= 2 && audio[0] === 0xff && (audio[1] & 0xe0) === 0xe0) {
      // Layer bits 00 mark ADTS (AAC); anything else is MPEG audio.
      return (audio[1] & 0x06) === 0 ? "aac" : "mp3";
    }
  }
  const ext = extensionOf(media.segments[0]?.url ?? "");
  if (ext === "aac") return "aac";
  if (ext === "mp3") return "mp3";
  if (ext === "mp4" || ext === "m4s" || ext === "m4a") return "mp4";
  return "ts";
}
