/**
 * An in-memory expo-file-system for tests: `files` maps path → bytes, `dirs` holds directories.
 * Use: jest.mock("expo-file-system", () => require("./fsMock").fileSystem);
 * Network downloads go through `fs.download`, which a test replaces.
 */
const state = {
  files: new Map<string, Uint8Array>(),
  dirs: new Set<string>(),
  download: async (_url: string): Promise<Uint8Array> => new Uint8Array(1024),
  reset() {
    this.files.clear();
    this.dirs.clear();
    this.download = async () => new Uint8Array(1024);
  },
};
// One shared state even when jest.isolateModules loads this file again.
const holder = globalThis as { __mockFs?: typeof state };
export const fs = (holder.__mockFs ??= state);

type Part = string | { uri: string };

function join(parts: Part[]): string {
  return parts
    .map((part) => (typeof part === "string" ? part : part.uri))
    .join("/")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");
}

function parentOf(path: string): string {
  return path.slice(0, path.lastIndexOf("/"));
}

class MockDirectory {
  uri: string;
  constructor(...parts: Part[]) {
    this.uri = join(parts);
  }
  get name() {
    return this.uri.slice(this.uri.lastIndexOf("/") + 1);
  }
  get exists() {
    return fs.dirs.has(this.uri);
  }
  create() {
    let path = this.uri;
    while (path) {
      fs.dirs.add(path);
      path = parentOf(path);
    }
  }
  delete() {
    for (const key of [...fs.files.keys()]) if (key.startsWith(`${this.uri}/`)) fs.files.delete(key);
    for (const key of [...fs.dirs]) if (key === this.uri || key.startsWith(`${this.uri}/`)) fs.dirs.delete(key);
  }
  list() {
    return [...fs.files.keys()].filter((key) => parentOf(key) === this.uri).map((key) => new MockFile(key));
  }
}

class MockFile {
  uri: string;
  constructor(...parts: Part[]) {
    this.uri = join(parts);
  }
  get name() {
    return this.uri.slice(this.uri.lastIndexOf("/") + 1);
  }
  get exists() {
    return fs.files.has(this.uri);
  }
  get size() {
    return fs.files.get(this.uri)?.length ?? 0;
  }
  create() {
    fs.files.set(this.uri, new Uint8Array(0));
  }
  delete() {
    fs.files.delete(this.uri);
  }
  rename(name: string) {
    const bytes = fs.files.get(this.uri);
    if (!bytes) throw new Error("missing");
    fs.files.delete(this.uri);
    this.uri = `${parentOf(this.uri)}/${name}`;
    fs.files.set(this.uri, bytes);
  }
  open() {
    const uri = this.uri;
    return {
      writeBytes(bytes: Uint8Array) {
        const current = fs.files.get(uri) ?? new Uint8Array(0);
        const next = new Uint8Array(current.length + bytes.length);
        next.set(current);
        next.set(bytes, current.length);
        fs.files.set(uri, next);
      },
      close() {},
    };
  }
  static createDownloadTask(url: string, destination: MockFile) {
    let cancelled = false;
    return {
      async downloadAsync() {
        const bytes = await fs.download(url);
        if (cancelled) throw new Error("cancelled");
        if (!fs.dirs.has(parentOf(destination.uri))) throw new Error("no folder");
        fs.files.set(destination.uri, bytes);
        return destination;
      },
      cancel() {
        cancelled = true;
      },
    };
  }
}

export const fileSystem = {
  File: MockFile,
  Directory: MockDirectory,
  Paths: { document: "doc" },
  FileMode: { Append: "wa" },
};
