import { router } from "expo-router";
import { ChevronLeft, ChevronRight, Moon } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getHijriDate } from "@/core/calendar/hijriDate";
import { IMSAK_MINUTES, calcSettingsKey, shiftClock } from "@/core/prayer/calculation";
import { locationKey } from "@/core/prayer/location";
import { PRAYER_LABELS, PRAYER_ORDER, formatPrayerClock, getPrayerMonth, type PrayerMonthDay } from "@/core/prayer/prayerTimesApi";
import { toArabicDigits } from "@/core/text/arabic";
import { StateMessage } from "@/components/ui/StateMessage";
import { useUserLocation } from "@/features/prayer/locationStore";
import { usePrayerCalcSettings } from "@/features/prayer/prayerCalcSettings";
import { useThemeColor } from "@/theme/useThemeColor";

const MONTHS = new Intl.DateTimeFormat("ar-EG", { month: "long", year: "numeric" });
const WEEKDAY = new Intl.DateTimeFormat("ar-EG", { weekday: "short" });

function clock(hhmm: string): string {
  return toArabicDigits(formatPrayerClock(hhmm).split(" ")[0] ?? "");
}

/** The month's prayer times for the saved location, a row per day, today highlighted; in Ramadan, an إمساكية. */
export default function PrayerMonthScreen() {
  const insets = useSafeAreaInsets();
  const heroFg = useThemeColor("hero-fg");
  const gold = useThemeColor("gold");
  const location = useUserLocation();
  const calc = usePrayerCalcSettings();
  const today = new Date();
  const [month, setMonth] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 });
  const [attempt, setAttempt] = useState(0);
  const key = `${locationKey(location)}|${calcSettingsKey(calc)}|${month.year}-${month.month}|${attempt}`;
  const [result, setResult] = useState<{ key: string; days: PrayerMonthDay[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPrayerMonth(location, month.year, month.month, calc).then((days) => !cancelled && setResult({ key, days }));
    return () => {
      cancelled = true;
    };
    // `key` covers the location, the settings, the month and retries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const days = result?.key === key ? result.days : null;

  // Hijri day per row (noon avoids any DST edge); a month touching Ramadan becomes an إمساكية.
  const ramadan = useMemo(() => {
    const byDay = new Map<number, number>();
    let year: number | null = null;
    for (const day of days ?? []) {
      const hijri = getHijriDate(new Date(month.year, month.month - 1, day.day, 12));
      if (hijri.isRamadan) {
        byDay.set(day.day, hijri.day);
        year = hijri.year;
      }
    }
    return { byDay, year };
  }, [days, month.year, month.month]);
  const imsakiya = ramadan.byDay.size > 0;

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
            <Text className="font-display-bold text-2xl text-hero-fg">
              {imsakiya ? `إمساكية رمضان ${toArabicDigits(ramadan.year ?? "")}` : "مواقيت الشهر"}
            </Text>
            <Text className="font-sans text-sm text-white/70">
              {location.label}
              {imsakiya ? ` · الإمساك قبل الفجر بـ${toArabicDigits(IMSAK_MINUTES)} دقائق` : ""}
            </Text>
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
            {imsakiya && <Text className="flex-1 text-center font-sans-bold text-[11px] text-accent-strong">الإمساك</Text>}
            {PRAYER_ORDER.map((prayer) => (
              <Text
                key={prayer}
                className={`flex-1 text-center font-sans-bold text-[11px] ${imsakiya && prayer === "maghrib" ? "text-accent-strong" : "text-fg-muted"}`}
              >
                {imsakiya && prayer === "maghrib" ? "الإفطار" : PRAYER_LABELS[prayer]}
              </Text>
            ))}
          </View>
        </View>
      }
      ListEmptyComponent={
        days ? (
          <StateMessage message="تعذّر تحميل مواقيت هذا الشهر." onRetry={() => setAttempt((value) => value + 1)} />
        ) : (
          <StateMessage loading />
        )
      }
      renderItem={({ item }) => {
        const current = isToday(item.day);
        const date = new Date(month.year, month.month - 1, item.day);
        const ramadanDay = ramadan.byDay.get(item.day);
        return (
          <View
            className={`mx-3 flex-row items-center border-b border-border py-2.5 ${current ? "rounded-xl border-transparent bg-primary-soft" : ""}`}
          >
            <View className="w-14 items-center">
              <Text className={`font-display-bold text-sm ${current ? "text-primary" : "text-fg"}`}>{toArabicDigits(item.day)}</Text>
              <Text className="font-sans text-[10px] text-fg-muted">{WEEKDAY.format(date)}</Text>
              {ramadanDay !== undefined && (
                <View className="mt-0.5 flex-row items-center gap-0.5">
                  <Moon size={9} color={gold} />
                  <Text className="font-sans-bold text-[9px] text-accent-strong">{toArabicDigits(ramadanDay)}</Text>
                </View>
              )}
            </View>
            {imsakiya && (
              <Text className="flex-1 text-center font-sans-bold text-xs text-accent-strong">
                {ramadanDay !== undefined ? clock(shiftClock(item.times.fajr, -IMSAK_MINUTES)) : "–"}
              </Text>
            )}
            {PRAYER_ORDER.map((prayer) => {
              const iftar = ramadanDay !== undefined && prayer === "maghrib";
              return (
                <View key={prayer} className="flex-1 items-center">
                  <Text
                    className={`text-center text-xs ${
                      iftar
                        ? "rounded-md bg-accent-soft px-1 font-sans-bold text-accent-strong"
                        : current
                          ? "font-sans-bold text-primary"
                          : "font-sans text-fg"
                    }`}
                  >
                    {clock(item.times[prayer])}
                  </Text>
                </View>
              );
            })}
          </View>
        );
      }}
    />
  );
}
