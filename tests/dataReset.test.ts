/// <reference types="jest" />
const mockStore = new Map<string, string>();
const mockDeleted: string[] = [];

jest.mock("expo-sqlite/kv-store", () => ({
  __esModule: true,
  default: {
    getItemSync: (key: string) => mockStore.get(key) ?? null,
    setItemSync: (key: string, value: string) => void mockStore.set(key, value),
    clearSync: () => mockStore.clear(),
  },
}));
jest.mock("expo-file-system", () => ({
  Paths: { document: "doc" },
  Directory: class {
    list() {
      return ["SQLite", "recitations", "hadith.json"].map((name) => ({ name, delete: () => mockDeleted.push(name) }));
    }
  },
}));

describe("data reset", () => {
  it("wipes the downloads but leaves the open SQLite folder, and marks the version", () => {
    mockStore.set("al-manara:session", "old");
    // The reset runs on import, so the module loads only after the store is filled.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    jest.isolateModules(() => require("@/lib/dataReset"));
    expect(mockDeleted).toEqual(["recitations", "hadith.json"]);
    expect(mockStore.get("al-manara:session")).toBeUndefined();
    expect(mockStore.get("al-manara:data-version")).toBe("1");
  });
});
