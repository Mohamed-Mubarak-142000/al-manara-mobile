import { router } from "expo-router";
import { Lock, Wind } from "lucide-react-native";
import { useCallback, useEffect, useRef } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/ui/PageHeader";
import { useAccount } from "@/features/account/accountStore";
import { NafhaBubble } from "@/features/nafahat/NafhaBubble";
import { NAFAHAT_TITLE, markNafhaSeen, useNafahat, type Nafha } from "@/features/nafahat/nafahatApi";
import { useThemeColor } from "@/theme/useThemeColor";

const logo = require("@/assets/images/brand/logo.png");

/** "نفحات المنارة": a read-only channel like a chat; only the admin posts (from the website). */
export default function NafahatScreen() {
  const account = useAccount();
  const userId = account.status === "signed-in" ? account.userId : null;
  const { items, counts, mine, refreshing, loaded, refresh, react } = useNafahat(userId);
  const insets = useSafeAreaInsets();
  const tint = useThemeColor("accent");
  const muted = useThemeColor("fg-muted");
  const primary = useThemeColor("primary");
  const list = useRef<FlatList<Nafha>>(null);
  const scrolled = useRef(false);

  // Opening the channel counts as seeing the newest post: Home won't offer it again.
  const newest = items.at(-1)?.id;
  useEffect(() => {
    if (newest) markNafhaSeen(newest);
  }, [newest]);

  const needSignIn = useCallback(() => router.push("/login"), []);
  const onReact = useCallback((id: string, emoji: Parameters<typeof react>[1]) => void react(id, emoji), [react]);

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title={NAFAHAT_TITLE} subtitle="خواطر ونفحات من فريق المنارة" art={logo} />
      <FlatList
        ref={list}
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 18, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        // Land on the newest post (the end), once.
        onContentSizeChange={() => {
          if (scrolled.current || items.length === 0) return;
          scrolled.current = true;
          list.current?.scrollToEnd({ animated: false });
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={tint} colors={[tint]} />}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center gap-3 px-8 py-20">
            <View className="size-16 items-center justify-center rounded-full bg-primary-soft">
              <Wind size={30} color={primary} />
            </View>
            <Text className="text-center font-sans-bold text-lg text-fg">{loaded ? "لا توجد نفحات بعد" : "جارٍ التحميل…"}</Text>
            {loaded ? (
              <Text className="text-center font-sans text-sm leading-6 text-fg-muted">ترقّب أول نفحة قريبًا بإذن الله.</Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <NafhaBubble
            nafha={item}
            counts={counts[item.id] ?? {}}
            mine={mine[item.id]}
            signedIn={!!userId}
            onReact={onReact}
            onNeedSignIn={needSignIn}
          />
        )}
      />
      <View className="border-t border-border bg-surface px-4 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
        <View className="h-12 flex-row items-center justify-center gap-2 rounded-full bg-surface-alt">
          <Lock size={16} color={muted} />
          <Text className="font-sans-bold text-sm text-fg-muted">النشر في هذه القناة للإدارة فقط</Text>
        </View>
      </View>
    </View>
  );
}
