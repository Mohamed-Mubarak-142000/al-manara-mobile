import { Directory, File, Paths } from "expo-file-system";
import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";

import {
  getCategories,
  HADEETHENC_API,
  hadithListPath,
  hadithPath,
  parseHadith,
  parseHadithPage,
  type Hadith,
  type HadithCategory,
  type HadithSummary,
  type RawHadith,
  type RawHadithPage,
} from "@/core/hadith/api";

/**
 * Offline hadith packs: one file per top-level topic (categories with no parent), holding its list and
 * every hadith in full, at Paths.document/hadith/{categoryId}.json. The ~4,270 hadiths don't fit the http
 * cache (capped at 2000 entries), so packs bypass it and are fetched straight from HadeethEnc.com with the
 * core parsers. A root topic's list already includes all its sub-topics' hadiths, so a root pack also
 * answers its sub-topics (see offlineHadith.ts). The kv index remembers each ready pack's size and hadith
 * ids, so a single hadith can be found without reading every pack.
 */

export interface HadithPack {
  category: HadithCategory;
  items: HadithSummary[];
  hadiths: Record<string, Hadith>;
}

export type HadithPackState =
  | { status: "missing" }
  | { status: "downloading"; progress: number }
  | { status: "ready"; bytes: number; savedAt: number }
  | { status: "failed"; message: string };

interface IndexEntry {
  title: string;
  bytes: number;
  savedAt: number;
  ids: string[];
}

const INDEX_KEY = "al-manara:hadith-packs:v1";
const CONCURRENCY = 4;
const ATTEMPTS = 3;
/** The API allows big pages; 100 per request keeps a 1,800-hadith topic to 19 list calls. */
const LIST_PAGE_SIZE = 100;
const OFFLINE_MESSAGE = "تعذّر التنزيل، تحقّق من اتصالك بالإنترنت ثم أعد المحاولة.";
const SAVE_MESSAGE = "تعذّر حفظ الأحاديث على الجهاز، تحقّق من المساحة المتاحة.";

const dir = new Directory(Paths.document, "hadith");

let index: Record<string, IndexEntry> | null = null;
const active = new Map<string, HadithPackState>();
const controllers = new Map<string, AbortController>();
const packCache = new Map<string, HadithPack>();
let queue: string[] = [];
let queueRunning = false;
let snapshot: Record<string, HadithPackState> = {};
let snapshotBuilt = false;
const listeners = new Set<() => void>();

class Cancelled extends Error {}
class NetworkError extends Error {}

function fileFor(categoryId: string): File {
  return new File(dir, `${categoryId.replace(/[^\w-]/g, "_")}.json`);
}

function categoriesFile(): File {
  return new File(dir, "categories.json");
}

function loadIndex(): Record<string, IndexEntry> {
  if (index) return index;
  index = {};
  try {
    const saved = JSON.parse(Storage.getItemSync(INDEX_KEY) ?? "{}") as Record<string, IndexEntry>;
    // The OS can clear files behind our back; only trust entries whose file still exists.
    for (const [id, entry] of Object.entries(saved)) if (Array.isArray(entry?.ids) && fileFor(id).exists) index[id] = entry;
  } catch {
    // A corrupt index only forgets the packs; they can be downloaded again.
  }
  return index;
}

function saveIndex(next: Record<string, IndexEntry>) {
  index = next;
  try {
    Storage.setItemSync(INDEX_KEY, JSON.stringify(next));
  } catch {
    // Keep the in-memory index.
  }
}

function rebuildSnapshot() {
  const next: Record<string, HadithPackState> = {};
  for (const [id, entry] of Object.entries(loadIndex())) next[id] = { status: "ready", bytes: entry.bytes, savedAt: entry.savedAt };
  for (const [id, state] of active) next[id] = state;
  snapshot = next;
  snapshotBuilt = true;
}

function notify() {
  rebuildSnapshot();
  listeners.forEach((listener) => listener());
}

function setActive(id: string, state: HadithPackState | null) {
  if (state) active.set(id, state);
  else active.delete(id);
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** GETs JSON with retries; null for a 404 (a hadith that's gone), NetworkError when it never succeeds. */
async function fetchJson<T>(path: string, signal: AbortSignal): Promise<T | null> {
  for (let attempt = 1; ; attempt += 1) {
    if (signal.aborted) throw new Cancelled();
    try {
      const response = await fetch(`${HADEETHENC_API}${path}`, { signal });
      if (response.status === 404) return null;
      if (!response.ok) throw new NetworkError(`HTTP ${response.status}`);
      return (await response.json()) as T;
    } catch (error) {
      if (signal.aborted) throw new Cancelled();
      if (attempt >= ATTEMPTS) throw error instanceof NetworkError ? error : new NetworkError(String(error));
      await wait(500 * 2 ** (attempt - 1));
    }
  }
}

async function pool<T>(items: readonly T[], run: (item: T) => Promise<void>, signal: AbortSignal) {
  let next = 0;
  // One worker failing fails the pool; the others stop taking items instead of downloading on.
  let failed = false;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (next < items.length && !failed) {
        if (signal.aborted) throw new Cancelled();
        try {
          await run(items[next++]!);
        } catch (error) {
          failed = true;
          throw error;
        }
      }
    }),
  );
}

function ensureDir() {
  if (!dir.exists) dir.create({ intermediates: true });
}

function writeCategories(categories: HadithCategory[]) {
  try {
    ensureDir();
    categoriesFile().write(JSON.stringify(categories));
  } catch {
    // Only the offline topic list is lost; packs still work by id.
  }
}

async function fetchCategories(): Promise<HadithCategory[]> {
  const list = await getCategories();
  if (list.length) writeCategories(list);
  return list.length ? list : ((await readSavedCategories()) ?? []);
}

async function runDownload(categoryId: string, controller: AbortController) {
  const { signal } = controller;
  let reported = 0;
  const report = (progress: number) => {
    // A request still in flight after this download failed or was replaced must not revive its ring.
    if (controllers.get(categoryId) !== controller) return;
    // A 1% step is plenty for a ring and keeps re-renders down.
    if (progress - reported >= 0.01 || progress === 0) {
      reported = progress;
      setActive(categoryId, { status: "downloading", progress });
    }
  };
  report(0);

  const categories = await fetchCategories();
  const category = categories.find((entry) => entry.id === categoryId);
  if (!category) throw new NetworkError("unknown category");

  const first = parseHadithPage(await fetchJson<RawHadithPage>(hadithListPath(categoryId, 1, LIST_PAGE_SIZE), signal), 1);
  if (!first.items.length) throw new NetworkError("empty list");
  const units = first.lastPage + first.total;
  let done = 1;
  const pages: HadithSummary[][] = [first.items];
  const rest = Array.from({ length: Math.max(0, first.lastPage - 1) }, (_, index) => index + 2);
  await pool(
    rest,
    async (page) => {
      const parsed = parseHadithPage(await fetchJson<RawHadithPage>(hadithListPath(categoryId, page, LIST_PAGE_SIZE), signal), page);
      if (!parsed.items.length) throw new NetworkError(`empty page ${page}`);
      pages[page - 1] = parsed.items;
      done += 1;
      report(done / units);
    },
    signal,
  );

  // A hadith can sit in two sub-topics of the same root; keep the first.
  const seen = new Set<string>();
  const items = pages.flat().filter((item) => !seen.has(item.id) && seen.add(item.id));
  const hadiths: Record<string, Hadith> = {};
  await pool(
    items,
    async (item) => {
      const hadith = parseHadith(await fetchJson<RawHadith>(hadithPath(item.id), signal));
      if (hadith) hadiths[item.id] = hadith;
      done += 1;
      report(Math.min(1, done / units));
    },
    signal,
  );
  // A few hadiths may be gone from the API; those just stay online-only. More than that is a failure.
  const missing = items.length - Object.keys(hadiths).length;
  if (missing > Math.max(2, items.length * 0.02)) throw new NetworkError(`${missing} hadiths missing`);
  if (signal.aborted) throw new Cancelled();

  const pack: HadithPack = { category, items, hadiths };
  const file = fileFor(categoryId);
  try {
    ensureDir();
    const text = JSON.stringify(pack);
    if (file.exists) file.delete();
    file.write(text);
    const bytes = file.size ?? text.length;
    packCache.delete(categoryId);
    saveIndex({ ...loadIndex(), [categoryId]: { title: category.title, bytes, savedAt: Date.now(), ids: Object.keys(hadiths) } });
  } catch {
    if (file.exists) file.delete();
    throw new Error(SAVE_MESSAGE);
  }
}

async function download(categoryId: string) {
  if (controllers.has(categoryId)) return;
  const controller = new AbortController();
  controllers.set(categoryId, controller);
  try {
    await runDownload(categoryId, controller);
    setActive(categoryId, null);
  } catch (error) {
    if (error instanceof Cancelled || controller.signal.aborted) setActive(categoryId, null);
    else
      setActive(categoryId, {
        status: "failed",
        // Only the save failure has its own message; anything else (a malformed response too) is the network's.
        message: error instanceof Error && error.message === SAVE_MESSAGE ? SAVE_MESSAGE : OFFLINE_MESSAGE,
      });
  } finally {
    controllers.delete(categoryId);
  }
}

async function runQueue() {
  if (queueRunning) return;
  queueRunning = true;
  notify();
  try {
    while (queue.length) {
      const next = queue.shift()!;
      if (loadIndex()[next]) continue;
      await download(next);
    }
  } finally {
    queueRunning = false;
    notify();
  }
}

export const hadithPacks = {
  /** Downloads one root topic (no-op while it's already downloading). */
  download(categoryId: string): Promise<void> {
    return download(categoryId);
  },
  cancel(categoryId: string) {
    queue = queue.filter((id) => id !== categoryId);
    controllers.get(categoryId)?.abort();
  },
  /** Queues every root topic that isn't downloaded yet, one after another. */
  async downloadAll(): Promise<void> {
    const roots = (await fetchCategories()).filter((category) => category.parentId === null).map((category) => category.id);
    const ready = loadIndex();
    for (const id of roots) if (!ready[id] && !queue.includes(id) && !controllers.has(id)) queue.push(id);
    await runQueue();
  },
  cancelAll() {
    queue = [];
    for (const controller of controllers.values()) controller.abort();
  },
  remove(categoryId: string) {
    hadithPacks.cancel(categoryId);
    const file = fileFor(categoryId);
    try {
      if (file.exists) file.delete();
    } catch {
      // Forget it anyway; a leftover file is overwritten by the next download.
    }
    packCache.delete(categoryId);
    const next = { ...loadIndex() };
    delete next[categoryId];
    saveIndex(next);
    active.delete(categoryId);
    notify();
  },
  removeAll() {
    for (const id of Object.keys(loadIndex())) hadithPacks.remove(id);
  },
};

/** Every known pack's state (ready, downloading, failed); missing ones are absent. */
function getSnapshot(): Record<string, HadithPackState> {
  // Not `!index`: another reader (isPackReady, packIdForHadith) may have loaded the index first.
  if (!snapshotBuilt) rebuildSnapshot();
  return snapshot;
}

export function useHadithPacks(): Record<string, HadithPackState> {
  return useSyncExternalStore(subscribe, getSnapshot);
}

const MISSING: HadithPackState = { status: "missing" };

export function useHadithPack(categoryId: string): HadithPackState {
  return useSyncExternalStore(subscribe, () => getSnapshot()[categoryId] ?? MISSING);
}

/** Whether "download all" is working through its queue. */
export function useDownloadAllRunning(): boolean {
  return useSyncExternalStore(subscribe, () => queueRunning);
}

export function packState(categoryId: string): HadithPackState {
  return getSnapshot()[categoryId] ?? MISSING;
}

/** Overall progress (0..1) across topics, weighted by each topic's hadith count. */
export function overallProgress(roots: readonly HadithCategory[], states: Record<string, HadithPackState>): number {
  const total = roots.reduce((sum, root) => sum + Math.max(1, root.count), 0);
  if (!total) return 0;
  const done = roots.reduce((sum, root) => {
    const state = states[root.id];
    const weight = Math.max(1, root.count);
    return sum + (state?.status === "ready" ? weight : state?.status === "downloading" ? weight * state.progress : 0);
  }, 0);
  return done / total;
}

/** Ready packs, for the downloads screen. */
export function readyPacks(): { id: string; title: string; bytes: number; savedAt: number; count: number }[] {
  return Object.entries(loadIndex()).map(([id, entry]) => ({
    id,
    title: entry.title,
    bytes: entry.bytes,
    savedAt: entry.savedAt,
    count: entry.ids.length,
  }));
}

/** The ready pack that holds hadith `hadithId`, if any. */
export function packIdForHadith(hadithId: string): string | null {
  for (const [id, entry] of Object.entries(loadIndex())) if (entry.ids.includes(hadithId)) return id;
  return null;
}

export function isPackReady(categoryId: string): boolean {
  return Boolean(loadIndex()[categoryId]);
}

/** Reads a downloaded pack (the two most recent stay in memory: a topic's list and its hadiths). */
export async function readPack(categoryId: string): Promise<HadithPack | null> {
  if (!loadIndex()[categoryId]) return null;
  const cached = packCache.get(categoryId);
  if (cached) return cached;
  try {
    const pack = JSON.parse(await fileFor(categoryId).text()) as HadithPack;
    packCache.set(categoryId, pack);
    while (packCache.size > 2) packCache.delete(packCache.keys().next().value!);
    return pack;
  } catch {
    return null;
  }
}

/** The topic list saved with the last download, for browsing offline. */
export async function readSavedCategories(): Promise<HadithCategory[] | null> {
  try {
    const file = categoriesFile();
    if (!file.exists) return null;
    const list = JSON.parse(await file.text()) as HadithCategory[];
    return Array.isArray(list) && list.length ? list : null;
  } catch {
    return null;
  }
}

/** Tests only. */
export function resetHadithPacksForTests() {
  index = null;
  active.clear();
  controllers.clear();
  packCache.clear();
  queue = [];
  queueRunning = false;
  snapshot = {};
  snapshotBuilt = false;
}
