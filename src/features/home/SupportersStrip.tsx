import { router } from "expo-router";
import Storage from "expo-sqlite/kv-store";
import { HandHeart, Heart, Plus } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { FlatList, Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from "react-native-reanimated";

import { useAccount } from "@/features/account/accountStore";
import { syncSupporterFlag } from "@/features/support/donationApi";
import type { PublicSupporterRow } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { useThemeColor } from "@/theme/useThemeColor";

const CACHE_KEY = "al-manara:supporters:v1";
const LIMIT = 20;
const CARD_GAP = 12;

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

function SupporterCard({ supporter, width }: { supporter: Supporter; width: number }) {
  const accent = useThemeColor("accent-strong");
  return (
    <View style={{ width, height: CARD_HEIGHT }} className="justify-center gap-2 rounded-3xl border border-border bg-surface px-5 shadow-card">
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

function JoinCard({ width }: { width: number }) {
  const onPrimary = useThemeColor("on-primary");
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push("/support")}
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      <View
        style={{ width, height: CARD_HEIGHT }}
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

/** One dot per card; the current one stretches into a pill as the cards glide past. */
function Dot({ index, progress }: { index: number; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const near = interpolate(Math.abs(progress.get() - index), [0, 1], [1, 0], Extrapolation.CLAMP);
    return { width: 6 + near * 14, opacity: 0.35 + near * 0.65 };
  });
  return <Animated.View className="h-1.5 rounded-full bg-primary" style={style} />;
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

  const { width: screen } = useWindowDimensions();
  const cardWidth = screen - 32;
  const span = cardWidth + CARD_GAP;
  const listRef = useRef<FlatList<Supporter | null>>(null);
  const progress = useSharedValue(0);
  const index = useRef(0);
  const touching = useRef(false);
  // The supporters, then the "كن منهم" card last.
  const items: (Supporter | null)[] = [...supporters, null];

  const onScroll = useAnimatedScrollHandler((event) => {
    progress.set(event.contentOffset.x / span);
  });

  // Glides to the next card every few seconds, back to the first after the last; a finger on the strip
  // holds it, and it starts again after the person lets go.
  useEffect(() => {
    if (items.length < 2) return;
    const id = setInterval(() => {
      if (touching.current) return;
      index.current = (index.current + 1) % items.length;
      listRef.current?.scrollToOffset({ offset: index.current * span, animated: true });
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [items.length, span]);

  if (!supporters.length) return null;
  return (
    <View className={`gap-3 ${className ?? ""}`}>
      <View className="flex-row items-center gap-2 px-4">
        <HandHeart size={16} color={accent} />
        <Text className="flex-1 font-sans-bold text-base text-fg">شكرًا لداعمي المنارة</Text>
      </View>
      <Animated.FlatList
        ref={listRef}
        horizontal
        data={items}
        keyExtractor={(item) => item?.id ?? "join"}
        renderItem={({ item }) => (item ? <SupporterCard supporter={item} width={cardWidth} /> : <JoinCard width={cardWidth} />)}
        onScroll={onScroll}
        scrollEventThrottle={16}
        snapToInterval={span}
        decelerationRate="fast"
        disableIntervalMomentum
        onScrollBeginDrag={() => {
          touching.current = true;
        }}
        onMomentumScrollEnd={(event) => {
          touching.current = false;
          index.current = Math.round(event.nativeEvent.contentOffset.x / span);
        }}
        getItemLayout={(_, i) => ({ length: span, offset: span * i, index: i })}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: CARD_GAP }}
        showsHorizontalScrollIndicator={false}
      />
      <View className="flex-row items-center justify-center gap-1.5">
        {items.map((item, i) => (
          <Dot key={item?.id ?? "join"} index={i} progress={progress} />
        ))}
      </View>
    </View>
  );
}
