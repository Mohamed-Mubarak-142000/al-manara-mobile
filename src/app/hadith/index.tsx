import { router } from "expo-router";
import { ArrowLeft, ChevronRight, ScrollText, Sparkles } from "lucide-react-native";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { planDay } from "@/core/plan/schedule";
import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Ornament";
import { StateMessage } from "@/components/ui/StateMessage";
import { HadithDownloadAllCard, HadithPackButton } from "@/features/hadith/HadithPackControls";
import { HadithPanel, HadithText } from "@/features/hadith/HadithPanel";
import { getCategoriesOffline, getHadithOfTheDayOffline } from "@/features/hadith/offlineHadith";
import { useAsync } from "@/features/hadith/useAsync";
import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { useThemeColor } from "@/theme/useThemeColor";

/** The website's /hadith: hadith of the day, then the topics with their sub-topics. */
export default function HadithIndexScreen() {
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();
  const heroFg = useThemeColor("hero-fg");
  const gold = useThemeColor("gold-soft");
  const accent = useThemeColor("accent");
  const today = planDay();
  const daily = useAsync(today, () => getHadithOfTheDayOffline(today));
  const categories = useAsync("categories", async () => {
    const list = await getCategoriesOffline();
    return list.length ? list : null;
  });

  const topLevel = categories.state.status === "ready" ? categories.state.data.filter((category) => category.parentId === null) : [];
  const childrenOf = (id: string) =>
    categories.state.status === "ready" ? categories.state.data.filter((category) => category.parentId === id) : [];

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingBottom: insets.bottom + miniPlayer + 32 }}
      refreshControl={
        <RefreshControl
          // Each section shows its own loading state, so the pull spinner only acknowledges the gesture.
          refreshing={false}
          onRefresh={() => {
            daily.reload();
            categories.reload();
          }}
          tintColor={accent}
          colors={[accent]}
        />
      }
    >
      <View className="rounded-b-[32px] bg-hero px-5 pb-6" style={{ paddingTop: insets.top + 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="رجوع"
          onPress={() => router.back()}
          hitSlop={12}
          className="mb-3 self-start p-1"
        >
          <ChevronRight size={26} color={heroFg} />
        </Pressable>
        <View className="flex-row items-center gap-2">
          <ScrollText size={16} color={gold} />
          <Text className="font-sans-bold text-sm text-gold-soft">السنة النبوية</Text>
        </View>
        <Text className="mt-2 font-display-bold text-3xl text-hero-fg">الأحاديث النبوية</Text>
        <Text className="mt-1 font-sans text-sm leading-6 text-white/75">
          أحاديث نبوية صحيحة مع شرحها وفوائدها ودرجتها، مرتّبة حسب الموضوع.
        </Text>
      </View>

      <View className="gap-4 px-4 pt-5">
        {daily.state.status === "ready" && (
          <HadithPanel title="حديث اليوم" icon={Sparkles}>
            <Text className="mb-3 font-sans-bold text-sm text-accent-strong">{daily.state.data.title}</Text>
            <HadithText text={daily.state.data.text} numberOfLines={6} />
            <View className="mt-5 flex-row flex-wrap items-center justify-between gap-3">
              <Text className="shrink font-sans text-sm text-fg-muted">
                {daily.state.data.attribution}
                {daily.state.data.grade ? ` — ${daily.state.data.grade}` : ""}
              </Text>
              <Button
                size="sm"
                icon={ArrowLeft}
                onPress={() =>
                  daily.state.status === "ready" && router.push({ pathname: "/hadith/[id]", params: { id: daily.state.data.id } })
                }
              >
                اقرأ الشرح
              </Button>
            </View>
          </HadithPanel>
        )}

        <Text className="mt-4 font-display-bold text-2xl text-primary-strong">الموضوعات</Text>
        {categories.state.status === "loading" ? (
          <StateMessage loading />
        ) : categories.state.status === "error" ? (
          <StateMessage message="تعذّر تحميل الأحاديث الآن، حاول بعد قليل." onRetry={categories.reload} />
        ) : (
          <>
            <HadithDownloadAllCard roots={topLevel} />
            {topLevel.map((category) => {
              const children = childrenOf(category.id);
              return (
                <View key={category.id} className="rounded-4xl border border-border bg-surface p-5 shadow-soft">
                  <View className="flex-row items-center gap-2">
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push({ pathname: "/hadith/category/[id]", params: { id: category.id, title: category.title } })}
                      className="flex-1 flex-row items-center justify-between gap-3"
                    >
                      <Text className="shrink font-sans-bold text-xl leading-9 text-primary-strong">{category.title}</Text>
                      <View className="rounded-full bg-accent-soft px-3 py-1">
                        <Text className="font-sans-bold text-sm text-accent-strong">{toArabicDigits(category.count)} حديث</Text>
                      </View>
                    </Pressable>
                    <HadithPackButton category={category} />
                  </View>
                  {children.length > 0 && (
                    <View className="mt-4 flex-row flex-wrap gap-2">
                      {children.map((child) => (
                        <Pressable
                          key={child.id}
                          accessibilityRole="button"
                          onPress={() => router.push({ pathname: "/hadith/category/[id]", params: { id: child.id, title: child.title } })}
                          className="flex-row items-center gap-1.5 rounded-full border border-border bg-bg px-3 py-1.5"
                        >
                          <Text className="font-sans-bold text-sm text-fg">{child.title}</Text>
                          <Text className="font-sans text-xs text-fg-muted">{toArabicDigits(child.count)}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

        <View className="mt-2 items-center gap-3">
          <View className="w-1/2">
            <Divider />
          </View>
          <Text className="text-center font-sans text-xs leading-5 text-fg-muted">
            الأحاديث وشروحها من «موسوعة الأحاديث النبوية» (HadeethEnc.com).
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
