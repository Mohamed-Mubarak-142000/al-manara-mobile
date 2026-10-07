import { router } from "expo-router";
import Storage from "expo-sqlite/kv-store";
import { HandHeart, Heart, Plus } from "lucide-react-native";
import { useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

import { useAccount } from "@/features/account/accountStore";
import { syncSupporterFlag } from "@/features/support/donationApi";
import type { PublicSupporterRow } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { useThemeColor } from "@/theme/useThemeColor";

const CACHE_KEY = "al-manara:supporters:v1";
const LIMIT = 20;

type Supporter = Pick<PublicSupporterRow, "id" | "name" | "message">;

function readCache(): Supporter[] {
  try {
    const parsed: unknown = JSON.parse(Storage.getItemSync(CACHE_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as Supporter[]) : [];
  } catch {
    return [];
  }
}

/** Approved supporters (the public_supporters view): the last list at once, also offline, then a fresh one. */
function useSupporters(): Supporter[] {
  const [list, setList] = useState<Supporter[]>(readCache);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase) return;
      const { data, error } = await supabase.from("public_supporters").select("id, name, message").limit(LIMIT);
      if (cancelled || error || !data) return;
      try {
        Storage.setItemSync(CACHE_KEY, JSON.stringify(data));
      } catch {
        // The next launch waits for the network.
      }
      setList(data);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return list;
}

function SupporterCard({ supporter }: { supporter: Supporter }) {
  const accent = useThemeColor("accent-strong");
  return (
    <View className="w-44 gap-1.5 rounded-3xl border border-border bg-surface p-4 shadow-soft">
      <View className="flex-row items-center gap-2">
        <Heart size={14} color={accent} fill={accent} />
        <Text className="flex-1 font-display-bold text-sm text-fg" numberOfLines={1}>
          {supporter.name}
        </Text>
      </View>
      {supporter.message ? (
        <Text className="font-sans text-xs leading-5 text-fg-muted" numberOfLines={3}>
          {supporter.message}
        </Text>
      ) : null}
    </View>
  );
}

function JoinCard() {
  const gold = useThemeColor("gold-soft");
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push("/support")} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
      <View className="h-full w-36 items-center justify-center gap-2 rounded-3xl bg-hero p-4 shadow-lift">
        <View className="size-10 items-center justify-center rounded-full bg-white/10">
          <Plus size={20} color={gold} />
        </View>
        <Text className="text-center font-display-bold text-sm text-hero-fg">كن منهم</Text>
      </View>
    </Pressable>
  );
}

/**
 * "شكرًا لداعمي المنارة" on Home: the supporters an admin approved, newest first, name and message only.
 * Renders nothing until there is at least one.
 */
export function SupportersStrip({ className }: { className?: string }) {
  const supporters = useSupporters();
  const account = useAccount();
  const accent = useThemeColor("accent-strong");

  // A request approved since the last visit turns the supporter perks on.
  const userId = account.status === "signed-in" ? account.userId : null;
  useEffect(() => {
    if (userId) syncSupporterFlag(userId);
  }, [userId]);

  if (!supporters.length) return null;
  return (
    <View className={`gap-3 ${className ?? ""}`}>
      <View className="flex-row items-center gap-2 px-4">
        <HandHeart size={16} color={accent} />
        <Text className="flex-1 font-display-bold text-lg text-fg">شكرًا لداعمي المنارة</Text>
      </View>
      <FlatList
        horizontal
        data={supporters}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SupporterCard supporter={item} />}
        ListFooterComponent={<JoinCard />}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}
