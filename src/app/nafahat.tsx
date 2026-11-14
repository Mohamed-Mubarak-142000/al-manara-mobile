import { Image } from "expo-image";
import { router } from "expo-router";
import { ChevronRight, Lock, Send } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, G, Path, Pattern, Rect } from "react-native-svg";

import { toArabicDigits } from "@/core/text/arabic";
import { useAccount } from "@/features/account/accountStore";
import { NafhaBubble } from "@/features/nafahat/NafhaBubble";
import { NAFAHAT_TITLE, markNafhaSeen, nafhaDayKey, nafhaDayLabel, useNafahat, type Nafha } from "@/features/nafahat/nafahatApi";
import type { NafhaEmoji } from "@/lib/database.types";
import { useThemeColor } from "@/theme/useThemeColor";

const logo = require("@/assets/images/brand/logo.png");

type Row = { kind: "day"; key: string; label: string } | { kind: "post"; key: string; nafha: Nafha };

/** Faint gold crescents, stars and dots tiled behind the chat, like a messenger's wallpaper. */
function Wallpaper() {
  const gold = useThemeColor("accent-strong");
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Pattern id="nafahat-wallpaper" width={92} height={92} patternUnits="userSpaceOnUse">
          <G fill="none" stroke={gold} strokeOpacity={0.13} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M22 13a9 9 0 1 0 7 14 10 10 0 1 1-7-14z" />
            <Path d="m64 55 2.5 5.2 5.7.8-4.1 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4.1-4 5.7-.8z" />
            <Circle cx={70} cy={19} r={2.3} />
            <Circle cx={22} cy={70} r={3.2} />
            <Path d="M43 43h6M46 40v6" />
          </G>
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#nafahat-wallpaper)" />
    </Svg>
  );
}

/** "نفحات المنارة": a read-only channel shaped like a WhatsApp chat; only the admin posts (from the website). */
export default function NafahatScreen() {
  const account = useAccount();
  const userId = account.status === "signed-in" ? account.userId : null;
  const { items, counts, mine, refreshing, loaded, refresh, react } = useNafahat(userId);
  const insets = useSafeAreaInsets();
  const heroFg = useThemeColor("hero-fg");
  const muted = useThemeColor("fg-muted");
  const tint = useThemeColor("accent");
  const list = useRef<FlatList<Row>>(null);
  const atBottom = useRef(true);
  const count = useRef(0);

  // Opening the channel (and every post that arrives while it is open) counts as seen: Home won't offer it.
  const newest = items.at(-1)?.id;
  useEffect(() => {
    if (newest) markNafhaSeen(newest);
  }, [newest]);

  const rows = useMemo(() => {
    const out: Row[] = [];
    items.forEach((nafha, index) => {
      const day = nafhaDayKey(nafha.created_at);
      if (index === 0 || nafhaDayKey(items[index - 1]!.created_at) !== day) {
        out.push({ kind: "day", key: `day-${day}`, label: nafhaDayLabel(nafha.created_at) });
      }
      out.push({ kind: "post", key: nafha.id, nafha });
    });
    return out;
  }, [items]);

  const needSignIn = useCallback(() => router.push("/login"), []);
  const onReact = useCallback((id: string, emoji: NafhaEmoji) => void react(id, emoji), [react]);

  return (
    <View className="flex-1 bg-bg-deep">
      <View className="flex-row items-center gap-3 bg-hero px-3 pb-2.5" style={{ paddingTop: insets.top + 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="رجوع"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          hitSlop={8}
          className="size-9 items-center justify-center rounded-full"
        >
          <ChevronRight size={26} color={heroFg} />
        </Pressable>
        <View className="size-11 items-center justify-center rounded-full border-2 border-gold/60 bg-ivory">
          <Image source={logo} style={{ width: 30, height: 30 }} contentFit="contain" accessible={false} />
        </View>
        <View className="flex-1">
          <Text className="font-display-bold text-lg text-hero-fg" numberOfLines={1}>
            {NAFAHAT_TITLE}
          </Text>
          <Text className="font-sans text-xs text-hero-fg/70" numberOfLines={1}>
            قناة · {items.length ? `${toArabicDigits(items.length)} نفحة هذا الشهر` : "ينشر فيها فريق المنارة"}
          </Text>
        </View>
      </View>

      <View className="flex-1">
        <Wallpaper />
        <FlatList
          ref={list}
          data={rows}
          keyExtractor={(row) => row.key}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 14, gap: 12, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          onScroll={({ nativeEvent: { contentOffset, contentSize, layoutMeasurement } }) => {
            atBottom.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 160;
          }}
          scrollEventThrottle={64}
          // Open on the newest post; follow new ones down while the reader is at the bottom.
          onContentSizeChange={() => {
            const first = count.current === 0;
            if (items.length === count.current) return;
            count.current = items.length;
            if (first || atBottom.current) list.current?.scrollToEnd({ animated: !first });
          }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={tint} colors={[tint]} />}
          ListHeaderComponent={
            <View className="mx-auto mb-1 max-w-[320px] flex-row items-start gap-1.5 rounded-xl bg-accent-soft px-3 py-2">
              <Lock size={13} color={muted} style={{ marginTop: 4 }} />
              <Text className="flex-1 text-center font-sans text-xs leading-5 text-accent-strong">
                قناة للقراءة فقط: ينشر فيها فريق المنارة وحده، وتتجدد النفحات أول كل شهر. اضغط مطولًا على أي نفحة للتفاعل.
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View className="m-auto items-center rounded-2xl bg-surface px-6 py-5">
              <Text className="font-sans-bold text-base text-fg">{loaded ? "لا توجد نفحات بعد" : "جارٍ التحميل…"}</Text>
              {loaded ? <Text className="mt-1 font-sans text-sm text-fg-muted">ترقّب أول نفحة قريبًا بإذن الله.</Text> : null}
            </View>
          }
          renderItem={({ item }) =>
            item.kind === "day" ? (
              <View className="items-center">
                <Text className="overflow-hidden rounded-lg bg-surface px-3 py-1 font-sans-bold text-xs text-fg-muted">{item.label}</Text>
              </View>
            ) : (
              <NafhaBubble
                nafha={item.nafha}
                counts={counts[item.nafha.id] ?? {}}
                mine={mine[item.nafha.id]}
                signedIn={!!userId}
                onReact={onReact}
                onNeedSignIn={needSignIn}
              />
            )
          }
        />
      </View>

      <View className="flex-row items-center gap-2 bg-bg px-3 pt-2" style={{ paddingBottom: insets.bottom + 8 }}>
        <View className="h-12 flex-1 flex-row items-center gap-2 rounded-full bg-surface px-4">
          <Lock size={16} color={muted} />
          <Text className="flex-1 font-sans text-sm text-fg-muted" numberOfLines={1}>
            النشر في هذه القناة للإدارة فقط
          </Text>
        </View>
        <View className="size-12 items-center justify-center rounded-full bg-surface-alt" accessible={false}>
          <Send size={20} color={muted} style={{ transform: [{ scaleX: -1 }] }} />
        </View>
      </View>
    </View>
  );
}
