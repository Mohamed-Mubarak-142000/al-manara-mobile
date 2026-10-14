import { ChevronLeft, ChevronRight, Moon } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getHijriDate } from "@/core/calendar/hijriDate";
import { IMSAK_MINUTES, calcSettingsKey, shiftClock } from "@/core/prayer/calculation";
import { locationKey } from "@/core/prayer/location";
import { PRAYER_LABELS, PRAYER_ORDER, formatPrayerClock, getPrayerMonth, type PrayerMonthDay } from "@/core/prayer/prayerTimesApi";
import { toArabicDigits } from "@/core/text/arabic";
import { IconButton, ScreenHeader, enterSoft } from "@/components/ui/PageHeader";
import { StateMessage } from "@/components/ui/StateMessage";
import { SECTION_ART } from "@/features/home/sectionArt";
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
          <ScreenHeader
            title={imsakiya ? `إمساكية رمضان ${toArabicDigits(ramadan.year ?? "")}` : "مواقيت الشهر"}
            subtitle={`${location.label}${imsakiya ? ` · الإمساك قبل الفجر بـ${toArabicDigits(IMSAK_MINUTES)} دقائق` : ""}`}
            art={SECTION_ART.calendar}
          />
          <Animated.View entering={enterSoft(0)} className="mx-4 mt-1 flex-row items-center justify-between gap-3">
            <IconButton icon={ChevronRight} label="الشهر السابق" onPress={() => shift(-1)} />
            <Text className="flex-1 text-center font-sans-bold text-base text-fg">
              {MONTHS.format(new Date(month.year, month.month - 1, 1))}
            </Text>
            <IconButton icon={ChevronLeft} label="الشهر التالي" onPress={() => shift(1)} />
          </Animated.View>
          {/* Seven columns must fit 360dp: tight side margins, and labels shrink a touch rather than wrap. */}
          <Animated.View entering={enterSoft(1)} className="mx-2 mt-3 flex-row rounded-2xl bg-surface-alt py-2.5">
            <Text className="w-14 text-center font-sans-bold text-xs text-fg-muted">اليوم</Text>
            {imsakiya && (
              <Text numberOfLines={1} adjustsFontSizeToFit className="flex-1 text-center font-sans-bold text-xs text-accent-strong">
                الإمساك
              </Text>
            )}
            {PRAYER_ORDER.map((prayer) => (
              <Text
                key={prayer}
                numberOfLines={1}
                adjustsFontSizeToFit
                className={`flex-1 text-center font-sans-bold text-xs ${imsakiya && prayer === "maghrib" ? "text-accent-strong" : "text-fg-muted"}`}
              >
                {imsakiya && prayer === "maghrib" ? "الإفطار" : PRAYER_LABELS[prayer]}
              </Text>
            ))}
          </Animated.View>
        </View>
      }
      ListEmptyComponent={
        days ? (
          <StateMessage message="تعذّر تحميل مواقيت هذا الشهر." onRetry={() => setAttempt((value) => value + 1)} />
        ) : (
          <StateMessage loading />
        )
      }
      renderItem={({ item, index }) => {
        const current = isToday(item.day);
        const date = new Date(month.year, month.month - 1, item.day);
        const ramadanDay = ramadan.byDay.get(item.day);
        return (
          <Animated.View
            entering={enterSoft(Math.min(index, 8))}
            className={`mx-2 flex-row items-center border-b border-border py-2.5 ${current ? "rounded-2xl border-transparent bg-primary-soft" : ""}`}
          >
            <View className="w-14 items-center">
              <Text className={`font-sans-bold text-sm ${current ? "text-primary" : "text-fg"}`}>{toArabicDigits(item.day)}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit className="font-sans text-xs text-fg-muted">
                {WEEKDAY.format(date)}
              </Text>
              {ramadanDay !== undefined && (
                <View className="mt-0.5 flex-row items-center gap-0.5">
                  <Moon size={12} color={gold} />
                  <Text className="font-sans-bold text-xs text-accent-strong">{toArabicDigits(ramadanDay)}</Text>
                </View>
              )}
            </View>
            {imsakiya && (
              <Text className="flex-1 text-center font-sans-bold text-[13px] text-accent-strong">
                {ramadanDay !== undefined ? clock(shiftClock(item.times.fajr, -IMSAK_MINUTES)) : "–"}
              </Text>
            )}
            {PRAYER_ORDER.map((prayer) => {
              const iftar = ramadanDay !== undefined && prayer === "maghrib";
              return (
                <View key={prayer} className="flex-1 items-center">
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    className={`text-center text-[13px] ${
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
          </Animated.View>
        );
      }}
    />
  );
}
