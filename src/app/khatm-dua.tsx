import { router } from "expo-router";
import { ChevronRight, HandHeart } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { KhatmDuas } from "@/features/khatmDua/KhatmDuas";
import { useThemeColor } from "@/theme/useThemeColor";

/** "دعاء ختم القرآن": opened from the sections, the mushaf's last page and a finished khatma. */
export default function KhatmDuaScreen() {
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();
  const heroFg = useThemeColor("hero-fg");
  const gold = useThemeColor("gold-soft");

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
        <View className="flex-row items-center gap-2">
          <HandHeart size={16} color={gold} />
          <Text className="font-sans-bold text-sm text-gold-soft">دعاء ختم القرآن</Text>
        </View>
        <Text className="mt-2 font-display-bold text-3xl leading-[46px] text-hero-fg">ربنا تقبّل منا</Text>
        <Text className="mt-1 font-sans text-sm leading-6 text-white/75">
          أتممت القرآن؛ فادعُ الله بما تحب، وهذه أدعية جامعة من القرآن والسنة.
        </Text>
      </View>
      <View className="px-4 pt-5">
        <KhatmDuas />
      </View>
    </ScrollView>
  );
}
