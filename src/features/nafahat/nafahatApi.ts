import Storage from "expo-sqlite/kv-store";
import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/lib/supabase";
import type { NafhaEmoji, NafhaRow } from "@/lib/database.types";

/**
 * "نفحات المنارة": the read-only channel the website's admin posts to (/admin/nafahat). Everyone reads it;
 * signed-in users react with one emoji per post. Posts are cleared on the 1st of every month on the server.
 */
export const NAFAHAT_TITLE = "نفحات المنارة";

export type Nafha = Pick<NafhaRow, "id" | "title" | "body" | "media_type" | "media_url" | "created_at">;
export type ReactionCounts = Partial<Record<NafhaEmoji, number>>;

export const NAFAHAT_EMOJIS: { id: NafhaEmoji; char: string; label: string }[] = [
  { id: "heart", char: "❤️", label: "أحببتها" },
  { id: "dua", char: "🤲", label: "آمين" },
  { id: "star", char: "🌟", label: "ملهمة" },
  { id: "like", char: "👍", label: "أوافق" },
];

const CACHE_KEY = "al-manara:nafahat:v1";
const LAST_SEEN_KEY = "al-manara:nafahat:last-seen:v1";
const COLUMNS = "id, title, body, media_type, media_url, created_at";

function readCache(): Nafha[] {
  try {
    const parsed: unknown = JSON.parse(Storage.getItemSync(CACHE_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as Nafha[]) : [];
  } catch {
    return [];
  }
}

function writeCache(items: Nafha[]) {
  try {
    Storage.setItemSync(CACHE_KEY, JSON.stringify(items));
  } catch {
    // Next launch waits for the network.
  }
}

export function lastSeenNafha(): string | null {
  try {
    return Storage.getItemSync(LAST_SEEN_KEY);
  } catch {
    return null;
  }
}

export function markNafhaSeen(id: string) {
  try {
    Storage.setItemSync(LAST_SEEN_KEY, id);
  } catch {
    // Shown again next launch.
  }
}

/** The newest post, for the prompt on Home (null when there is none, or offline). */
export async function fetchLatestNafha(): Promise<Nafha | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("nafahat").select(COLUMNS).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return error ? null : data;
}

/**
 * The channel: the cached posts at once (also offline), then fresh ones with the reaction counts and the
 * user's own reactions. Oldest first, like a chat.
 */
export function useNafahat(userId: string | null) {
  const [items, setItems] = useState<Nafha[]>(readCache);
  const [counts, setCounts] = useState<Record<string, ReactionCounts>>({});
  const [mine, setMine] = useState<Record<string, NafhaEmoji>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(!supabase);
  const alive = useRef(true);

  // Every state update here comes after an await, so the mount effect can call it.
  const load = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.from("nafahat").select(COLUMNS).order("created_at", { ascending: false }).limit(200);
      if (error || !data || !alive.current) return;
      const next = [...data].reverse();
      writeCache(next);
      setItems(next);
      const ids = next.map((item) => item.id);
      if (ids.length === 0) {
        setCounts({});
        setMine({});
        return;
      }
      const [{ data: rows }, own] = await Promise.all([
        supabase.from("nafahat_reaction_counts").select("nafha_id, emoji, count").in("nafha_id", ids),
        userId
          ? supabase.from("nafahat_reactions").select("nafha_id, emoji").eq("user_id", userId).in("nafha_id", ids)
          : Promise.resolve({ data: [] as { nafha_id: string; emoji: NafhaEmoji }[] }),
      ]);
      if (!alive.current) return;
      const byPost: Record<string, ReactionCounts> = {};
      for (const row of rows ?? []) (byPost[row.nafha_id] ??= {})[row.emoji] = row.count;
      setCounts(byPost);
      setMine(Object.fromEntries((own.data ?? []).map((row) => [row.nafha_id, row.emoji])));
    } finally {
      if (alive.current) setLoaded(true);
    }
  }, [userId]);

  /** Pull to refresh. */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } catch {
      // Keeps what is shown.
    } finally {
      if (alive.current) setRefreshing(false);
    }
  }, [load]);

  useEffect(() => {
    alive.current = true;
    load().catch(() => {});
    return () => {
      alive.current = false;
    };
  }, [load]);

  /** Optimistic; the same emoji again removes it. Rolls back when the write fails. */
  const react = useCallback(
    async (nafhaId: string, emoji: NafhaEmoji) => {
      if (!supabase || !userId) return;
      const beforeCounts = counts[nafhaId] ?? {};
      const beforeMine = mine[nafhaId];
      const removing = beforeMine === emoji;
      const nextCounts = { ...beforeCounts };
      if (beforeMine) nextCounts[beforeMine] = Math.max(0, (nextCounts[beforeMine] ?? 1) - 1);
      if (!removing) nextCounts[emoji] = (nextCounts[emoji] ?? 0) + 1;
      const apply = (value: ReactionCounts, own: NafhaEmoji | undefined) => {
        setCounts((current) => ({ ...current, [nafhaId]: value }));
        setMine((current) => {
          const next = { ...current };
          if (own) next[nafhaId] = own;
          else delete next[nafhaId];
          return next;
        });
      };
      apply(nextCounts, removing ? undefined : emoji);
      const { error } = removing
        ? await supabase.from("nafahat_reactions").delete().eq("nafha_id", nafhaId).eq("user_id", userId)
        : await supabase
            .from("nafahat_reactions")
            .upsert({ nafha_id: nafhaId, user_id: userId, emoji }, { onConflict: "nafha_id,user_id" });
      if (error) apply(beforeCounts, beforeMine);
    },
    [counts, mine, userId],
  );

  return { items, counts, mine, refreshing, loaded, refresh, react };
}
