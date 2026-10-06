/// <reference types="jest" />
import { fs } from "./fsMock";

const mockStore: Record<string, string> = {};
const mockDownloadHls = jest.fn();

jest.mock("expo-file-system", () => require("./fsMock").fileSystem);
jest.mock("expo-sqlite/kv-store", () => ({
  __esModule: true,
  default: { getItemSync: (key: string) => mockStore[key] ?? null, setItemSync: (key: string, value: string) => (mockStore[key] = value) },
}));
jest.mock("@/lib/telemetry", () => ({ track: jest.fn() }));
jest.mock("@/core/sounds/soundsApi", () => ({ getRadioMediaUrl: jest.fn(() => Promise.resolve("https://h.net/master.m3u8")) }));
jest.mock("@/features/downloads/hls", () => {
  const actual = jest.requireActual("@/features/downloads/hls");
  return { ...actual, downloadHls: (...args: unknown[]) => mockDownloadHls(...args) };
});

type Store = typeof import("@/features/downloads/downloadStore");
const INDEX_KEY = "al-manara:downloads:v1";

type Hls = typeof import("@/features/downloads/hls");

function load(): Store {
  return loadWithHls().store;
}

/** A fresh store (its in-memory index re-read), with the hls module from the same registry. */
function loadWithHls(): { store: Store; hls: Hls } {
  let store!: Store;
  let hls!: Hls;
  jest.isolateModules(() => {
    store = require("@/features/downloads/downloadStore");
    hls = require("@/features/downloads/hls");
  });
  return { store, hls };
}

const meta = (id: string, ext?: string) => ({ id, title: id, artist: "قارئ", url: `https://x/${id}.mp3`, bytes: 10, savedAt: 1, ...(ext ? { ext } : {}) });

beforeEach(() => {
  fs.reset();
  for (const key of Object.keys(mockStore)) delete mockStore[key];
  mockDownloadHls.mockReset();
  fs.dirs.add("doc/audio");
});

describe("downloadStore file extensions", () => {
  it("reads legacy entries (no ext) as mp3 and new ones with their ext", () => {
    fs.files.set("doc/audio/surah-1.mp3", new Uint8Array(10));
    fs.files.set("doc/audio/sound-radio_9.ts", new Uint8Array(10));
    mockStore[INDEX_KEY] = JSON.stringify([meta("surah-1"), meta("sound-radio:9", "ts"), meta("gone")]);
    const store = load();
    expect(store.localUriFor("surah-1")).toBe("doc/audio/surah-1.mp3");
    expect(store.localUriFor("sound-radio:9")).toBe("doc/audio/sound-radio_9.ts");
    // Its file was cleared by the OS.
    expect(store.localUriFor("gone")).toBeNull();
    expect(store.fileFor("a b").uri).toBe("doc/audio/a_b.mp3");
    expect(store.fileFor("a", "aac").uri).toBe("doc/audio/a.aac");
  });

  it("removes the file with the entry's own extension", () => {
    fs.files.set("doc/audio/x.aac", new Uint8Array(10));
    mockStore[INDEX_KEY] = JSON.stringify([meta("x", "aac")]);
    const store = load();
    store.downloads.remove("x");
    expect(fs.files.has("doc/audio/x.aac")).toBe(false);
    expect(JSON.parse(mockStore[INDEX_KEY])).toEqual([]);
  });

  it("cleans stale .part files on first use", () => {
    fs.files.set("doc/audio/half.part", new Uint8Array(3));
    fs.files.set("doc/audio/keep.mp3", new Uint8Array(3));
    load().localUriFor("anything");
    expect(fs.files.has("doc/audio/half.part")).toBe(false);
    expect(fs.files.has("doc/audio/keep.mp3")).toBe(true);
  });

  it("keeps HLS downloads hidden while the radio's streams are encrypted", () => {
    expect(load().canDownloadHls()).toBe(false);
  });
});

describe("downloadStore start", () => {
  const radio = { id: "sound-radio:9", title: "ابتهال", artist: "النقشبندي", url: "radio-ref:9" };

  it("saves an HLS recording with its extension (Android)", async () => {
    const { Platform } = require("react-native");
    const os = Platform.OS;
    Platform.OS = "android";
    try {
      mockDownloadHls.mockImplementation(async () => {
        fs.files.set("doc/audio/sound-radio_9.aac", new Uint8Array(42));
        return { file: { delete() {} }, ext: "aac", bytes: 42 };
      });
      const store = load();
      store.setHlsDownloadsEnabledForTests(true);
      await store.downloads.start(radio);
      expect(mockDownloadHls.mock.calls[0][0]).toBe("https://h.net/master.m3u8");
      expect(store.localUriFor(radio.id)).toBe("doc/audio/sound-radio_9.aac");
      expect(JSON.parse(mockStore[INDEX_KEY])[0]).toMatchObject({ id: radio.id, ext: "aac", bytes: 42 });

      // Reloaded from the index, the extension still points at the right file.
      expect(load().localUriFor(radio.id)).toBe("doc/audio/sound-radio_9.aac");
    } finally {
      Platform.OS = os;
    }
  });

  it("marks encrypted/live recordings unsupported without persisting them", async () => {
    const { Platform } = require("react-native");
    const os = Platform.OS;
    Platform.OS = "android";
    try {
      const { store, hls } = loadWithHls();
      store.setHlsDownloadsEnabledForTests(true);
      mockDownloadHls.mockRejectedValue(new hls.NotDownloadableError("encrypted"));
      await store.downloads.start(radio);
      expect(store.downloadEntry(radio.id)).toEqual({ status: "unsupported" });
      // A second tap doesn't try again.
      await store.downloads.start(radio);
      expect(store.localUriFor(radio.id)).toBeNull();
      expect(mockDownloadHls).toHaveBeenCalledTimes(1);
      expect(mockStore[INDEX_KEY]).toBe("[]");
    } finally {
      Platform.OS = os;
    }
  });

  it("is unsupported on iOS", async () => {
    const store = load();
    const { Platform } = require("react-native");
    if (Platform.OS === "android") return;
    await store.downloads.start(radio);
    expect(mockDownloadHls).not.toHaveBeenCalled();
    expect(store.downloadEntry(radio.id)).toEqual({ status: "unsupported" });
  });

  it("downloads plain files and treats cancel as no failure", async () => {
    const store = load();
    let release!: () => void;
    fs.download = () => new Promise((resolve) => (release = () => resolve(new Uint8Array(5))));
    const done = store.downloads.start({ id: "surah-2", title: "البقرة", artist: "قارئ", url: "https://x/2.mp3" });
    store.downloads.cancel("surah-2");
    release();
    await done;
    expect(store.localUriFor("surah-2")).toBeNull();
    expect(store.downloadEntry("surah-2")).toBeUndefined();

    fs.download = async () => new Uint8Array(5);
    await store.downloads.start({ id: "surah-2", title: "البقرة", artist: "قارئ", url: "https://x/2.mp3" });
    expect(store.localUriFor("surah-2")).toBe("doc/audio/surah-2.mp3");
  });
});
