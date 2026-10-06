/// <reference types="jest" />
import { fs } from "./fsMock";

import { ayahOfGlobal, parseRemoteAyahUrl, remoteAyahUrl } from "@/core/quran/ayahAudio";
import { ayahRefOf, canonicalDownloadId, fileStem, legacyFileStem, shortHash, trackDownloadKind } from "@/features/downloads/trackIds";

const mockStore: Record<string, string> = {};

jest.mock("expo-file-system", () => require("./fsMock").fileSystem);
jest.mock("expo-sqlite/kv-store", () => ({
  __esModule: true,
  default: { getItemSync: (key: string) => mockStore[key] ?? null, setItemSync: (key: string, value: string) => (mockStore[key] = value) },
}));
jest.mock("@/lib/telemetry", () => ({ track: jest.fn() }));
jest.mock("@/core/sounds/soundsApi", () => ({ getRadioMediaUrl: jest.fn() }));

beforeEach(() => {
  fs.reset();
  for (const key of Object.keys(mockStore)) delete mockStore[key];
});

describe("ayah URLs back to their ayah", () => {
  it("inverts the global ayah number", () => {
    expect(ayahOfGlobal(1)).toEqual({ surah: 1, ayah: 1 });
    expect(ayahOfGlobal(8)).toEqual({ surah: 2, ayah: 1 });
    expect(ayahOfGlobal(6236)).toEqual({ surah: 114, ayah: 6 });
    expect(ayahOfGlobal(0)).toBeNull();
    expect(ayahOfGlobal(6237)).toBeNull();
  });

  it("parses every voice's URL and nothing else", () => {
    for (const voice of ["husary", "alafasy", "muallim"] as const) {
      expect(parseRemoteAyahUrl(remoteAyahUrl(voice, 18, 10))).toEqual({ voice, surah: 18, ayah: 10 });
    }
    expect(parseRemoteAyahUrl("https://server8.mp3quran.net/afs/001.mp3")).toBeNull();
    expect(parseRemoteAyahUrl("https://everyayah.com/data/Husary_Muallim_128kbps/001009.mp3")).toBeNull();
  });

  it("finds the ayah of a track playing from a saved pack through its backup stream", () => {
    const remote = remoteAyahUrl("husary", 2, 255);
    expect(ayahRefOf({ url: "file:///doc/ayahs/husary/2/255.mp3", fallbackUrls: [remote] })).toEqual({ voice: "husary", surah: 2, ayah: 255 });
    expect(ayahRefOf({ url: "https://x/2.mp3" })).toBeNull();
  });
});

describe("what a track saves as", () => {
  it("picks a file, the ayah pack, or nothing", () => {
    expect(trackDownloadKind({ url: "https://server8.mp3quran.net/afs/001.mp3" }, false)).toBe("file");
    expect(trackDownloadKind({ url: remoteAyahUrl("alafasy", 1, 1) }, false)).toBe("ayah-pack");
    expect(trackDownloadKind({ url: "https://stream.radio/live", live: true }, false)).toBeNull();
    // Encrypted radio-library clips stay unsaveable unless HLS downloads are switched on.
    expect(trackDownloadKind({ url: "radio-ref:42" }, false)).toBeNull();
    expect(trackDownloadKind({ url: "radio-ref:42" }, true)).toBe("file");
  });
});

describe("download ids and file names", () => {
  it("gives the adhan picker and the sounds screen one id per recording", () => {
    expect(canonicalDownloadId("adhan-voice-archive:Islamic_Tape-34/a.mp3")).toBe("sound-archive:Islamic_Tape-34/a.mp3");
    expect(canonicalDownloadId("surah-1-2-3")).toBe("surah-1-2-3");
    expect(canonicalDownloadId("sound-radio:9")).toBe("sound-radio:9");
  });

  it("keeps ASCII names and stops Arabic names colliding", () => {
    expect(fileStem("surah-1-2-3")).toBe("surah-1-2-3");
    expect(fileStem("sound-radio:9")).toBe("sound-radio_9");
    const a = "sound-archive:Naqshabandee/مولاي.mp3";
    const b = "sound-archive:Naqshabandee/ياربي.mp3";
    expect(legacyFileStem(a)).toBe(legacyFileStem(b));
    expect(fileStem(a)).not.toBe(fileStem(b));
    expect(fileStem(a)).toBe(`${legacyFileStem(a)}-${shortHash(a)}`);
  });
});

describe("downloadStore with normalized ids", () => {
  type Store = typeof import("@/features/downloads/downloadStore");
  const INDEX_KEY = "al-manara:downloads:v1";
  const load = (): Store => {
    let store!: Store;
    jest.isolateModules(() => {
      store = require("@/features/downloads/downloadStore");
    });
    return store;
  };

  it("finds a sound saved on the sounds screen from the adhan picker", async () => {
    fs.dirs.add("doc/audio");
    const store = load();
    await store.downloads.start({ id: "sound-archive:x/1.mp3", title: "أذان", artist: "مؤذن", url: "https://archive.org/download/x/1.mp3" });
    expect(store.localUriFor("adhan-voice-archive:x/1.mp3")).toBe(store.localUriFor("sound-archive:x/1.mp3"));
    expect(store.downloadEntry("adhan-voice-archive:x/1.mp3")?.status).toBe("done");
  });

  it("keeps old-named Arabic downloads, the newest owning a shared file", () => {
    const a = "sound-archive:N/مولاي.mp3";
    const b = "sound-archive:N/ياربي.mp3";
    const c = "sound-archive:N/الله.mp3";
    fs.dirs.add("doc/audio");
    fs.files.set(`doc/audio/${legacyFileStem(a)}.mp3`, new Uint8Array(10));
    fs.files.set(`doc/audio/${legacyFileStem(c)}.mp3`, new Uint8Array(10));
    const meta = (id: string, savedAt: number) => ({ id, title: id, artist: "م", url: "https://x", bytes: 10, savedAt });
    mockStore[INDEX_KEY] = JSON.stringify([meta(a, 1), meta(b, 2), meta(c, 3)]);
    const store = load();
    // a and b shared one old name; b was written last.
    expect(store.downloadEntry(a)).toBeUndefined();
    expect(store.localUriFor(b)).toBe(`doc/audio/${legacyFileStem(b)}.mp3`);
    expect(store.localUriFor(c)).toBe(`doc/audio/${legacyFileStem(c)}.mp3`);

    store.downloads.remove(c);
    expect(fs.files.has(`doc/audio/${legacyFileStem(c)}.mp3`)).toBe(false);
  });

  it("saves new Arabic downloads under distinct names", async () => {
    fs.dirs.add("doc/audio");
    const store = load();
    const a = { id: "sound-archive:N/مولاي.mp3", title: "١", artist: "م", url: "https://x/1.mp3" };
    const b = { id: "sound-archive:N/ياربي.mp3", title: "٢", artist: "م", url: "https://x/2.mp3" };
    await store.downloads.start(a);
    await store.downloads.start(b);
    expect(store.localUriFor(a.id)).not.toBe(store.localUriFor(b.id));
    expect(store.localUriFor(a.id)).toBe(`doc/audio/${fileStem(a.id)}.mp3`);
  });
});

describe("ayah packs from any entry point", () => {
  it("plays a saved ayah offline whatever the track id", () => {
    let packs!: typeof import("@/features/downloads/ayahPacks");
    jest.isolateModules(() => {
      packs = require("@/features/downloads/ayahPacks");
    });
    fs.dirs.add("doc/ayahs/husary/1");
    fs.files.set("doc/ayahs/husary/1/2.mp3", new Uint8Array(1024));
    mockStore["al-manara:ayah-packs:v1"] = JSON.stringify({ "husary:1": { count: 1, total: 7, bytes: 1024, savedAt: 1, complete: false } });
    // A queue built before the download still has the stream as its url.
    expect(packs.localAyahFor({ url: remoteAyahUrl("husary", 1, 2) })).toBe("doc/ayahs/husary/1/2.mp3");
    expect(packs.localAyahFor({ url: remoteAyahUrl("husary", 1, 3) })).toBeNull();
    expect(packs.localAyahFor({ url: remoteAyahUrl("alafasy", 1, 2) })).toBeNull();
  });
});
