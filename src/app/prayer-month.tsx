import { router } from "expo-router";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { locationKey } from "@/core/prayer/location";
import { PRAYER_LABELS, PRAYER_ORDER, formatPrayerClock, getPrayerMonth, type PrayerMonthDay } from "@/core/prayer/prayerTimesApi";
import { toArabicDigits } from "@/core/text/arabic";
import { StateMessage } from "@/components/ui/StateMessage";
import { useUserLocation } from "@/features/prayer/locationStore";
import { useThemeColor } from "@/theme/useThemeColor";

const MONTHS = new Intl.DateTimeFormat("ar-EG", { month: "long", year: "numeric" });
const WEEKDAY = new Intl.DateTimeFormat("ar-EG", { weekday: "short" });

/** The month's prayer times for the saved location, a row per day, today highlighted. */
export default function PrayerMonthScreen() {
  const insets = useSafeAreaInsets();
  const heroFg = useThemeColor("hero-fg");
  const location = useUserLocation();
  const today = new Date();
  const [month, setMonth] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 });
  const key = `${locationKey(location)}|${month.year}-${month.month}`;
  const [result, setResult] = useState<{ key: string; days: PrayerMonthDay[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPrayerMonth(location, month.year, month.month).then((days) => !cancelled && setResult({ key, days }));
    return () => {
      cancelled = true;
    };
    // `key` covers the location and the month.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const days = result?.key === key ? result.days : null;
  const shift = (by: number) => {
    const next = new Date(month.year, month.month - 1 + by, 1);
    setMonth({ year: next.getFullYear(), month: next.getMonth() + 1 });
  };
  const isToday = (day: number) => day === today.getDate() && month.month === today.getMonth() + 1 && month.year === today.getFullYear();

  return (
    <FlatList
      className="flex-1 bg-bg"
      data={days ?? []}
      keyExtractor={(day) => String(day.day)}
      stickyHeaderIndices={[0]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      ListHeaderComponent={
        <View className="bg-bg">
          <View className="rounded-b-[32px] bg-hero px-5 pb-5" style={{ paddingTop: insets.top + 8 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="رجوع"
              onPress={() => router.back()}
              hitSlop={12}
              className="mb-2 self-start p-1"
            >
              <ChevronRight size={26} color={heroFg} />
            </Pressable>
            <Text className="font-display-bold text-2xl text-hero-fg">مواقيت الشهر</Text>
            <Text className="font-sans text-sm text-white/70">{location.label}</Text>
            <View className="mt-4 flex-row items-center justify-between">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="الشهر السابق"
                onPress={() => shift(-1)}
                hitSlop={10}
                className="p-1"
              >
                <ChevronRight size={22} color={heroFg} />
              </Pressable>
              <Text className="font-display-bold text-lg text-hero-fg">{MONTHS.format(new Date(month.year, month.month - 1, 1))}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="الشهر التالي" onPress={() => shift(1)} hitSlop={10} className="p-1">
                <ChevronLeft size={22} color={heroFg} />
              </Pressable>
            </View>
          </View>
          <View className="mx-3 mt-3 flex-row rounded-xl bg-surface-alt py-2">
            <Text className="w-14 text-center font-sans-bold text-[11px] text-fg-muted">اليوم</Text>
            {PRAYER_ORDER.map((key) => (
              <Text key={key} className="flex-1 text-center font-sans-bold text-[11px] text-fg-muted">
                {PRAYER_LABELS[key]}
              </Text>
            ))}
          </View>
        </View>
      }
      ListEmptyComponent={days ? <StateMessage message="تعذّر تحميل مواقيت هذا الشهر." /> : <StateMessage loading />}
      renderItem={({ item }) => {
        const current = isToday(item.day);
        const date = new Date(month.year, month.month - 1, item.day);
        return (
          <View
            className={`mx-3 flex-row items-center border-b border-border py-2.5 ${current ? "rounded-xl border-transparent bg-primary-soft" : ""}`}
          >
            <View className="w-14 items-center">
              <Text className={`font-display-bold text-sm ${current ? "text-primary" : "text-fg"}`}>{toArabicDigits(item.day)}</Text>
              <Text className="font-sans text-[10px] text-fg-muted">{WEEKDAY.format(date)}</Text>
            </View>
            {PRAYER_ORDER.map((key) => (
              <Text key={key} className={`flex-1 text-center font-sans text-xs ${current ? "font-sans-bold text-primary" : "text-fg"}`}>
                {toArabicDigits(formatPrayerClock(item.times[key]).split(" ")[0] ?? "")}
              </Text>
            ))}
          </View>
        );
      }}
    />
  );
}
