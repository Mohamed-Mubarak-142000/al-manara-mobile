/// <reference types="jest" />
import * as api from "@/core/hadith/api";
import { hadithPacks, packState, readPack, resetHadithPacksForTests } from "@/features/hadith/hadithPacks";
import { getCategoryHadithsOffline, getHadithOffline, getHadithOfTheDayOffline } from "@/features/hadith/offlineHadith";

jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  const join = (parts: unknown[]) => parts.map((part) => (typeof part === "string" ? part : (part as { uri: string }).uri)).join("/");
  class Directory {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    get exists() {
      return true;
    }
    create() {}
  }
  class File {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    get exists() {
      return files.has(this.uri);
    }
    get size() {
      return files.get(this.uri)?.length ?? null;
    }
    write(text: string) {
      files.set(this.uri, text);
    }
    async text() {
      const text = files.get(this.uri);
      if (text === undefined) throw new Error("missing");
      return text;
    }
    delete() {
      files.delete(this.uri);
    }
  }
  return { __esModule: true, files, File, Directory, Paths: { document: { uri: "doc" } } };
});

jest.mock("expo-sqlite/kv-store", () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    store,
    default: {
      getItemSync: (key: string) => store.get(key) ?? null,
      setItemSync: (key: string, value: string) => void store.set(key, value),
    },
  };
});

jest.mock("@/core/http", () => ({ cachedFetch: jest.fn() }));

const files = (jest.requireMock("expo-file-system") as { files: Map<string, string> }).files;
const kv = (jest.requireMock("expo-sqlite/kv-store") as { store: Map<string, string> }).store;

const CATEGORIES: api.HadithCategory[] = [
  { id: "5", title: "الفضائل والآداب", count: 3, parentId: null },
  { id: "50", title: "فضائل الأعمال", count: 2, parentId: "5" },
  { id: "500", title: "فضل الذكر", count: 1, parentId: "50" },
  { id: "6", title: "الدعوة والحسبة", count: 1, parentId: null },
];
const LIST = [
  { id: "1", title: "حديث ١" },
  { id: "2", title: "حديث ٢" },
  { id: "3", title: "حديث ٣" },
];
const TOPICS: Record<string, string[]> = { "1": ["500"], "2": ["50"], "3": ["5"] };

function rawHadith(id: string) {
  return {
    id,
    title: `حديث ${id}`,
    hadeeth: `نص ${id}`,
    attribution: "متفق عليه",
    grade: "صحيح",
    explanation: "شرح",
    categories: TOPICS[id],
  };
}

let fetchMock: jest.Mock;
let failDetails = false;

function json(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

beforeEach(() => {
  files.clear();
  kv.clear();
  resetHadithPacksForTests();
  failDetails = false;
  jest.spyOn(api, "getCategories").mockResolvedValue(CATEGORIES);
  fetchMock = jest.fn(async (url: string) => {
    if (url.includes("/hadeeths/list/")) {
      return json({ data: LIST, meta: { current_page: "1", last_page: 1, total_items: LIST.length } });
    }
    if (failDetails) throw new TypeError("Network request failed");
    const id = /id=(\d+)/.exec(url)![1]!;
    return json(rawHadith(id));
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => jest.restoreAllMocks());

describe("hadith pack store", () => {
  it("goes missing → downloading → ready, and writes the pack and the index", async () => {
    expect(packState("5").status).toBe("missing");
    const seen: string[] = [];
    const download = hadithPacks.download("5");
    seen.push(packState("5").status);
    await download;
    seen.push(packState("5").status);
    expect(seen).toEqual(["downloading", "ready"]);

    const pack = await readPack("5");
    expect(pack?.items.map((item) => item.id)).toEqual(["1", "2", "3"]);
    expect(Object.keys(pack!.hadiths).sort()).toEqual(["1", "2", "3"]);
    const index = JSON.parse(kv.get("al-manara:hadith-packs:v1")!);
    expect(index["5"].ids.sort()).toEqual(["1", "2", "3"]);
    expect(index["5"].bytes).toBeGreaterThan(0);
    expect(files.has("doc/hadith/categories.json")).toBe(true);
  });

  it("fails with a message when the network keeps failing, and leaves nothing behind", async () => {
    failDetails = true;
    jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate"] });
    const download = hadithPacks.download("5");
    for (let i = 0; i < 20; i += 1) await jest.advanceTimersByTimeAsync(2000);
    await download;
    jest.useRealTimers();
    const state = packState("5");
    expect(state.status).toBe("failed");
    expect(state.status === "failed" && state.message).toMatch(/الإنترنت/);
    expect(files.has("doc/hadith/5.json")).toBe(false);
  });

  it("cancel returns to missing", async () => {
    const download = hadithPacks.download("5");
    hadithPacks.cancel("5");
    await download;
    expect(packState("5").status).toBe("missing");
    expect(files.has("doc/hadith/5.json")).toBe(false);
  });

  it("remove deletes the file and the index entry", async () => {
    await hadithPacks.download("5");
    hadithPacks.remove("5");
    expect(packState("5").status).toBe("missing");
    expect(files.has("doc/hadith/5.json")).toBe(false);
    expect(JSON.parse(kv.get("al-manara:hadith-packs:v1")!)["5"]).toBeUndefined();
  });

  it("download all queues every root topic", async () => {
    await hadithPacks.downloadAll();
    expect(packState("5").status).toBe("ready");
    expect(packState("6").status).toBe("ready");
  });

  it("forgets packs whose file the OS removed", async () => {
    await hadithPacks.download("5");
    files.delete("doc/hadith/5.json");
    resetHadithPacksForTests();
    expect(packState("5").status).toBe("missing");
  });
});

describe("offline readers", () => {
  it("fall back to the core API when nothing is downloaded", async () => {
    const page = jest.spyOn(api, "getCategoryHadiths").mockResolvedValue({ items: [LIST[0]!], page: 1, lastPage: 1, total: 1 });
    const one = jest.spyOn(api, "getHadith").mockResolvedValue(null);
    expect((await getCategoryHadithsOffline("5", 1)).total).toBe(1);
    expect(await getHadithOffline("1")).toBeNull();
    expect(page).toHaveBeenCalledWith("5", 1);
    expect(one).toHaveBeenCalledWith("1");
  });

  it("answer from the pack, including sub-topics, without the API", async () => {
    await hadithPacks.download("5");
    const page = jest.spyOn(api, "getCategoryHadiths");
    const one = jest.spyOn(api, "getHadith");
    expect((await getCategoryHadithsOffline("5", 1)).items.map((item) => item.id)).toEqual(["1", "2", "3"]);
    // 50 holds hadith 2 directly and hadith 1 through its child 500.
    expect((await getCategoryHadithsOffline("50", 1)).items.map((item) => item.id)).toEqual(["1", "2"]);
    expect((await getCategoryHadithsOffline("500", 1)).items.map((item) => item.id)).toEqual(["1"]);
    expect((await getHadithOffline("2"))?.text).toBe("نص 2");
    const daily = await getHadithOfTheDayOffline("2026-10-06");
    expect(["1", "2", "3"]).toContain(daily?.id);
    expect(page).not.toHaveBeenCalled();
    expect(one).not.toHaveBeenCalled();
  });
});
