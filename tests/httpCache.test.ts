/// <reference types="jest" />
import Storage from "expo-sqlite/kv-store";

import { CACHE_MAX_AGE_MS, cachedFetch, planPrune, resetCachePruneForTests } from "@/core/http";

jest.mock("expo-sqlite/kv-store", () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    store,
    default: {
      getItem: jest.fn(async (key: string) => store.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => void store.set(key, value)),
      getAllKeys: jest.fn(async () => [...store.keys()]),
      multiRemove: jest.fn(async (keys: string[]) => keys.forEach((key) => store.delete(key))),
    },
  };
});

const store = (jest.requireMock("expo-sqlite/kv-store") as { store: Map<string, string> }).store;
const DAY = 24 * 60 * 60 * 1000;

describe("planPrune", () => {
  const now = 100 * DAY;

  it("drops entries older than the max age and unreadable ones", () => {
    const { keep, remove } = planPrune({ fresh: now - DAY, old: now - CACHE_MAX_AGE_MS - 1, broken: NaN }, now);
    expect(keep).toEqual({ fresh: now - DAY });
    expect(remove.sort()).toEqual(["broken", "old"]);
  });

  it("caps the count, dropping the oldest", () => {
    const { keep, remove } = planPrune({ a: now - 3, b: now - 1, c: now - 2 }, now, CACHE_MAX_AGE_MS, 2);
    expect(Object.keys(keep).sort()).toEqual(["b", "c"]);
    expect(remove).toEqual(["a"]);
  });
});

describe("cachedFetch pruning", () => {
  beforeEach(() => {
    store.clear();
    resetCachePruneForTests();
  });

  it("prunes entries unused for too long once per session, keeping ones saved before the index existed", async () => {
    const now = Date.now();
    const entry = (savedAt: number) => JSON.stringify({ savedAt, status: 200, body: "{}" });
    store.set("http-cache:v1:https://unused", entry(now - 400 * DAY));
    store.set("http-cache:v1:https://legacy", entry(now - 400 * DAY));
    store.set("http-cache-index:v1", JSON.stringify({ "http-cache:v1:https://unused": now - CACHE_MAX_AGE_MS - DAY }));
    store.set("unrelated", "kept");

    globalThis.fetch = jest.fn(async () => new Response('{"ok":true}', { status: 200 })) as typeof fetch;
    const response = await cachedFetch("https://new", 60);
    expect(await response.text()).toBe('{"ok":true}');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(store.has("http-cache:v1:https://unused")).toBe(false);
    // Saved before the index: may be someone's only offline copy, so it counts as used now.
    expect(store.has("http-cache:v1:https://legacy")).toBe(true);
    expect(store.get("unrelated")).toBe("kept");
    const index = JSON.parse(store.get("http-cache-index:v1")!) as Record<string, number>;
    expect(Object.keys(index).sort()).toEqual(["http-cache:v1:https://legacy", "http-cache:v1:https://new"]);

    // A second fetch in the same session does not scan the store again.
    (Storage.getAllKeys as jest.Mock).mockClear();
    await cachedFetch("https://new", 60);
    expect(Storage.getAllKeys).not.toHaveBeenCalled();
  });
});
