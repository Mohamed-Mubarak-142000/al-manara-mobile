import { router } from "expo-router";
import { ChevronLeft, ChevronRight, ScrollText } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getCategories, getHadithOfTheDay } from "@/core/hadith/api";
import { planDay } from "@/core/plan/schedule";
import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Ornament";
import { StateMessage } from "@/components/ui/StateMessage";
import { useAsync } from "@/features/hadith/useAsync";
import { useThemeColor } from "@/theme/useThemeColor";

/** The website's /hadith: hadith of the day, then the topics with their sub-topics. */
export default function HadithIndexScreen() {
  const insets = useSafeAreaInsets();
  const heroFg = useThemeColor("hero-fg");
  const gold = useThemeColor("gold-soft");
  const muted = useThemeColor("fg-muted");
  const today = planDay();
  const daily = useAsync(today, () => getHadithOfTheDay(today));
  const categories = useAsync("categories", async () => {
    const list = await getCategories();
    return list.length ? list : null;
  });

  const topLevel = categories.state.status === "ready" ? categories.state.data.filter((category) => category.parentId === null) : [];
  const childrenOf = (id: string) =>
    categories.state.status === "ready" ? categories.state.data.filter((category) => category.parentId === id) : [];

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
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
          <View className="gap-3 rounded-3xl border border-gold/40 bg-accent-soft p-5">
            <Text className="font-sans-bold text-sm text-accent-strong">حديث اليوم</Text>
            <Text className="font-sans-semibold text-lg leading-9 text-fg" numberOfLines={6}>
              {daily.state.data.text}
            </Text>
            {daily.state.data.attribution ? <Text className="font-sans text-xs text-fg-muted">{daily.state.data.attribution}</Text> : null}
            <Button
              size="sm"
              className="self-start"
              onPress={() =>
                daily.state.status === "ready" && router.push({ pathname: "/hadith/[id]", params: { id: daily.state.data.id } })
              }
            >
              اقرأ الشرح
            </Button>
          </View>
        )}

        <Text className="mt-2 font-display-bold text-xl text-fg">الموضوعات</Text>
        {categories.state.status === "loading" ? (
          <StateMessage loading />
        ) : categories.state.status === "error" ? (
          <StateMessage message="تعذّر تحميل الأحاديث الآن، حاول بعد قليل." onRetry={categories.reload} />
        ) : (
          topLevel.map((category) => {
            const children = childrenOf(category.id);
            return (
              <View key={category.id} className="rounded-3xl border border-border bg-surface p-4 shadow-soft">
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: "/hadith/category/[id]", params: { id: category.id, title: category.title } })}
                  className="flex-row items-center justify-between"
                >
                  <View className="flex-1">
                    <Text className="font-display-bold text-base text-fg">{category.title}</Text>
                    <Text className="font-sans text-xs text-fg-muted">{toArabicDigits(category.count)} حديث</Text>
                  </View>
                  <ChevronLeft size={18} color={muted} />
                </Pressable>
                {children.length > 0 && (
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    {children.map((child) => (
                      <Pressable
                        key={child.id}
                        accessibilityRole="button"
                        onPress={() => router.push({ pathname: "/hadith/category/[id]", params: { id: child.id, title: child.title } })}
                        className="rounded-full border border-border bg-bg px-3 py-1.5"
                      >
                        <Text className="font-sans-bold text-xs text-fg">{child.title}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            );
          })
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
