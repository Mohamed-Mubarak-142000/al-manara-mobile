import { router } from "expo-router";
import { Flame } from "lucide-react-native";
import { Text, View } from "react-native";

import { toArabicDigits } from "@/core/text/arabic";
import { Card } from "@/components/ui/Card";
import { useNow } from "@/features/time/useNow";
import { useThemeColor } from "@/theme/useThemeColor";

import { currentStreak, dayKey, weekDays, weekSummary } from "./streakMath";
import { useReadingLog } from "./streakStore";

const WEEKDAY_INITIALS = ["س", "ح", "ن", "ث", "ر", "خ", "ج"];

function encouragement(streak: number, readToday: boolean): string {
  if (readToday && streak >= 7) return "ما شاء الله! أسبوع كامل وأكثر مع كتاب الله، ثبّتك الله.";
  if (readToday) return "أحسنت، قرأت اليوم. «أحبّ الأعمال إلى الله أدومها وإن قلّ».";
  if (streak > 0) return "لم تقرأ اليوم بعد، صفحة واحدة تحفظ سلسلتك.";
  return "ابدأ اليوم ولو بصفحة واحدة، والقليل الدائم خير من الكثير المنقطع.";
}

/** Reading streak and this week's summary, from the days the mushaf was opened and read. */
export function StreakCard() {
  const now = useNow(60_000);
  const { log, best } = useReadingLog();
  const accent = useThemeColor("accent");
  const days = new Set(Object.keys(log));
  const streak = currentStreak(days, now);
  const readToday = days.has(dayKey(now));
  const week = weekSummary(log, now);
  const strip = weekDays(log, now);
  const todayKey = dayKey(now);

  return (
    <Card onPress={() => router.push("/mushaf")} className="gap-4">
      <View className="flex-row items-center gap-3">
        <View className="size-12 items-center justify-center rounded-full bg-accent-soft">
          <Flame size={24} color={accent} fill={streak > 0 ? accent : "transparent"} />
        </View>
        <View className="flex-1">
          <Text className="font-sans-bold text-xs text-accent-strong">وِرد القراءة</Text>
          <Text className="font-display-bold text-2xl text-fg">
            {toArabicDigits(streak)} {streak === 1 ? "يوم" : "أيام متتالية"}
          </Text>
        </View>
        <View className="items-end">
          <Text className="font-sans text-xs text-fg-muted">أفضل سلسلة</Text>
          <Text className="font-display-bold text-base text-fg">{toArabicDigits(Math.max(best, streak))}</Text>
        </View>
      </View>

      <View className="flex-row justify-between" accessible accessibilityLabel={`هذا الأسبوع: قرأت ${toArabicDigits(week.days)} من ٧ أيام`}>
        {strip.map((day, index) => (
          <View key={day.key} className="items-center gap-1">
            <View
              className={`size-8 items-center justify-center rounded-full border ${
                day.read ? "border-primary bg-primary" : day.key === todayKey ? "border-accent bg-surface" : "border-border bg-surface"
              } ${day.future ? "opacity-40" : ""}`}
            >
              <Text className={`font-sans-bold text-xs ${day.read ? "text-on-primary" : "text-fg-muted"}`}>{WEEKDAY_INITIALS[index]}</Text>
            </View>
          </View>
        ))}
      </View>

      <View className="flex-row gap-2">
        <View className="flex-1 rounded-2xl bg-bg px-3 py-2">
          <Text className="font-sans text-xs text-fg-muted">صفحات هذا الأسبوع</Text>
          <Text className="font-display-bold text-lg text-fg">{toArabicDigits(week.pages)}</Text>
        </View>
        <View className="flex-1 rounded-2xl bg-bg px-3 py-2">
          <Text className="font-sans text-xs text-fg-muted">أيام القراءة</Text>
          <Text className="font-display-bold text-lg text-fg">{toArabicDigits(week.days)} / ٧</Text>
        </View>
      </View>

      <Text className="font-sans text-sm leading-6 text-fg-muted">{encouragement(streak, readToday)}</Text>
    </Card>
  );
}
