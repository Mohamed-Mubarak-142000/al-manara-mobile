import { router } from "expo-router";
import { BookOpenText, ChevronLeft } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { toArabicDigits } from "@/core/text/arabic";
import { useThemeColor } from "@/theme/useThemeColor";

import { getSurah } from "./mushaf";
import { useReaderState } from "./readerPrefs";

/** "Continue where you stopped" — shown only once the user has read something. */
export function ContinueReadingCard() {
  const { lastRead } = useReaderState();
  const gold = useThemeColor("gold-soft");
  if (!lastRead) return null;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: "/mushaf", params: { page: String(lastRead.page) } })}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      <View className="flex-row items-center gap-3 rounded-3xl bg-hero p-4 shadow-lift">
        <View className="size-12 items-center justify-center rounded-2xl bg-white/10">
          <BookOpenText size={24} color={gold} />
        </View>
        <View className="flex-1">
          <Text className="font-sans-bold text-xs text-gold-soft">تابع القراءة</Text>
          <Text className="font-display-bold text-base text-hero-fg">
            سورة {getSurah(lastRead.surah)?.name} · الآية {toArabicDigits(lastRead.ayah)}
          </Text>
          <Text className="font-sans text-xs text-white/60">صفحة {toArabicDigits(lastRead.page)}</Text>
        </View>
        <ChevronLeft size={20} color={gold} />
      </View>
    </Pressable>
  );
}
