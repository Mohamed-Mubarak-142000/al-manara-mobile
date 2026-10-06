/// <reference types="jest" />
import { fs } from "./fsMock";

jest.mock("expo-file-system", () => require("./fsMock").fileSystem);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Directory } = require("expo-file-system") as { Directory: new (...parts: string[]) => { uri: string } };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const hls = require("@/features/downloads/hls") as typeof import("@/features/downloads/hls");

const id3 = [0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 2, 0, 0];
const adts = (fill: number) => [0xff, 0xf1, 0x50, 0x80, fill];

function serve(routes: Record<string, string | number[]>) {
  globalThis.fetch = jest.fn(async (url: string) => {
    const body = routes[url];
    if (body === undefined) return { ok: false, status: 404 } as Response;
    return {
      ok: true,
      status: 200,
      text: async () => body as string,
      arrayBuffer: async () => new Uint8Array(body as number[]).buffer,
    } as Response;
  }) as unknown as typeof fetch;
}

beforeEach(() => fs.reset());

describe("downloadHls", () => {
  const master = "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=64000,CODECS=\"mp4a.40.2\"\na/index.m3u8\n";

  it("appends packed AAC segments without their ID3 tags and names the file .aac", async () => {
    serve({
      "https://h.net/m.m3u8": master,
      "https://h.net/a/index.m3u8": "#EXTM3U\n#EXTINF:1,\n1.aac\n#EXTINF:1,\n2.aac\n#EXT-X-ENDLIST\n",
      "https://h.net/a/1.aac": [...id3, ...adts(1)],
      "https://h.net/a/2.aac": [...id3, ...adts(2)],
    });
    const progress: number[] = [];
    const result = await hls.downloadHls("https://h.net/m.m3u8", new Directory("doc", "audio") as never, "rec", {
      onProgress: (value) => progress.push(value),
    });
    expect(result.ext).toBe("aac");
    expect([...fs.files.get("doc/audio/rec.aac")!]).toEqual([...adts(1), ...adts(2)]);
    expect(fs.files.has("doc/audio/rec.part")).toBe(false);
    expect(progress).toEqual([0.5, 1]);
  });

  it("puts the fMP4 init segment first", async () => {
    serve({
      "https://h.net/v.m3u8": '#EXTM3U\n#EXT-X-MAP:URI="init.mp4"\n#EXTINF:2,\ns1.m4s\n#EXT-X-ENDLIST\n',
      "https://h.net/init.mp4": [9, 9],
      "https://h.net/s1.m4s": [1, 2, 3],
    });
    const result = await hls.downloadHls("https://h.net/v.m3u8", new Directory("doc", "audio") as never, "fm");
    expect(result.ext).toBe("mp4");
    expect([...fs.files.get("doc/audio/fm.mp4")!]).toEqual([9, 9, 1, 2, 3]);
  });

  it("refuses encrypted and live playlists", async () => {
    serve({
      "https://h.net/enc.m3u8": '#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="k"\n#EXTINF:1,\n1.ts\n#EXT-X-ENDLIST\n',
      "https://h.net/live.m3u8": "#EXTM3U\n#EXTINF:1,\n1.ts\n",
    });
    const dir = new Directory("doc", "audio") as never;
    await expect(hls.downloadHls("https://h.net/enc.m3u8", dir, "x")).rejects.toBeInstanceOf(hls.NotDownloadableError);
    await expect(hls.downloadHls("https://h.net/live.m3u8", dir, "x")).rejects.toBeInstanceOf(hls.NotDownloadableError);
  });

  it("deletes the partial file when cancelled", async () => {
    serve({
      "https://h.net/p.m3u8": "#EXTM3U\n#EXTINF:1,\n1.ts\n#EXTINF:1,\n2.ts\n#EXT-X-ENDLIST\n",
      "https://h.net/1.ts": [0x47, 1],
      "https://h.net/2.ts": [0x47, 2],
    });
    let cancelled = false;
    const run = hls.downloadHls("https://h.net/p.m3u8", new Directory("doc", "audio") as never, "c", {
      onProgress: () => (cancelled = true),
      isCancelled: () => cancelled,
    });
    await expect(run).rejects.toBeInstanceOf(hls.DownloadCancelledError);
    expect(fs.files.size).toBe(0);
  });

  it("cleans stale .part files", () => {
    fs.dirs.add("doc/audio");
    fs.files.set("doc/audio/old.part", new Uint8Array(1));
    fs.files.set("doc/audio/old.ts", new Uint8Array(1));
    hls.cleanStaleParts(new Directory("doc", "audio") as never);
    expect([...fs.files.keys()]).toEqual(["doc/audio/old.ts"]);
  });
});
