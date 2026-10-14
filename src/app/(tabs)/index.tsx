import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { LayoutGrid, Search, Settings } from "lucide-react-native";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { AppUpdatePrompt } from "@/features/appUpdate/AppUpdatePrompt";
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
import { SECTION_ART } from "@/features/home/sectionArt";
import { SECTION_GROUPS, sectionsFor } from "@/features/home/sections";
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

/** Every section of the app, in the كل الأقسام screen's order, as one flat grid. */
const HOME_TILES = sectionsFor(SECTION_GROUPS.flatMap((group) => group.labels));

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

/** The brand's scene edge to edge: the Quran terrace, the tagline, read and listen. */
function WelcomeCard() {
  return (
    <View className="overflow-hidden bg-emerald-night">
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
          <Button variant="gold" image={SECTION_ART.quran} onPress={() => router.push("/quran")}>
            اقرأ القرآن
          </Button>
          {/* On the scene's dark overlay, so the light (translucent) button still fits here. */}
          <Button variant="light" image={SECTION_ART.listen} onPress={() => router.push("/listen")}>
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
    </View>
  );
}

/**
 * Home, top to bottom: the greeting, the scene (edge to edge), the next prayer, the shortcuts strip, the
 * kids' garden, continue reading, the day's hadith (both banners edge to edge), sponsors, supporters, and
 * every section of the app.
 */
export default function HomeScreen() {
  return (
    <Screen>
      <HomeTopBar />

      <Animated.View entering={enterSoft(1)}>
        <WelcomeCard />
      </Animated.View>
      <Animated.View entering={enterSoft(2)}>
        <Section className="mt-4">
          <NextPrayerCard />
        </Section>
      </Animated.View>
      <Animated.View entering={enterSoft(3)} className="mt-2">
        <QuickActions />
      </Animated.View>
      <Animated.View entering={enterSoft(4)} className="mt-2">
        <KidsBanner />
      </Animated.View>
      <Animated.View entering={enterSoft(5)}>
        <Section className="gap-4">
          <ContinueReadingCard />
          <RamadanCard />
        </Section>
      </Animated.View>
      <View className="mt-4">
        <DailyHadithBanner />
      </View>

      {/* Both render nothing (and no gap) when there is nothing to show. */}
      <SponsorCarousel className="mt-6 px-4" />
      <SupportersStrip className="mt-6" />

      <Section className="mt-6">
        <SectionsTitle />
        <SectionTiles sections={HOME_TILES} />
      </Section>

      <OfflineNotice />
      <AppUpdatePrompt />
      <SetupPrompt />
    </Screen>
  );
}
