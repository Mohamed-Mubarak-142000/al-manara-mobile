import { router } from "expo-router";
import { CalendarDays, ChevronLeft, ChevronRight, MoonStar } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  WEEKDAYS_SHORT,
  gregorianMonthGrid,
  hijriMonthGrid,
  sameDay,
  shiftHijriMonth,
  upcomingOccasions,
  type CalendarCell,
} from "@/core/calendar/calendarModel";
import { dualDate } from "@/core/calendar/format";
import { daysBetween, getHijriDate, getNextRamadanStart } from "@/core/calendar/hijriDate";
import { toArabicDigits } from "@/core/text/arabic";
import { useThemeColor } from "@/theme/useThemeColor";

type Mode = "gregorian" | "hijri";
const GREGORIAN_TITLE = new Intl.DateTimeFormat("ar-EG", { month: "long", year: "numeric" });
const LONG_DATE = new Intl.DateTimeFormat("ar-EG", { weekday: "long", day: "numeric", month: "long" });

function daysWord(days: number): string {
  if (days === 1) return "يوم واحد";
  if (days === 2) return "يومان";
  return `${toArabicDigits(days)} ${days <= 10 ? "أيام" : "يومًا"}`;
}

/** The website's /calendar: both calendars, the Hijri occasions, and how far Ramadan is. */
export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const heroFg = useThemeColor("hero-fg");
  const gold = useThemeColor("gold-soft");
  const fg = useThemeColor("fg");
  const today = useMemo(() => new Date(), []);
  const [mode, setMode] = useState<Mode>("hijri");
  const [anchor, setAnchor] = useState(today);
  const [selected, setSelected] = useState(today);

  const month = useMemo(() => {
    if (mode === "hijri") {
      const hijriMonth = hijriMonthGrid(anchor);
      return {
        title: `${hijriMonth.hijri.monthName} ${toArabicDigits(hijriMonth.hijri.year)} هـ`,
        subtitle: `${toArabicDigits(hijriMonth.days)} يومًا`,
        cells: hijriMonth.cells,
      };
    }
    return { title: GREGORIAN_TITLE.format(anchor), subtitle: "", cells: gregorianMonthGrid(anchor.getFullYear(), anchor.getMonth()) };
  }, [mode, anchor]);

  const ramadan = useMemo(() => {
    if (getHijriDate(today).isRamadan) return null;
    const start = getNextRamadanStart(today);
    return start ? daysBetween(today, start) : null;
  }, [today]);
  const upcoming = useMemo(() => upcomingOccasions(today, 5), [today]);
  const chosen = dualDate(selected);
  const chosenCell = month.cells.find((entry) => sameDay(entry.date, selected));

  function shift(delta: 1 | -1) {
    if (mode === "hijri") setAnchor(shiftHijriMonth(anchor, delta));
    else setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1, 12));
  }

  function DayCell({ cell }: { cell: CalendarCell }) {
    const isToday = sameDay(cell.date, today);
    const isSelected = sameDay(cell.date, selected);
    const primaryNumber = mode === "hijri" ? cell.hijri.day : cell.date.getDate();
    const secondaryNumber = mode === "hijri" ? cell.date.getDate() : cell.hijri.day;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={LONG_DATE.format(cell.date)}
        onPress={() => setSelected(cell.date)}
        className="w-[14.28%] p-0.5"
      >
        <View
          className={`h-14 items-center justify-center rounded-xl ${isSelected ? "bg-primary" : isToday ? "border border-primary bg-primary-soft" : cell.occasion ? "bg-accent-soft" : ""}`}
          style={{ opacity: cell.inMonth ? 1 : 0.35 }}
        >
          <Text className={`font-display-bold text-base ${isSelected ? "text-on-primary" : "text-fg"}`}>
            {toArabicDigits(primaryNumber)}
          </Text>
          <Text className={`font-sans text-[10px] ${isSelected ? "text-on-primary" : "text-fg-muted"}`}>
            {toArabicDigits(secondaryNumber)}
          </Text>
          {cell.occasion && !isSelected && <View className="absolute bottom-1 size-1 rounded-full bg-gold" />}
        </View>
      </Pressable>
    );
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
      <View className="rounded-b-[32px] bg-hero px-5 pb-6" style={{ paddingTop: insets.top + 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="رجوع"
          onPress={() => router.back()}
          hitSlop={12}
          className="mb-3 self-start p-1"
        >
          <ChevronRight size={26} color={heroFg} />
        </Pressable>
        <View className="flex-row items-center gap-2">
          <CalendarDays size={16} color={gold} />
          <Text className="font-sans-bold text-sm text-gold-soft">التقويم</Text>
        </View>
        <Text className="mt-2 font-display-bold text-2xl leading-10 text-hero-fg">الهجري والميلادي في مكان واحد</Text>
        <Text className="mt-1 font-sans text-sm leading-6 text-white/75">
          {`${chosen.weekday} ${chosen.hijriDay} ${chosen.hijriMonth} ${chosen.hijriYear} هـ · ${chosen.gregorianDay} ${chosen.gregorianMonth} ${chosen.gregorianYear}`}
        </Text>
      </View>

      <View className="gap-4 px-4 pt-5">
        <View className="flex-row rounded-full border border-border bg-surface p-1">
          {(
            [
              ["hijri", "هجري"],
              ["gregorian", "ميلادي"],
            ] as const
          ).map(([value, label]) => (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === value }}
              onPress={() => setMode(value)}
              className={`flex-1 items-center rounded-full py-2 ${mode === value ? "bg-primary" : ""}`}
            >
              <Text className={`font-sans-bold text-sm ${mode === value ? "text-on-primary" : "text-fg-muted"}`}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <View className="rounded-3xl border border-border bg-surface p-3 shadow-soft">
          <View className="mb-2 flex-row items-center justify-between px-1">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="الشهر السابق"
              onPress={() => shift(-1)}
              hitSlop={10}
              className="p-1.5"
            >
              <ChevronRight size={22} color={fg} />
            </Pressable>
            <View className="items-center">
              <Text className="font-display-bold text-lg text-fg">{month.title}</Text>
              {month.subtitle ? <Text className="font-sans text-xs text-fg-muted">{month.subtitle}</Text> : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="الشهر التالي" onPress={() => shift(1)} hitSlop={10} className="p-1.5">
              <ChevronLeft size={22} color={fg} />
            </Pressable>
          </View>
          <View className="flex-row">
            {WEEKDAYS_SHORT.map((day) => (
              <Text key={day} className="w-[14.28%] text-center font-sans-bold text-[10px] text-fg-muted">
                {day}
              </Text>
            ))}
          </View>
          <View className="mt-1 flex-row flex-wrap">
            {month.cells.map((cell) => (
              <DayCell key={cell.date.toISOString()} cell={cell} />
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setAnchor(today);
              setSelected(today);
            }}
            className="mt-2 self-center rounded-full border border-border px-4 py-1.5"
          >
            <Text className="font-sans-bold text-xs text-fg">اليوم</Text>
          </Pressable>
        </View>

        <View className="rounded-3xl border border-border bg-surface p-4">
          <Text className="font-sans-bold text-xs text-fg-muted">{sameDay(selected, today) ? "اليوم" : "اليوم المحدد"}</Text>
          <Text className="mt-1 font-display-bold text-lg text-fg">
            {chosen.hijriDay} {chosen.hijriMonth} {chosen.hijriYear} هـ
          </Text>
          <Text className="font-sans text-sm text-fg-muted">
            {chosen.weekday} {chosen.gregorianDay} {chosen.gregorianMonth} {chosen.gregorianYear}
          </Text>
          {chosenCell?.occasion && <Text className="mt-2 font-sans-bold text-sm text-accent-strong">{chosenCell.occasion.label}</Text>}
        </View>

        {ramadan !== null ? (
          <View className="flex-row items-center gap-3 rounded-3xl bg-hero p-5">
            <MoonStar size={30} color={gold} />
            <View className="flex-1">
              <Text className="font-sans text-sm text-white/75">يفصلنا عن رمضان تقريبًا</Text>
              <Text className="font-display-bold text-2xl text-hero-fg">{daysWord(ramadan)}</Text>
            </View>
          </View>
        ) : (
          <View className="flex-row items-center gap-3 rounded-3xl bg-hero p-5">
            <MoonStar size={30} color={gold} />
            <Text className="flex-1 font-display-bold text-lg text-hero-fg">رمضان مبارك، تقبّل الله صيامكم وقيامكم</Text>
          </View>
        )}

        <View className="gap-2 rounded-3xl border border-border bg-surface p-4">
          <Text className="font-display-bold text-base text-fg">مناسبات قادمة</Text>
          {upcoming.map((entry) => (
            <View key={entry.occasion.label} className="flex-row items-center justify-between border-t border-border pt-2">
              <View>
                <Text className="font-sans-bold text-sm text-fg">{entry.occasion.label}</Text>
                <Text className="font-sans text-xs text-fg-muted">{LONG_DATE.format(entry.date)}</Text>
              </View>
              <Text className="font-sans-bold text-xs text-accent-strong">
                {entry.inDays === 0 ? "اليوم" : `بعد ${daysWord(entry.inDays)}`}
              </Text>
            </View>
          ))}
        </View>

        <Text className="text-center font-sans text-xs leading-5 text-fg-muted">
          التواريخ الهجرية وفق تقويم أم القرى، وقد تختلف يومًا حسب رؤية الهلال في بلدك.
        </Text>
      </View>
    </ScrollView>
  );
}
