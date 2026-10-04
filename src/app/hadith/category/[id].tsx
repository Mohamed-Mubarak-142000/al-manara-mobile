import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getCategoryHadiths, type HadithSummary } from "@/core/hadith/api";
import { toArabicDigits } from "@/core/text/arabic";
import { StateMessage } from "@/components/ui/StateMessage";
import { useThemeColor } from "@/theme/useThemeColor";

type Pages = { id: string; items: HadithSummary[]; page: number; lastPage: number; total: number; failed: boolean };

/** A topic's hadiths, twenty at a time, loading the next page as the list reaches its end. */
export default function HadithCategoryScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const insets = useSafeAreaInsets();
  const heroFg = useThemeColor("hero-fg");
  const muted = useThemeColor("fg-muted");
  const primary = useThemeColor("primary");
  const [pages, setPages] = useState<Pages | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const current = pages?.id === id ? pages : null;

  useEffect(() => {
    let cancelled = false;
    getCategoryHadiths(id, 1).then((first) => {
      if (!cancelled)
        setPages({
          id,
          items: first.items,
          page: first.page,
          lastPage: first.lastPage,
          total: first.total,
          failed: first.items.length === 0,
        });
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function loadMore() {
    if (!current || loadingMore || current.page >= current.lastPage) return;
    setLoadingMore(true);
    const next = await getCategoryHadiths(id, current.page + 1);
    setLoadingMore(false);
    if (next.items.length) setPages({ ...current, items: [...current.items, ...next.items], page: next.page });
  }

  return (
    <FlatList
      className="flex-1 bg-bg"
      data={current?.items ?? []}
      keyExtractor={(item) => item.id}
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
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
      ListEmptyComponent={current?.failed ? <StateMessage message="تعذّر تحميل الأحاديث الآن، حاول بعد قليل." /> : <StateMessage loading />}
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
  );
}
