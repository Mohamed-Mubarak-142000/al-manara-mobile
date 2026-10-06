/// <reference types="jest" />
import {
  audioCandidates,
  detectFormat,
  isMasterPlaylist,
  parseAttributes,
  parseMaster,
  parseMedia,
  pickAudio,
  resolveUrl,
  stripId3,
  type HlsMedia,
} from "@/core/sounds/hls";

// The shape the Egyptian Quran Radio (misrquran → webvideocore) serves: three equal variants on backup CDNs.
const RADIO_MASTER = `#EXTM3U

#EXT-X-STREAM-INF:PROGRAM-ID=1,CLOSED-CAPTIONS=NONE,BANDWIDTH=128030
https://cdnvideo.example.net/enc4_abc/index.m3u8?clip_id=x1

#EXT-X-STREAM-INF:PROGRAM-ID=1,CLOSED-CAPTIONS=NONE,BANDWIDTH=128030
https://cdnvideobak.example.net/cdn5_abc/index.m3u8?clip_id=x1
`;

const RADIO_MEDIA = `#EXTM3U
#EXT-X-TARGETDURATION:5
#EXT-X-ALLOW-CACHE:YES
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-VERSION:3
#EXT-X-KEY:METHOD=AES-128,URI="https://cdnvideo.example.net/enc4_abc/play.key",IV=0x00000000000000000000000000000000
#EXT-X-MEDIA-SEQUENCE:1
#EXTINF:2.016,
seg-1-a1.ts
#EXTINF:3.000,
seg-2-a1.ts
#EXT-X-ENDLIST
`;

const MASTER_WITH_AUDIO = `#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aud",NAME="English",DEFAULT=NO,URI="audio/en.m3u8"
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aud",NAME="Arabic, main",DEFAULT=YES,URI="audio/ar.m3u8"
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="ar",URI="subs/ar.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=800000,CODECS="avc1.4d401e,mp4a.40.2",AUDIO="aud"
video/high.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=64000,CODECS="mp4a.40.2"
audio-only.m3u8
`;

const FMP4_MEDIA = `#EXTM3U
#EXT-X-VERSION:7
#EXT-X-MAP:URI="init.mp4",BYTERANGE="720@0"
#EXT-X-KEY:METHOD=NONE
#EXTINF:6.0,
#EXT-X-BYTERANGE:1000@720
main.mp4
#EXTINF:4.5,
#EXT-X-BYTERANGE:500
main.mp4
#EXT-X-ENDLIST
`;

const LIVE_MEDIA = `#EXTM3U
#EXT-X-TARGETDURATION:6
#EXTINF:6,
live/1.aac
#EXTINF:6,
live/2.aac
`;

describe("resolveUrl", () => {
  const base = "https://cdn.example.com/a/b/index.m3u8?token=1";
  it("keeps absolute URLs", () => expect(resolveUrl(base, "http://other.net/x.ts")).toBe("http://other.net/x.ts"));
  it("resolves scheme-relative", () => expect(resolveUrl(base, "//img.net/x.ts")).toBe("https://img.net/x.ts"));
  it("resolves root-relative", () => expect(resolveUrl(base, "/root/x.ts")).toBe("https://cdn.example.com/root/x.ts"));
  it("resolves relative to the playlist folder, dropping its query", () =>
    expect(resolveUrl(base, "seg-1.ts")).toBe("https://cdn.example.com/a/b/seg-1.ts"));
  it("keeps the reference's own query", () => expect(resolveUrl(base, "seg.ts?x=2")).toBe("https://cdn.example.com/a/b/seg.ts?x=2"));
  it("handles ./ and ../", () => {
    expect(resolveUrl(base, "./c/seg.ts")).toBe("https://cdn.example.com/a/b/c/seg.ts");
    expect(resolveUrl(base, "../seg.ts")).toBe("https://cdn.example.com/a/seg.ts");
    expect(resolveUrl(base, "../../../seg.ts")).toBe("https://cdn.example.com/seg.ts");
  });
  it("resolves a query-only reference", () => expect(resolveUrl(base, "?v=3")).toBe("https://cdn.example.com/a/b/index.m3u8?v=3"));
  it("works with a host-only base", () => expect(resolveUrl("https://h.net", "x.ts")).toBe("https://h.net/x.ts"));
});

describe("parseAttributes", () => {
  it("reads quoted values with commas", () => {
    expect(parseAttributes('TYPE=AUDIO,NAME="Arabic, main",DEFAULT=YES')).toEqual({ TYPE: "AUDIO", NAME: "Arabic, main", DEFAULT: "YES" });
  });
});

describe("parseMaster / pickAudio", () => {
  it("reads the radio's master: equal variants kept in order as backups", () => {
    const base = "https://service.example.net/x/a_1.m3u8";
    expect(isMasterPlaylist(RADIO_MASTER)).toBe(true);
    const master = parseMaster(RADIO_MASTER, base);
    expect(master.variants).toHaveLength(2);
    expect(master.variants[0]).toMatchObject({ bandwidth: 128030, codecs: null, audioGroup: null });
    expect(audioCandidates(master)).toEqual([
      "https://cdnvideo.example.net/enc4_abc/index.m3u8?clip_id=x1",
      "https://cdnvideobak.example.net/cdn5_abc/index.m3u8?clip_id=x1",
    ]);
  });

  it("prefers the default audio rendition, then audio-only variants, then lowest bandwidth", () => {
    const master = parseMaster(MASTER_WITH_AUDIO, "https://h.net/v/master.m3u8");
    expect(master.audio.map((rendition) => rendition.name)).toEqual(["English", "Arabic, main"]);
    expect(pickAudio(master)).toBe("https://h.net/v/audio/ar.m3u8");
    expect(audioCandidates(master)).toEqual([
      "https://h.net/v/audio/ar.m3u8",
      "https://h.net/v/audio/en.m3u8",
      "https://h.net/v/audio-only.m3u8",
      "https://h.net/v/video/high.m3u8",
    ]);
  });

  it("picks an mp4a-only variant over a muxed one without renditions", () => {
    const text = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=10000,CODECS="avc1.42e00a,mp4a.40.2"
low-video.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=96000,CODECS="mp4a.40.5"
audio.m3u8`;
    expect(pickAudio(parseMaster(text, "https://h.net/m.m3u8"))).toBe("https://h.net/audio.m3u8");
  });

  it("falls back to the lowest bandwidth", () => {
    const text = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=900000
hi.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=100000
lo.m3u8`;
    expect(pickAudio(parseMaster(text, "https://h.net/m.m3u8"))).toBe("https://h.net/lo.m3u8");
    expect(pickAudio({ variants: [], audio: [] })).toBeNull();
  });
});

describe("parseMedia", () => {
  it("flags the radio's AES-128 playlist as encrypted", () => {
    const media = parseMedia(RADIO_MEDIA, "https://cdnvideo.example.net/enc4_abc/index.m3u8?clip_id=x1");
    expect(isMasterPlaylist(RADIO_MEDIA)).toBe(false);
    expect(media.encrypted).toBe(true);
    expect(media.ended).toBe(true);
    expect(media.segments.map((segment) => segment.url)).toEqual([
      "https://cdnvideo.example.net/enc4_abc/seg-1-a1.ts",
      "https://cdnvideo.example.net/enc4_abc/seg-2-a1.ts",
    ]);
    expect(media.duration).toBeCloseTo(5.016);
  });

  it("reads fMP4 with init map and byte ranges (implicit offsets continue)", () => {
    const media = parseMedia(FMP4_MEDIA, "https://h.net/v/index.m3u8");
    expect(media.encrypted).toBe(false);
    expect(media.init).toEqual({ url: "https://h.net/v/init.mp4", byteRange: { length: 720, offset: 0 } });
    expect(media.segments).toEqual([
      { url: "https://h.net/v/main.mp4", duration: 6, byteRange: { length: 1000, offset: 720 } },
      { url: "https://h.net/v/main.mp4", duration: 4.5, byteRange: { length: 500, offset: 1720 } },
    ]);
  });

  it("treats a playlist without ENDLIST as live", () => {
    const media = parseMedia(LIVE_MEDIA, "https://h.net/index.m3u8");
    expect(media.ended).toBe(false);
    expect(media.segments).toHaveLength(2);
  });

  it("accepts CRLF and a BOM", () => {
    const media = parseMedia("﻿#EXTM3U\r\n#EXTINF:1,\r\na.ts\r\n#EXT-X-ENDLIST\r\n", "https://h.net/p.m3u8");
    expect(media.segments[0].url).toBe("https://h.net/a.ts");
    expect(media.ended).toBe(true);
  });
});

describe("stripId3 / detectFormat", () => {
  const id3 = (payload: number) => [0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, payload, ...new Array(payload).fill(0)];
  const adts = [0xff, 0xf1, 0x50, 0x80];
  const mp3 = [0xff, 0xfb, 0x90, 0x64];
  const media = (url: string, init = false): HlsMedia => ({
    segments: [{ url, duration: 1, byteRange: null }],
    init: init ? { url: "init.mp4", byteRange: null } : null,
    encrypted: false,
    ended: true,
    duration: 1,
  });

  it("strips leading ID3 tags", () => {
    expect([...stripId3(new Uint8Array([...id3(3), ...adts]))]).toEqual(adts);
    expect([...stripId3(new Uint8Array([...id3(2), ...id3(1), ...adts]))]).toEqual(adts);
    const plain = new Uint8Array(adts);
    expect(stripId3(plain)).toBe(plain);
  });

  it("detects TS, AAC, MP3 and MP4", () => {
    const ts = new Uint8Array(376);
    ts[0] = 0x47;
    ts[188] = 0x47;
    expect(detectFormat(media("a.bin"), ts)).toBe("ts");
    expect(detectFormat(media("a.bin"), new Uint8Array([...id3(4), ...adts]))).toBe("aac");
    expect(detectFormat(media("a.bin"), new Uint8Array(mp3))).toBe("mp3");
    expect(detectFormat(media("a.bin"), new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70]))).toBe("mp4");
    expect(detectFormat(media("a.bin", true), ts)).toBe("mp4");
  });

  it("falls back to the segment extension", () => {
    expect(detectFormat(media("https://h.net/x.aac?y=1"), null)).toBe("aac");
    expect(detectFormat(media("x.m4s"), new Uint8Array([1, 2, 3]))).toBe("mp4");
    expect(detectFormat(media("x.mp3"), null)).toBe("mp3");
    expect(detectFormat(media("x"), null)).toBe("ts");
  });
});
