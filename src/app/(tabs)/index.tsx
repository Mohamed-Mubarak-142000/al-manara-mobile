import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { BookOpen, ChevronLeft, Headphones, LayoutGrid, Search, Settings } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { getHijriDate } from "@/core/calendar/hijriDate";
import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { IconButton, enterSoft } from "@/components/ui/PageHeader";
import { Screen, Section } from "@/components/ui/Screen";
import { DailyHadithBanner } from "@/features/home/DailyHadithBanner";
import { KidsBanner } from "@/features/home/KidsBanner";
import { NextPrayerCard } from "@/features/home/NextPrayerCard";
import { OfflineNotice } from "@/features/home/OfflineNotice";
import { SetupPrompt } from "@/features/settings/SetupPrompt";
import { QuickActions } from "@/features/home/QuickActions";
import { SectionTiles } from "@/features/home/SectionGrid";
import { HOME_SECTIONS, sectionsFor } from "@/features/home/sections";
import { SponsorCarousel } from "@/features/home/SponsorCard";
import { SupportersStrip } from "@/features/home/SupportersStrip";
import { ContinueReadingCard } from "@/features/mushaf/ContinueReadingCard";
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

/** Home keeps the most-used sections in one flat grid; every section is on the كل الأقسام screen. */
const HOME_TILES = sectionsFor(HOME_SECTIONS);

/** The light top bar: today's hijri date and a greeting at the start, search and settings at the end. */
function HomeTopBar() {
  const hijri = hijriLine();
  return (
    <Animated.View entering={enterSoft(0)} className="flex-row items-center gap-3 px-4 pb-4 pt-2.5">
      <View className="flex-1">
        <Text className="font-sans-bold text-xs text-primary" numberOfLines={1}>
          {hijri ?? "بسم الله نبدأ"}
        </Text>
        <Text className="mt-0.5 font-sans-bold text-lg text-fg" numberOfLines={1}>
          السلام عليكم ورحمة الله
        </Text>
      </View>
      <IconButton icon={Search} label="البحث" onPress={() => router.push("/search")} />
      <IconButton icon={Settings} label="الإعدادات" onPress={() => router.push("/settings")} />
    </Animated.View>
  );
}

/** The brand's scene as a rounded card in the gutter: the Quran terrace, the tagline, read and listen. */
function WelcomeCard() {
  return (
    <View className="overflow-hidden rounded-4xl bg-emerald-night">
      <Image
        source={require("@/assets/images/scenes/quran-terrace.webp")}
        contentFit="cover"
        style={{ position: "absolute", inset: 0 }}
        accessible={false}
      />
      <LinearGradient
        colors={["rgba(1,42,34,0.25)", "rgba(1,42,34,0.7)", "rgba(1,42,34,0.92)"]}
        locations={[0, 0.5, 1]}
        style={{ position: "absolute", inset: 0 }}
      />
      <View className="p-5 pt-16">
        <Text className="font-sans-bold text-2xl leading-10 text-white">
          علمٌ ينير قلبك،{"\n"}
          <Text className="text-gold-soft">ومعرفةٌ ترافق يومك</Text>
        </Text>
        <Text className="mt-1.5 font-sans text-sm leading-6 text-white/80">
          اقرأ القرآن الكريم، واستمع لأجمل التلاوات، واجعل للذكر مكانًا ثابتًا في يومك.
        </Text>
        <View className="mt-4 flex-row flex-wrap gap-3">
          {/* The index, not the last page: "continue reading" is the card below, once on Home. */}
          <Button variant="gold" icon={BookOpen} onPress={() => router.push("/quran")}>
            اقرأ القرآن
          </Button>
          {/* On the scene's dark overlay, so the light (translucent) button still fits here. */}
          <Button variant="light" icon={Headphones} onPress={() => router.push("/listen")}>
            استمع
          </Button>
        </View>
      </View>
    </View>
  );
}

function SectionsTitle() {
  const primary = useThemeColor("primary");
  return (
    <View className="mb-3 flex-row items-center gap-2">
      <LayoutGrid size={16} color={primary} />
      <Text className="flex-1 font-sans-bold text-base text-fg">أقسام المنارة</Text>
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push("/sections")}
        hitSlop={8}
        className="flex-row items-center gap-0.5"
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Text className="font-sans-bold text-sm text-primary">كل الأقسام</Text>
        <ChevronLeft size={16} color={primary} />
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  return (
    <Screen>
      <HomeTopBar />

      <Section className="gap-4">
        <Animated.View entering={enterSoft(1)}>
          <WelcomeCard />
        </Animated.View>
        <Animated.View entering={enterSoft(2)}>
          <NextPrayerCard />
        </Animated.View>
        <Animated.View entering={enterSoft(3)} className="gap-4">
          <QuickActions />
          <ContinueReadingCard />
          <RamadanCard />
          <DailyHadithBanner />
          <KidsBanner />
        </Animated.View>
      </Section>

      {/* Both render nothing (and no gap) when there is nothing to show. */}
      <SponsorCarousel className="mt-6 px-4" />
      <SupportersStrip className="mt-6" />

      <Animated.View entering={enterSoft(4)}>
        <Section className="mt-6">
          <SectionsTitle />
          <SectionTiles sections={HOME_TILES} />
        </Section>
      </Animated.View>

      <OfflineNotice />
      <SetupPrompt />
    </Screen>
  );
}
