import { router } from "expo-router";
import Storage from "expo-sqlite/kv-store";
import { HandHeart, Heart, Plus } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Pager } from "@/components/ui/Pager";
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

const CARD_HEIGHT = 128;
const AUTO_ADVANCE_MS = 4500;

function SupporterCard({ supporter }: { supporter: Supporter }) {
  const accent = useThemeColor("accent-strong");
  return (
    <View style={{ height: CARD_HEIGHT }} className="justify-center gap-2 rounded-3xl border border-border bg-surface px-5 shadow-card">
      <View className="flex-row items-center gap-2">
        <View className="size-8 items-center justify-center rounded-full bg-accent-soft">
          <Heart size={15} color={accent} fill={accent} />
        </View>
        <Text className="flex-1 font-sans-bold text-base text-fg" numberOfLines={1}>
          {supporter.name}
        </Text>
      </View>
      {supporter.message ? (
        <Text className="font-sans text-sm leading-6 text-fg-muted" numberOfLines={2}>
          {supporter.message}
        </Text>
      ) : null}
    </View>
  );
}

function JoinCard() {
  const onPrimary = useThemeColor("on-primary");
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push("/support")}
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      <View
        style={{ height: CARD_HEIGHT }}
        className="flex-row items-center justify-center gap-3 rounded-3xl border border-primary bg-primary-soft px-5"
      >
        <View className="size-11 items-center justify-center rounded-full bg-primary">
          <Plus size={22} color={onPrimary} />
        </View>
        <View>
          <Text className="font-sans-bold text-base text-primary">كن منهم</Text>
          <Text className="font-sans text-xs text-fg-muted">ادعم المنارة ليصل نورها لغيرك</Text>
        </View>
      </View>
    </Pressable>
  );
}

/**
 * "شكرًا لداعمي المنارة" on Home: the supporters an admin approved, newest first, name and message only.
 * One card at a time, gliding to the next every few seconds and on to the first after "كن منهم".
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
  // The supporters, then the "كن منهم" card last.
  const items: (Supporter | null)[] = [...supporters, null];
  return (
    <View className={`gap-3 ${className ?? ""}`}>
      <View className="flex-row items-center gap-2 px-4">
        <HandHeart size={16} color={accent} />
        <Text className="flex-1 font-sans-bold text-base text-fg">شكرًا لداعمي المنارة</Text>
      </View>
      <Pager
        data={items}
        keyExtractor={(item) => item?.id ?? "join"}
        height={CARD_HEIGHT}
        gutter={16}
        autoplayMs={AUTO_ADVANCE_MS}
        loop
        renderItem={(item) => (item ? <SupporterCard supporter={item} /> : <JoinCard />)}
      />
    </View>
  );
}
