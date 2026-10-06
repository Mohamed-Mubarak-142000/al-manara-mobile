/// <reference types="jest" />
import { fs } from "./fsMock";

const mockStore: Record<string, string> = {};

jest.mock("expo-file-system", () => require("./fsMock").fileSystem);
jest.mock("expo-sqlite/kv-store", () => ({
  __esModule: true,
  default: { getItemSync: (key: string) => mockStore[key] ?? null, setItemSync: (key: string, value: string) => (mockStore[key] = value) },
}));

type Packs = typeof import("@/features/downloads/ayahPacks");
const INDEX_KEY = "al-manara:ayah-packs:v1";

function load(): Packs {
  let packs!: Packs;
  jest.isolateModules(() => {
    packs = require("@/features/downloads/ayahPacks");
  });
  return packs;
}

beforeEach(() => {
  fs.reset();
  for (const key of Object.keys(mockStore)) delete mockStore[key];
});

describe("ayah audio URLs", () => {
  const { globalAyahNumber, remoteAyahUrl } = jest.requireActual("@/core/quran/ayahAudio") as typeof import("@/core/quran/ayahAudio");

  it("maps surah:ayah to the global ayah number", () => {
    expect(globalAyahNumber(1, 1)).toBe(1);
    expect(globalAyahNumber(2, 1)).toBe(8);
    expect(globalAyahNumber(114, 6)).toBe(6236);
    expect(globalAyahNumber(1, 8)).toBe(0);
    expect(globalAyahNumber(115, 1)).toBe(0);
  });

  it("builds each voice's URL", () => {
    expect(remoteAyahUrl("husary", 2, 1)).toBe("https://cdn.islamic.network/quran/audio/128/ar.husary/8.mp3");
    expect(remoteAyahUrl("alafasy", 1, 7)).toBe("https://cdn.islamic.network/quran/audio/128/ar.alafasy/7.mp3");
    expect(remoteAyahUrl("muallim", 2, 255)).toBe("https://everyayah.com/data/Husary_Muallim_128kbps/002255.mp3");
  });
});

describe("ayah packs", () => {
  it("keys and paths", () => {
    const packs = load();
    expect(packs.packKey("husary", 18)).toBe("husary:18");
    expect(packs.parsePackKey("muallim:114")).toEqual({ voice: "muallim", surah: 114 });
    expect(packs.parsePackKey("nobody:1")).toBeNull();
    expect(packs.parsePackKey("husary:0")).toBeNull();
    expect(packs.ayahFile("alafasy", 2, 255).uri).toBe("doc/ayahs/alafasy/2/255.mp3");
  });

  it("streams when nothing is saved", () => {
    const packs = load();
    expect(packs.packState("husary", 1)).toEqual({ status: "missing" });
    expect(packs.ayahSource("husary", 1, 1)).toEqual({ url: "https://cdn.islamic.network/quran/audio/128/ar.husary/1.mp3" });
  });

  it("downloads a surah, then plays from the device with the stream as backup", async () => {
    const packs = load();
    const fetched: string[] = [];
    fs.download = async (url) => {
      fetched.push(url);
      return new Uint8Array(2000);
    };
    await packs.downloadSurah("husary", 1);
    expect(fetched).toHaveLength(7);
    expect(packs.packState("husary", 1)).toEqual({ status: "ready", total: 7, bytes: 14000 });
    expect(JSON.parse(mockStore[INDEX_KEY])["husary:1"]).toMatchObject({ count: 7, total: 7, bytes: 14000, complete: true });
    expect(packs.ayahSource("husary", 1, 3)).toEqual({
      url: "doc/ayahs/husary/1/3.mp3",
      fallbackUrls: ["https://cdn.islamic.network/quran/audio/128/ar.husary/3.mp3"],
    });
    expect(packs.ayahUrl("alafasy", 1, 3)).toBe("https://cdn.islamic.network/quran/audio/128/ar.alafasy/3.mp3");
    // No temporary files left.
    expect([...fs.files.keys()].some((key) => key.endsWith(".part"))).toBe(false);

    // The index survives a restart.
    const again = load();
    expect(again.allAyahPacks()).toEqual([{ voice: "husary", surah: 1, entry: expect.objectContaining({ count: 7, complete: true }) }]);

    again.removeSurah("husary", 1);
    expect(again.packState("husary", 1)).toEqual({ status: "missing" });
    expect(fs.files.size).toBe(0);
    expect(JSON.parse(mockStore[INDEX_KEY])).toEqual({});
  });

  it("keeps finished ayahs when an ayah fails and resumes only the rest", async () => {
    jest.useFakeTimers();
    try {
      const packs = load();
      fs.download = async (url) => (url.endsWith("/5.mp3") ? new Uint8Array(10) : new Uint8Array(2000));
      const run = packs.downloadSurah("alafasy", 1);
      await jest.runAllTimersAsync();
      await run;
      expect(packs.packState("alafasy", 1)).toEqual({ status: "partial", count: 6, total: 7, bytes: 12000, failed: true });
      expect(packs.ayahSource("alafasy", 1, 5).url).toMatch(/^https:/);

      const fetched: string[] = [];
      fs.download = async (url) => {
        fetched.push(url);
        return new Uint8Array(2000);
      };
      await packs.downloadSurah("alafasy", 1);
      expect(fetched).toEqual(["https://cdn.islamic.network/quran/audio/128/ar.alafasy/5.mp3"]);
      expect(packs.packState("alafasy", 1)).toMatchObject({ status: "ready" });
    } finally {
      jest.useRealTimers();
    }
  });

  it("cancel keeps what finished as a partial pack", async () => {
    const packs = load();
    let calls = 0;
    const waiting: (() => void)[] = [];
    fs.download = (url) => {
      calls += 1;
      // The first four finish; the rest hang until released.
      if (calls <= 4) return Promise.resolve(new Uint8Array(2000));
      return new Promise((resolve) => waiting.push(() => resolve(new Uint8Array(2000))));
    };
    const run = packs.downloadSurah("muallim", 1);
    for (let i = 0; i < 20; i += 1) await Promise.resolve();
    expect(packs.packState("muallim", 1)).toMatchObject({ status: "downloading", total: 7 });
    packs.cancelSurah("muallim", 1);
    waiting.forEach((release) => release());
    await run;
    const state = packs.packState("muallim", 1);
    expect(state).toMatchObject({ status: "partial", total: 7, failed: false });
    expect(state.status === "partial" && state.count).toBeGreaterThanOrEqual(4);
    expect(state.status === "partial" && state.count).toBeLessThan(7);
  });
});
