import Storage from "expo-sqlite/kv-store";

interface CacheEntry {
  savedAt: number;
  status: number;
  body: string;
}

const PREFIX = "http-cache:v1:";

/**
 * The mobile stand-in for Next's `fetch(url, { next: { revalidate } })`.
 *
 * A response younger than `ttlSeconds` is served from the on-device cache without touching the network.
 * An older one is refetched, and when the network fails the stale copy is served instead, so every screen
 * that was opened once keeps working offline.
 */
export async function cachedFetch(url: string, ttlSeconds: number): Promise<Response> {
  const key = PREFIX + url;
  const cached = await readEntry(key);
  if (cached && Date.now() - cached.savedAt < ttlSeconds * 1000) return toResponse(cached);

  try {
    const response = await fetch(url);
    if (!response.ok) return cached ? toResponse(cached) : response;
    const body = await response.text();
    const entry: CacheEntry = { savedAt: Date.now(), status: response.status, body };
    Storage.setItem(key, JSON.stringify(entry)).catch(() => {
      // A full disk only costs us the cache, not the response.
    });
    return toResponse(entry);
  } catch (error) {
    if (cached) return toResponse(cached);
    throw error;
  }
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
