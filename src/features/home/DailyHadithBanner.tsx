import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ArrowLeft, ScrollText } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { planDay } from "@/core/plan/schedule";
import { getHadithOfTheDayOffline } from "@/features/hadith/offlineHadith";
import { useAsync } from "@/features/hadith/useAsync";
import { useThemeColor } from "@/theme/useThemeColor";

/**
 * A new hadith every day (the website's "حديث اليوم": the same hadith for everyone on a given day), as a
 * banner on Home. Nothing shows until it loads, or when it can't (offline before any pack is saved).
 */
export function DailyHadithBanner() {
  const gold = useThemeColor("gold-soft");
  // The brand's emerald in both themes, like the next-prayer card: a dark accent card in the page gutter.
  const deep = useThemeColor("emerald-deep");
  const night = useThemeColor("emerald-night");
  const today = planDay();
  const { state } = useAsync(`daily-hadith:${today}`, () => getHadithOfTheDayOffline(today));
  if (state.status !== "ready") return null;
  const hadith = state.data;
  const parts = hadith.text.split(/(«[^»]*»)/g).filter(Boolean);

  return (
    <Animated.View entering={FadeIn.duration(400)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`حديث اليوم: ${hadith.title}`}
        accessibilityHint="يفتح الحديث بشرحه وفوائده"
        onPress={() => router.push({ pathname: "/hadith/[id]", params: { id: hadith.id } })}
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}
      >
        {/* Edge to edge, like the other banners on Home. */}
        <View className="overflow-hidden">
          <LinearGradient colors={[deep, night]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={{ position: "absolute", inset: 0 }} />
          {/* Soft gold halos in the corners, the brand's palette. */}
          <View className="absolute -end-10 -top-12 size-40 rounded-full bg-gold/15" />
          <View className="absolute -bottom-16 -start-8 size-36 rounded-full bg-gold/10" />

          <View className="p-5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2 rounded-full border border-gold/40 bg-white/10 px-3 py-1">
                <ScrollText size={14} color={gold} />
                <Text className="font-sans-bold text-xs text-gold-soft">حديث اليوم</Text>
              </View>
              <Text className="text-2xl text-gold-soft/70">۞</Text>
            </View>

            <Text className="mt-4 font-sans-semibold text-lg leading-9 text-white" numberOfLines={5}>
              {parts.map((part, index) =>
                part.startsWith("«") ? (
                  <Text key={index} className="font-sans-bold text-gold-soft">
                    {part}
                  </Text>
                ) : (
                  part
                ),
              )}
            </Text>

            <View className="mt-4 flex-row items-center justify-between gap-3">
              <Text className="shrink font-sans text-xs leading-5 text-white/70" numberOfLines={2}>
                {hadith.attribution}
                {hadith.grade ? ` — ${hadith.grade}` : ""}
              </Text>
              <View className="flex-row items-center gap-1 rounded-full bg-gold px-3.5 py-2">
                <Text className="font-sans-bold text-xs text-emerald-night">اقرأ الشرح</Text>
                <ArrowLeft size={14} color={night} />
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
