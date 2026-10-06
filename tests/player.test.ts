/// <reference types="jest" />
import { miniPlayerPlacement } from "@/features/audio/miniPlayerLayout";
import { filterSurahs } from "@/features/listen/surahFilter";

const mockPlayer = {
  listener: null as null | ((status: object) => void),
  addListener(_: string, listener: (status: object) => void) {
    this.listener = listener;
  },
  replace: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
  seekTo: jest.fn(() => Promise.resolve()),
  setPlaybackRate: jest.fn(),
  setActiveForLockScreen: jest.fn(),
  clearLockScreenControls: jest.fn(),
};
const mockStore: Record<string, string> = {};

jest.mock("expo-audio", () => ({ createAudioPlayer: () => mockPlayer, setAudioModeAsync: () => Promise.resolve() }));
jest.mock("expo-sqlite/kv-store", () => ({
  __esModule: true,
  default: { getItemSync: (key: string) => mockStore[key] ?? null, setItemSync: (key: string, value: string) => (mockStore[key] = value) },
}));
jest.mock("@/core/sounds/soundsApi", () => ({ getRadioMediaUrl: jest.fn() }));
jest.mock("@/features/downloads/downloadStore", () => ({ localUriFor: () => null }));
jest.mock("@/features/downloads/ayahPacks", () => ({ localAyahFor: () => null }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const player = require("@/features/audio/playerStore") as typeof import("@/features/audio/playerStore");

const status = (patch: object) => ({
  playing: false,
  isBuffering: true,
  isLoaded: false,
  currentTime: 0,
  duration: 0,
  error: null,
  didJustFinish: false,
  ...patch,
});
// load() only awaits resolved promises here, so draining microtasks is enough (and works under fake timers).
const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

describe("player prefs", () => {
  it("cycles speeds from 0.5 to 2", () => {
    expect(player.PLAYBACK_RATES).toEqual([0.5, 0.75, 1, 1.25, 1.5, 2]);
    expect(player.nextRate(2)).toBe(0.5);
    expect(player.nextRate(1)).toBe(1.25);
    expect(player.nextRate(3)).toBe(0.5);
  });

  it("restores only valid saved values", () => {
    const track = { id: "t", title: "سورة الفاتحة", artist: "قارئ", url: "https://x/1.mp3" };
    expect(player.parseSaved(JSON.stringify({ rate: 1.5, repeat: "all", queue: [track], index: 0, position: 42, duration: 90 }))).toEqual({
      rate: 1.5,
      repeat: "all",
      queue: [track],
      index: 0,
      currentTime: 42,
      duration: 90,
    });
    expect(player.parseSaved(JSON.stringify({ rate: 7, repeat: "x", queue: [], index: 3 }))).toEqual({});
    expect(player.parseSaved("{not json")).toEqual({});
    expect(player.parseSaved(JSON.stringify({ queue: [{ ...track, live: true }], index: 0, position: 42 })).currentTime).toBe(0);
  });
});

describe("playback errors", () => {
  afterEach(() => {
    jest.useRealTimers();
    player.audio.stop();
  });

  it("gives up on a track with no backups that stalls, and remembers it", async () => {
    jest.useFakeTimers();
    player.audio.playTrack({ id: "a", title: "سورة البقرة", artist: "قارئ", url: "https://x/2.mp3" });
    await flush();
    expect(mockPlayer.play).toHaveBeenCalled();
    mockPlayer.listener?.(status({}));
    expect(player.getPlayerState().error).toBe(false);
    jest.advanceTimersByTime(13_000);
    expect(player.getPlayerState()).toMatchObject({ error: true, buffering: false, playing: false });
    expect(JSON.parse(mockStore["al-manara:player:v1"]!).queue[0].id).toBe("a");
  });

  it("fails at once when the stream reports an error, and retries from the same spot", async () => {
    player.audio.playTrack({ id: "b", title: "سورة يس", artist: "قارئ", url: "https://x/36.mp3" });
    await flush();
    mockPlayer.listener?.(status({ playing: true, isBuffering: false, isLoaded: true, currentTime: 30, duration: 600 }));
    mockPlayer.listener?.(status({ error: "offline", isBuffering: false, isLoaded: true, currentTime: 31, duration: 600 }));
    expect(player.getPlayerState().error).toBe(true);
    mockPlayer.replace.mockClear();
    player.audio.toggle();
    await flush();
    expect(mockPlayer.replace).toHaveBeenCalled();
    expect(player.getPlayerState()).toMatchObject({ error: false, currentTime: 30 });
  });
});

describe("mini player placement", () => {
  it("sits above the tab bar on tabs and hides where it is in the way", () => {
    expect(miniPlayerPlacement(["(tabs)", "listen"])).toBe("tabs");
    expect(miniPlayerPlacement([])).toBe("tabs");
    expect(miniPlayerPlacement(["player"])).toBe("hidden");
    expect(miniPlayerPlacement(["mushaf"])).toBe("hidden");
    expect(miniPlayerPlacement(["login"])).toBe("hidden");
    expect(miniPlayerPlacement(["listen", "[reciterId]"])).toBe("bottom");
  });
});

describe("surah filter", () => {
  const rows = [
    { surah: 1, name: "الفاتحة" },
    { surah: 18, name: "الكهف" },
    { surah: 36, name: "يس" },
  ];
  it("matches names and Arabic or Latin numbers", () => {
    expect(filterSurahs(rows, "كهف").map((row) => row.surah)).toEqual([18]);
    expect(filterSurahs(rows, "سورة الكهف").map((row) => row.surah)).toEqual([18]);
    expect(filterSurahs(rows, "١٨").map((row) => row.surah)).toEqual([18]);
    expect(filterSurahs(rows, "3").map((row) => row.surah)).toEqual([36]);
    expect(filterSurahs(rows, " ")).toHaveLength(3);
  });
});
