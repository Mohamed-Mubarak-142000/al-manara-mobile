import { FlashList } from "@shopify/flash-list";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ScrollText } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { HadithCategory, HadithSummary } from "@/core/hadith/api";
import { toArabicDigits } from "@/core/text/arabic";
import { PageHeader } from "@/components/ui/PageHeader";
import { StateMessage } from "@/components/ui/StateMessage";
import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { getCategoriesOffline, getCategoryHadithsOffline } from "@/features/hadith/offlineHadith";
import { useAsync } from "@/features/hadith/useAsync";
import { useThemeColor } from "@/theme/useThemeColor";

type Pages = { id: string; items: HadithSummary[]; page: number; lastPage: number; total: number; failed: boolean };

/** A topic's hadiths, twenty at a time, loading the next page as the list reaches its end. */
export default function HadithCategoryScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();
  const muted = useThemeColor("fg-muted");
  const primary = useThemeColor("primary");
  const accent = useThemeColor("accent");
  const [pages, setPages] = useState<Pages | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const current = pages?.id === id ? pages : null;
  // The topic tree (cached, or from the downloaded packs) for the breadcrumb and the sub-topics.
  const categories = useAsync("categories", async () => {
    const list = await getCategoriesOffline();
    return list.length ? list : null;
  });
  const all = categories.state.status === "ready" ? categories.state.data : [];
  const category = all.find((entry) => entry.id === id);
  const parent = all.find((entry) => entry.id === category?.parentId);
  const children = all.filter((entry) => entry.parentId === id);

  useEffect(() => {
    let cancelled = false;
    getCategoryHadithsOffline(id, 1)
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

  function openCategory(target: HadithCategory) {
    router.push({ pathname: "/hadith/category/[id]", params: { id: target.id, title: target.title } });
  }

  async function loadMore() {
    if (!current || loadingMore || current.page >= current.lastPage) return;
    setLoadingMore(true);
    const next = await getCategoryHadithsOffline(id, current.page + 1).catch(() => null);
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
          <View className="mb-4">
            <PageHeader
              back
              icon={ScrollText}
              kicker={parent?.title ?? "الأحاديث النبوية"}
              title={category?.title ?? title ?? "الأحاديث"}
              description={current && !current.failed ? `${toArabicDigits(current.total)} حديث مع الشرح والفوائد.` : undefined}
            />
            <View className="gap-4 px-4">
              {/* The website's breadcrumb: الأحاديث / parent / this topic. */}
              <View className="flex-row flex-wrap items-center gap-2">
                <Pressable accessibilityRole="link" onPress={() => router.dismissTo("/hadith")}>
                  <Text className="font-sans-bold text-sm text-primary">الأحاديث</Text>
                </Pressable>
                {parent && (
                  <>
                    <Text className="font-sans text-sm text-fg-muted">/</Text>
                    <Pressable accessibilityRole="link" onPress={() => openCategory(parent)}>
                      <Text className="font-sans-bold text-sm text-primary">{parent.title}</Text>
                    </Pressable>
                  </>
                )}
                <Text className="font-sans text-sm text-fg-muted">/</Text>
                <Text className="font-sans text-sm text-fg-muted">{category?.title ?? title}</Text>
              </View>
              {children.length > 0 && (
                <View className="flex-row flex-wrap gap-2">
                  {children.map((child) => (
                    <Pressable
                      key={child.id}
                      accessibilityRole="button"
                      onPress={() => openCategory(child)}
                      className="flex-row items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5"
                    >
                      <Text className="font-sans-medium text-sm text-fg">{child.title}</Text>
                      <Text className="font-sans text-xs text-fg-muted">{toArabicDigits(child.count)}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          current?.failed ? <StateMessage message="تعذّر تحميل الأحاديث الآن، حاول بعد قليل." onRetry={retry} /> : <StateMessage loading />
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator className="my-4" color={primary} /> : null}
        renderItem={({ item, index }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/hadith/[id]", params: { id: item.id, category: category?.title ?? title ?? "" } })}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
          >
            <View className="mx-4 mb-3 flex-row items-start gap-4 rounded-3xl border border-border bg-surface p-4 shadow-card">
              <View className="size-10 items-center justify-center rounded-xl bg-accent-soft">
                <Text className="font-sans-bold text-sm text-accent-strong">{toArabicDigits(index + 1)}</Text>
              </View>
              <Text className="flex-1 font-sans text-lg leading-9 text-fg">{item.title}</Text>
              <View className="mt-2.5">
                <ArrowLeft size={16} color={muted} />
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
