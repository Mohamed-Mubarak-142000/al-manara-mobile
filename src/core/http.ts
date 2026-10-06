import Storage from "expo-sqlite/kv-store";

interface CacheEntry {
  savedAt: number;
  status: number;
  body: string;
}

const PREFIX = "http-cache:v1:";
/** Cache key → last time it was used (read or saved), so pruning never has to read the (large) bodies. */
const INDEX_KEY = "http-cache-index:v1";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Generous on purpose: an entry is only dropped when nobody opened it for half a year. */
export const CACHE_MAX_AGE_MS = 180 * DAY_MS;
export const CACHE_MAX_ENTRIES = 2000;

/**
 * The mobile stand-in for Next's `fetch(url, { next: { revalidate } })`.
 *
 * A response younger than `ttlSeconds` is served from the on-device cache without touching the network.
 * An older one is refetched, and when the network fails the stale copy is served instead, so every screen
 * that was opened once keeps working offline. Once per app session, entries unused for 180 days are dropped
 * and the cache is capped at the 2000 most recently used. Reading an entry (even offline) counts as use.
 */
export async function cachedFetch(url: string, ttlSeconds: number): Promise<Response> {
  void pruneOnce();
  const key = PREFIX + url;
  const cached = await readEntry(key);
  if (cached) touch(key).catch(() => {});
  if (cached && Date.now() - cached.savedAt < ttlSeconds * 1000) return toResponse(cached);

  try {
    const response = await fetch(url);
    if (!response.ok) return cached ? toResponse(cached) : response;
    const body = await response.text();
    const entry: CacheEntry = { savedAt: Date.now(), status: response.status, body };
    Storage.setItem(key, JSON.stringify(entry))
      .then(() => remember(key, entry.savedAt))
      .catch(() => {
        // A full disk only costs us the cache, not the response.
      });
    return toResponse(entry);
  } catch (error) {
    if (cached) return toResponse(cached);
    throw error;
  }
}

/**
 * Which cache keys to drop: everything saved before `now - maxAgeMs`, then the oldest beyond `maxEntries`.
 * Pure, so it is easy to test.
 */
export function planPrune(
  savedAt: Readonly<Record<string, number>>,
  now: number,
  maxAgeMs = CACHE_MAX_AGE_MS,
  maxEntries = CACHE_MAX_ENTRIES,
): { keep: Record<string, number>; remove: string[] } {
  const remove: string[] = [];
  const fresh: [string, number][] = [];
  for (const [key, at] of Object.entries(savedAt)) {
    if (!Number.isFinite(at) || now - at > maxAgeMs) remove.push(key);
    else fresh.push([key, at]);
  }
  fresh.sort((a, b) => b[1] - a[1]);
  for (const [key] of fresh.slice(maxEntries)) remove.push(key);
  return { keep: Object.fromEntries(fresh.slice(0, maxEntries)), remove };
}

let index: Promise<Record<string, number>> | null = null;

/** Loads the index and prunes the cache, once per app session. */
function pruneOnce(): Promise<Record<string, number>> {
  index ??= prune().catch(() => ({}));
  return index;
}

async function prune(): Promise<Record<string, number>> {
  const saved = JSON.parse((await Storage.getItem(INDEX_KEY)) ?? "{}") as Record<string, number>;
  const keys = (await Storage.getAllKeys()).filter((key) => key.startsWith(PREFIX));
  const known: Record<string, number> = {};
  const now = Date.now();
  // Entries cached before the index existed count as used now: no body reads, and nothing offline is lost.
  for (const key of keys) known[key] = saved[key] ?? now;
  const { keep, remove } = planPrune(known, now);
  if (remove.length) await Storage.multiRemove(remove);
  await Storage.setItem(INDEX_KEY, JSON.stringify(keep));
  return keep;
}

async function remember(key: string, usedAt: number) {
  const current = await pruneOnce();
  current[key] = usedAt;
  await Storage.setItem(INDEX_KEY, JSON.stringify(current));
}

/** Marks a cached entry as used; at most once a day per entry, to keep index writes rare. */
async function touch(key: string) {
  const current = await pruneOnce();
  if (Date.now() - (current[key] ?? 0) > DAY_MS) await remember(key, Date.now());
}

/** Tests only: forget this session's prune. */
export function resetCachePruneForTests() {
  index = null;
}

async function readEntry(key: string): Promise<CacheEntry | null> {
  try {
    const raw = await Storage.getItem(key);
    return raw ? (JSON.parse(raw) as CacheEntry) : null;
  } catch {
    return null;
  }
}

function toResponse(entry: CacheEntry): Response {
  return new Response(entry.body, { status: entry.status, headers: { "content-type": "application/json" } });
}
