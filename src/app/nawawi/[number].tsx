import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, ChevronRight, ExternalLink, Lightbulb, NotebookText } from "lucide-react-native";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NAWAWI, narratorLine } from "@/core/nawawi/nawawiData";
import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
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
  const heroFg = useThemeColor("hero-fg");
  const gold = useThemeColor("gold-soft");
  const accent = useThemeColor("accent-strong");
  const muted = useThemeColor("fg-muted");
  const hadithText = useScaledText(22, 46);
  const hadith = NAWAWI.find((entry) => String(entry.number) === number);
  const previous = hadith && NAWAWI.find((entry) => entry.number === hadith.number - 1);
  const next = hadith && NAWAWI.find((entry) => entry.number === hadith.number + 1);

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: insets.bottom + miniPlayer + 32 }}>
      <View className="rounded-b-[32px] bg-hero px-5 pb-6" style={{ paddingTop: insets.top + 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="رجوع"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/nawawi"))}
          hitSlop={12}
          className="mb-3 self-start p-1"
        >
          <ChevronRight size={26} color={heroFg} />
        </Pressable>
        <View className="flex-row items-center gap-2">
          <NotebookText size={16} color={gold} />
          <Text className="font-sans-bold text-sm text-gold-soft">
            الأربعون النووية{hadith ? ` · الحديث ${toArabicDigits(hadith.number)}` : ""}
          </Text>
        </View>
        {hadith && (
          <>
            <Text className="mt-2 font-display-bold text-2xl leading-[42px] text-hero-fg">{hadith.title}</Text>
            <Text className="mt-1 font-sans text-sm leading-6 text-white/75">{narratorLine(hadith)}</Text>
          </>
        )}
      </View>

      {!hadith ? (
        <StateMessage message="لم نجد هذا الحديث." actionLabel="كل الأحاديث" onAction={() => router.replace("/nawawi")} />
      ) : (
        <View className="gap-6 px-4 pt-5">
          <View className="rounded-[28px] border border-border bg-surface p-5 shadow-soft">
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
          </View>

          <View className="gap-3">
            <Text accessibilityRole="header" className="font-display-bold text-xl text-fg">
              الشرح
            </Text>
            {hadith.explanation.split(/\n+/).map((paragraph, index) => (
              <Text key={index} className="font-sans text-base leading-8 text-fg">
                {paragraph}
              </Text>
            ))}
          </View>

          {hadith.lessons.length > 0 && (
            <View className="rounded-[28px] border border-accent/40 bg-accent-soft p-5">
              <View className="flex-row items-center gap-2">
                <Lightbulb size={20} color={accent} />
                <Text accessibilityRole="header" className="font-display-bold text-xl text-fg">
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
              <Button variant="outline" icon={ChevronRight} onPress={() => goTo(previous.number)}>
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
