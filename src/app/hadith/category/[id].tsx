import { FlashList } from "@shopify/flash-list";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getCategoryHadiths, type HadithSummary } from "@/core/hadith/api";
import { toArabicDigits } from "@/core/text/arabic";
import { StateMessage } from "@/components/ui/StateMessage";
import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { useThemeColor } from "@/theme/useThemeColor";

type Pages = { id: string; items: HadithSummary[]; page: number; lastPage: number; total: number; failed: boolean };

/** A topic's hadiths, twenty at a time, loading the next page as the list reaches its end. */
export default function HadithCategoryScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();
  const heroFg = useThemeColor("hero-fg");
  const muted = useThemeColor("fg-muted");
  const primary = useThemeColor("primary");
  const accent = useThemeColor("accent");
  const [pages, setPages] = useState<Pages | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const current = pages?.id === id ? pages : null;

  useEffect(() => {
    let cancelled = false;
    getCategoryHadiths(id, 1)
      // The API reads a failed request as an empty page; a topic is never empty, so empty means failed.
      .catch(() => ({ items: [], page: 1, lastPage: 0, total: 0 }))
      .then((first) => {
        if (cancelled) return;
        setRefreshing(false);
        setPages((previous) =>
          // A failed pull-to-refresh keeps what is already on screen.
          !first.items.length && previous?.id === id && !previous.failed
            ? previous
            : { id, items: first.items, page: first.page, lastPage: first.lastPage, total: first.total, failed: first.items.length === 0 },
        );
      });
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  function retry() {
    setPages(null);
    setAttempt((value) => value + 1);
  }

  function refresh() {
    setRefreshing(true);
    setAttempt((value) => value + 1);
  }

  async function loadMore() {
    if (!current || loadingMore || current.page >= current.lastPage) return;
    setLoadingMore(true);
    const next = await getCategoryHadiths(id, current.page + 1).catch(() => null);
    setLoadingMore(false);
    if (next?.items.length) setPages({ ...current, items: [...current.items, ...next.items], page: next.page });
  }

  return (
    <View className="flex-1 bg-bg">
      <FlashList
        data={current?.items ?? []}
        keyExtractor={(item) => item.id}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={accent} colors={[accent]} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + miniPlayer + 32 }}
        ListHeaderComponent={
          <View className="mb-4 rounded-b-[32px] bg-hero px-5 pb-6" style={{ paddingTop: insets.top + 8 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="رجوع"
              onPress={() => router.back()}
              hitSlop={12}
              className="mb-3 self-start p-1"
            >
              <ChevronRight size={26} color={heroFg} />
            </Pressable>
            <Text className="font-sans-bold text-sm text-gold-soft">الأحاديث</Text>
            <Text className="mt-2 font-display-bold text-2xl leading-10 text-hero-fg">{title ?? "الموضوع"}</Text>
            {current && !current.failed && (
              <Text className="mt-1 font-sans text-sm text-white/70">{toArabicDigits(current.total)} حديث مع الشرح والفوائد.</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          current?.failed ? <StateMessage message="تعذّر تحميل الأحاديث الآن، حاول بعد قليل." onRetry={retry} /> : <StateMessage loading />
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator className="my-4" color={primary} /> : null}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/hadith/[id]", params: { id: item.id, category: title ?? "" } })}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <View className="mx-4 mb-2.5 flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
              <Text className="flex-1 font-sans-semibold text-sm leading-7 text-fg">{item.title}</Text>
              <ChevronLeft size={16} color={muted} />
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
