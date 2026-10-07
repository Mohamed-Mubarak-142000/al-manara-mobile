import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { BookOpen, ChevronLeft, Headphones } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getHijriDate } from "@/core/calendar/hijriDate";
import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { Screen, Section } from "@/components/ui/Screen";
import { NextPrayerCard } from "@/features/home/NextPrayerCard";
import { OfflineNotice } from "@/features/home/OfflineNotice";
import { QuickActions, openReading } from "@/features/home/QuickActions";
import { SectionGrid } from "@/features/home/SectionGrid";
import { SECTION_GROUPS } from "@/features/home/sections";
import { SponsorCarousel } from "@/features/home/SponsorCard";
import { SupportersStrip } from "@/features/home/SupportersStrip";
import { ContinueReadingCard } from "@/features/mushaf/ContinueReadingCard";
import { useReaderState } from "@/features/mushaf/readerPrefs";
import { RamadanCard } from "@/features/ramadan/RamadanCard";
import { useThemeColor } from "@/theme/useThemeColor";

function hijriLine(): string | null {
  try {
    const hijri = getHijriDate();
    return `${toArabicDigits(hijri.day)} ${hijri.monthName} ${toArabicDigits(hijri.year)} هـ`;
  } catch {
    return null;
  }
}

/** Home keeps the everyday groups; the rest (رحلتك، صوتيات، للعائلة) live under المزيد. */
const HOME_GROUPS = SECTION_GROUPS.slice(0, 2);

function AllSectionsLink() {
  const primary = useThemeColor("primary");
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push("/more")}
      hitSlop={8}
      className="mt-4 flex-row items-center justify-center gap-1 self-center rounded-full border border-border bg-surface px-5 py-2.5"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Text className="font-sans-bold text-sm text-primary">كل الأقسام</Text>
      <ChevronLeft size={16} color={primary} />
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const bg = useThemeColor("bg");
  const enter = (index: number) => FadeInDown.duration(700).delay(150 + index * 120);
  const hijri = hijriLine();
  const { lastRead } = useReaderState();

  return (
    <Screen bleed>
      <View className="overflow-hidden bg-emerald-night" style={{ paddingTop: insets.top + 24 }}>
        <Image source={require("@/assets/images/scenes/quran-terrace.webp")} contentFit="cover" style={{ position: "absolute", inset: 0 }} />
        <LinearGradient
          colors={["rgba(1,42,34,0.35)", "rgba(1,42,34,0.85)", "#012a22"]}
          locations={[0, 0.45, 1]}
          style={{ position: "absolute", inset: 0 }}
        />
        <LinearGradient colors={["transparent", bg]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 64 }} />

        <View className="px-5 pb-14">
          <Animated.View entering={enter(0)} className="flex-row">
            <View className="rounded-full border border-gold/30 bg-white/10 px-4 py-1.5">
              <Text className="font-sans-bold text-sm text-gold-soft">{hijri ?? "بسم الله نبدأ"}</Text>
            </View>
          </Animated.View>
          <Animated.Text entering={enter(1)} className="mt-5 font-display-bold text-[34px] leading-[54px] text-white">
            علمٌ ينير قلبك،{"\n"}
            <Text className="text-gold-soft">ومعرفةٌ ترافق يومك</Text>
          </Animated.Text>
          <Animated.Text entering={enter(2)} className="mt-3 font-sans text-base leading-8 text-white/80">
            اقرأ القرآن الكريم، واستمع لأجمل التلاوات، واجعل للذكر مكانًا ثابتًا في يومك.
          </Animated.Text>
          <Animated.View entering={enter(3)} className="mt-6 flex-row flex-wrap gap-3">
            <Button variant="gold" icon={BookOpen} onPress={() => openReading(lastRead)}>
              اقرأ القرآن
            </Button>
            <Button variant="light" icon={Headphones} onPress={() => router.push("/listen")}>
              استمع
            </Button>
          </Animated.View>
          <Animated.View entering={enter(4)} className="mt-8">
            <NextPrayerCard />
          </Animated.View>
        </View>
      </View>

      <Section className="-mt-6 gap-3">
        <QuickActions />
        <ContinueReadingCard />
        <RamadanCard />
      </Section>

      {/* Both render nothing (and no gap) when there is nothing to show. */}
      <SponsorCarousel className="mt-6 px-4" />
      <SupportersStrip className="mt-6" />

      <Section className="mt-6">
        <Text className="font-sans-bold text-sm text-accent-strong">أقسام المنارة</Text>
        <Text className="mb-4 mt-1 font-display-bold text-2xl text-fg">كل ما تحتاجه في يومك</Text>
        <SectionGrid groups={HOME_GROUPS} />
        <AllSectionsLink />
      </Section>

      <OfflineNotice />
    </Screen>
  );
}
