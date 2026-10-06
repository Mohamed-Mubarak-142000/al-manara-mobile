/// <reference types="jest" />
const mockStore = new Map<string, string>();
jest.mock("expo-sqlite/kv-store", () => ({
  __esModule: true,
  default: {
    getItemSync: (key: string) => mockStore.get(key) ?? null,
    setItemSync: (key: string, value: string) => void mockStore.set(key, value),
    removeItemSync: (key: string) => mockStore.delete(key),
  },
}));
jest.mock("expo-constants", () => ({ __esModule: true, default: { expoConfig: { version: "1.2.3" } } }));

import { appendEntry, buildCrashReportText, clearCrashLog, parseNativeReport, readCrashLog, recordError, setCrashRoute, toEntry } from "@/lib/crashLog";

describe("crash log", () => {
  beforeEach(() => mockStore.clear());

  it("records errors newest first, keeping five, with the route", () => {
    setCrashRoute("/mushaf?page=3");
    for (let i = 0; i < 7; i++) recordError(new Error(`boom ${i}`), i === 6 ? "fatal" : "error");
    const log = readCrashLog();
    expect(log).toHaveLength(5);
    expect(log[0]).toMatchObject({ kind: "fatal", message: "Error: boom 6", route: "/mushaf?page=3", appVersion: "1.2.3" });
    expect(log[4].message).toBe("Error: boom 2");
    clearCrashLog();
    expect(readCrashLog()).toEqual([]);
  });

  it("handles non-Error values and trims long stacks", () => {
    expect(toEntry("plain", "promise").message).toBe("plain");
    expect(toEntry({ code: 1 }, "promise").message).toBe('{"code":1}');
    const err = new Error("x");
    err.stack = "s".repeat(10_000);
    expect(toEntry(err, "error").stack.length).toBe(4000);
    expect(appendEntry([], toEntry("a", "error"), 1)).toHaveLength(1);
  });

  it("survives corrupt storage and native JSON", () => {
    mockStore.set("al-manara:crash-log:v1", "{oops");
    expect(readCrashLog()).toEqual([]);
    expect(parseNativeReport(undefined)).toEqual({ native: [], exits: [] });
    expect(parseNativeReport("nope")).toEqual({ native: [], exits: [] });
  });

  it("builds a compact text report", () => {
    const text = buildCrashReportText(
      { appVersion: "1.2.3", os: "android API 34", device: "Samsung SM-A515F", now: 0 },
      [toEntry(new Error("bad"), "fatal", 0)],
      parseNativeReport(
        JSON.stringify({
          native: [{ at: 0, thread: "main", message: "java.lang.IllegalStateException: x", stack: "at a.b" }],
          exits: [{ at: 0, reason: "LOW_MEMORY", description: "lmk", importance: 400, status: 0, pssKb: 1, rssKb: 2 }],
        }),
      ),
    );
    expect(text).toContain("app 1.2.3");
    expect(text).toContain("LOW_MEMORY [cached]");
    expect(text).toContain("[main] java.lang.IllegalStateException: x");
    expect(text).toContain("fatal v1.2.3");
  });
});
