import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { SectionGrid } from "@/features/home/SectionGrid";
import { useThemeColor } from "@/theme/useThemeColor";

/** Every built section of the app in the same tiles as Home, grouped. Opened from Home's "كل الأقسام". */
export default function SectionsScreen() {
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();
  const heroFg = useThemeColor("hero-fg");

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: insets.bottom + miniPlayer + 32 }}>
      <View className="rounded-b-[32px] bg-hero px-5 pb-6" style={{ paddingTop: insets.top + 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="رجوع"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          hitSlop={12}
          className="mb-3 self-start p-1"
        >
          <ChevronRight size={26} color={heroFg} />
        </Pressable>
        <Text className="font-sans-bold text-sm text-gold-soft">أقسام المنارة</Text>
        <Text className="mt-2 font-display-bold text-3xl leading-[46px] text-hero-fg">كل الأقسام</Text>
        <Text className="mt-1 font-sans text-sm leading-6 text-white/75">القرآن، ويومك، ورحلتك في الحفظ، والأدعية — كل قسم في مكانه.</Text>
      </View>

      <View className="px-4 pt-5">
        <SectionGrid />
      </View>
    </ScrollView>
  );
}
