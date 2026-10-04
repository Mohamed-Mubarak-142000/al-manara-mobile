import { router } from "expo-router";
import { CalendarRange, Clock, Compass, LocateFixed } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { PRAYER_LABELS, PRAYER_ORDER, formatPrayerClock, getCurrentPrayerKey, getPrayerWindow } from "@/core/prayer/prayerTimesApi";
import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Screen, Section } from "@/components/ui/Screen";
import { StateMessage } from "@/components/ui/StateMessage";
import { AdhanSettingsCard } from "@/features/prayer/AdhanSettingsCard";
import { requestPreciseLocation, type GeolocateResult } from "@/features/prayer/locationStore";
import { usePrayerDay } from "@/features/prayer/usePrayerDay";

const GEO_MESSAGES: Record<Exclude<GeolocateResult, "ok">, string> = {
  denied: "لم يُسمح بالوصول للموقع. يمكنك تفعيله من إعدادات الجهاز.",
  error: "تعذّر تحديد موقعك الآن.",
};

export default function PrayerScreen() {
  const { location, now, state } = usePrayerDay();
  const [locating, setLocating] = useState(false);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const current = state.status === "ready" ? getCurrentPrayerKey(state.day.times, now) : null;
  const next = state.status === "ready" ? getPrayerWindow(state.day.times, now).next.key : null;

  async function locate() {
    setLocating(true);
    const result = await requestPreciseLocation();
    setLocating(false);
    setGeoMessage(result === "ok" ? null : GEO_MESSAGES[result]);
  }

  return (
    <Screen bleed>
      <PageHeader
        kicker="مواقيت الصلاة"
        icon={Clock}
        title={location.label}
        description="حسب الهيئة المصرية العامة للمساحة."
        actions={
          <Button variant="light" size="sm" icon={LocateFixed} onPress={locate} disabled={locating}>
            {locating ? "جارٍ التحديد…" : "استخدم موقعي"}
          </Button>
        }
      />
      <Section className="mt-5">
        {geoMessage && <Text className="mb-3 font-sans text-sm text-danger">{geoMessage}</Text>}
        {state.status === "ready" ? (
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
        ) : state.status === "error" ? (
          <StateMessage message="تعذّر تحميل المواقيت الآن." />
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
        <AdhanSettingsCard />
      </Section>
    </Screen>
  );
}
