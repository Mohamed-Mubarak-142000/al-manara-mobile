import { router, useLocalSearchParams } from "expo-router";
import { BookOpenText, ChevronLeft, ChevronRight, ExternalLink, Lightbulb, NotebookText } from "lucide-react-native";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NAWAWI, narratorLine } from "@/core/nawawi/nawawiData";
import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { ScreenHeader, enterSoft } from "@/components/ui/PageHeader";
import { StateMessage } from "@/components/ui/StateMessage";
import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { useScaledText } from "@/theme/textScale";
import { useThemeColor } from "@/theme/useThemeColor";

function goTo(number: number) {
  // Replace, so reading through all 42 doesn't stack 42 screens behind the list.
  router.replace({ pathname: "/nawawi/[number]", params: { number: String(number) } });
}

/** One of the Forty: the hadith, its grade and source, the explanation and its lessons. */
export default function NawawiHadithScreen() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();
  const primary = useThemeColor("primary");
  const accent = useThemeColor("accent-strong");
  const muted = useThemeColor("fg-muted");
  const hadithText = useScaledText(22, 46);
  const hadith = NAWAWI.find((entry) => String(entry.number) === number);
  const previous = hadith && NAWAWI.find((entry) => entry.number === hadith.number - 1);
  const next = hadith && NAWAWI.find((entry) => entry.number === hadith.number + 1);

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: insets.bottom + miniPlayer + 32 }}>
      <ScreenHeader
        title="الأربعون النووية"
        subtitle={hadith ? `الحديث ${toArabicDigits(hadith.number)} من ${toArabicDigits(NAWAWI.length)}` : undefined}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/nawawi"))}
      />

      {!hadith ? (
        <StateMessage message="لم نجد هذا الحديث." actionLabel="كل الأحاديث" onAction={() => router.replace("/nawawi")} />
      ) : (
        <View className="gap-6 px-4 pt-2">
          <Animated.View entering={enterSoft(0)}>
            <View className="flex-row items-center gap-2">
              <NotebookText size={16} color={primary} />
              <Text className="font-sans-bold text-sm text-primary">الحديث {toArabicDigits(hadith.number)}</Text>
            </View>
            <Text className="mt-2 font-sans-bold text-2xl leading-10.5 text-fg">{hadith.title}</Text>
            <Text className="mt-1 font-sans text-sm leading-6 text-fg-muted">{narratorLine(hadith)}</Text>
          </Animated.View>

          <Animated.View entering={enterSoft(1)} className="rounded-3xl border border-border bg-surface p-5 shadow-card">
            {/* Amiri Quran rather than the Hafs face, which draws the Arabic comma as a dotted circle. */}
            <Text className="font-quran-fallback text-fg" style={hadithText}>
              {hadith.hadith}
            </Text>
            <View className="mt-4 flex-row flex-wrap items-center gap-2">
              <View className="rounded-full bg-primary-soft px-3 py-0.5">
                <Text className="font-sans-bold text-sm text-primary">{hadith.grade}</Text>
              </View>
              <Text className="flex-1 font-sans text-xs leading-5 text-fg-muted">{hadith.attribution}</Text>
            </View>
          </Animated.View>

          <View className="gap-3">
            <View className="flex-row items-center gap-2">
              <BookOpenText size={18} color={primary} />
              <Text accessibilityRole="header" className="font-sans-bold text-base text-fg">
                الشرح
              </Text>
            </View>
            {hadith.explanation.split(/\n+/).map((paragraph, index) => (
              <Text key={index} className="font-sans text-base leading-8 text-fg">
                {paragraph}
              </Text>
            ))}
          </View>

          {hadith.lessons.length > 0 && (
            <View className="rounded-3xl border border-accent/40 bg-accent-soft p-5">
              <View className="flex-row items-center gap-2">
                <Lightbulb size={18} color={accent} />
                <Text accessibilityRole="header" className="font-sans-bold text-base text-fg">
                  من فوائد الحديث
                </Text>
              </View>
              <View className="mt-3 gap-2">
                {hadith.lessons.map((lesson) => (
                  <View key={lesson} className="flex-row gap-2">
                    <Text className="font-sans text-base leading-8 text-accent-strong">•</Text>
                    <Text className="flex-1 font-sans text-base leading-8 text-fg">{lesson}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <Pressable
            accessibilityRole="link"
            accessibilityHint="يفتح الحديث على موسوعة الأحاديث النبوية"
            onPress={() => Linking.openURL(hadith.url).catch(() => {})}
            hitSlop={8}
            className="flex-row items-center gap-1.5 self-start"
          >
            <Text className="font-sans text-sm text-fg-muted underline">الحديث في موسوعة الأحاديث النبوية</Text>
            <ExternalLink size={14} color={muted} />
          </Pressable>

          <View className="flex-row items-center justify-between gap-3 border-t border-border pt-5">
            {previous ? (
              <Button variant="secondary" icon={ChevronRight} onPress={() => goTo(previous.number)}>
                {`الحديث ${toArabicDigits(previous.number)}`}
              </Button>
            ) : (
              <View />
            )}
            {next ? (
              <Button icon={ChevronLeft} onPress={() => goTo(next.number)}>
                {`الحديث ${toArabicDigits(next.number)}`}
              </Button>
            ) : (
              <View />
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
