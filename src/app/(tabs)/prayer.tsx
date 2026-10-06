import { router } from "expo-router";
import { CalendarRange, Clock, Compass, LocateFixed, WifiOff } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { getHijriDate } from "@/core/calendar/hijriDate";
import { calcMethodInfo } from "@/core/prayer/calculation";
import { PRAYER_LABELS, PRAYER_ORDER, formatPrayerClock, getCurrentPrayerKey, getPrayerWindow } from "@/core/prayer/prayerTimesApi";
import { pad2, toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Screen, Section } from "@/components/ui/Screen";
import { StateMessage } from "@/components/ui/StateMessage";
import { AdhanSettingsCard } from "@/features/prayer/AdhanSettingsCard";
import { CalculationSettingsCard } from "@/features/prayer/CalculationSettingsCard";
import { requestPreciseLocation, type GeolocateResult } from "@/features/prayer/locationStore";
import { usePrayerCalcSettings } from "@/features/prayer/prayerCalcSettings";
import { usePrayerDay } from "@/features/prayer/usePrayerDay";
import { useThemeColor } from "@/theme/useThemeColor";

const GEO_MESSAGES: Record<Exclude<GeolocateResult, "ok">, string> = {
  denied: "لم يُسمح بالوصول للموقع. يمكنك تفعيله من إعدادات الجهاز.",
  error: "تعذّر تحديد موقعك الآن.",
};

/** hh:mm:ss in Arabic digits, as on Home's next-prayer card. */
function countdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return toArabicDigits(`${pad2(Math.floor(total / 3600))}:${pad2(Math.floor((total % 3600) / 60))}:${pad2(total % 60)}`);
}

export default function PrayerScreen() {
  const { location, now, state, refresh, refreshing } = usePrayerDay();
  const calc = usePrayerCalcSettings();
  const accentStrong = useThemeColor("accent-strong");
  const [locating, setLocating] = useState(false);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const current = state.status === "ready" ? getCurrentPrayerKey(state.day.times, now) : null;
  const span = state.status === "ready" ? getPrayerWindow(state.day.times, now) : null;
  const next = span?.next.key ?? null;
  const hijri = getHijriDate(now);

  async function locate() {
    setLocating(true);
    const result = await requestPreciseLocation();
    setLocating(false);
    setGeoMessage(result === "ok" ? null : GEO_MESSAGES[result]);
  }

  return (
    <Screen bleed refreshing={refreshing} onRefresh={refresh}>
      <PageHeader
        kicker="مواقيت الصلاة"
        icon={Clock}
        title={location.label}
        description={`حسب ${calcMethodInfo(calc.method).label}.`}
        actions={
          <Button variant="light" size="sm" icon={LocateFixed} onPress={locate} disabled={locating}>
            {locating ? "جارٍ التحديد…" : "استخدم موقعي"}
          </Button>
        }
      />
      <Section className="mt-5">
        {geoMessage && <Text className="mb-3 font-sans text-sm text-danger">{geoMessage}</Text>}
        <View className="mb-3 flex-row items-center justify-between rounded-3xl border border-border bg-surface px-5 py-4 shadow-soft">
          <View className="flex-1">
            <Text className="font-sans-bold text-xs text-fg-muted">
              {span ? `الصلاة القادمة: ${span.next.label}` : "الصلاة القادمة"}
            </Text>
            <Text className="mt-0.5 font-display-bold text-2xl text-primary" style={{ fontVariant: ["tabular-nums"] }}>
              {span ? countdown(span.next.at.getTime() - now.getTime()) : "…"}
            </Text>
          </View>
          <View className="items-end">
            <Text className="font-display-bold text-base text-fg">
              {toArabicDigits(hijri.day)} {hijri.monthName}
            </Text>
            <Text className="font-sans text-xs text-fg-muted">{toArabicDigits(hijri.year)} هـ</Text>
          </View>
        </View>
        {state.status === "ready" ? (
          <>
            {state.day.source === "device" && (
              <View className="mb-3 flex-row items-center gap-2 rounded-2xl bg-accent-soft px-4 py-2.5">
                <WifiOff size={14} color={accentStrong} />
                <Text className="flex-1 font-sans text-xs text-accent-strong">لا يوجد اتصال؛ المواقيت محسوبة على جهازك بنفس الإعدادات.</Text>
              </View>
            )}
            <View className="overflow-hidden rounded-3xl border border-border bg-surface shadow-soft">
              {PRAYER_ORDER.map((key, index) => {
                const isNext = key === next;
                return (
                  <View
                    key={key}
                    className={`flex-row items-center justify-between px-5 py-4 ${index > 0 ? "border-t border-border" : ""} ${isNext ? "bg-primary-soft" : ""}`}
                  >
                    <View className="flex-row items-center gap-2">
                      <Text className={`font-display-bold text-lg ${isNext ? "text-primary" : "text-fg"}`}>{PRAYER_LABELS[key]}</Text>
                      {isNext && (
                        <View className="rounded-full bg-gold px-2 py-0.5">
                          <Text className="font-sans-bold text-[10px] text-emerald-night">القادمة</Text>
                        </View>
                      )}
                      {key === current && !isNext && <Text className="font-sans text-xs text-fg-muted">الآن</Text>}
                    </View>
                    <Text className={`font-display-bold text-lg ${isNext ? "text-primary" : "text-fg"}`}>
                      {toArabicDigits(formatPrayerClock(state.day.times[key]))}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        ) : state.status === "error" ? (
          <StateMessage message="تعذّر تحميل المواقيت الآن." onRetry={refresh} />
        ) : (
          <StateMessage loading />
        )}
        <View className="mt-4 flex-row gap-3">
          <Button variant="outline" icon={CalendarRange} className="flex-1" onPress={() => router.push("/prayer-month")}>
            جدول الشهر
          </Button>
          <Button variant="outline" icon={Compass} className="flex-1" onPress={() => router.push("/qibla")}>
            اتجاه القبلة
          </Button>
        </View>
        <CalculationSettingsCard />
        <AdhanSettingsCard />
      </Section>
    </Screen>
  );
}
