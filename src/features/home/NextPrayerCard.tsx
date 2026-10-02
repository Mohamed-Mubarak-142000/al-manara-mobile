import { MapPin } from "lucide-react-native";
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { formatPrayerClock, getPrayerWindow } from "@/core/prayer/prayerTimesApi";
import { pad2, toArabicDigits } from "@/core/text/arabic";
import { usePrayerDay } from "@/features/prayer/usePrayerDay";
import { useThemeColor } from "@/theme/useThemeColor";

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function countdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return toArabicDigits(`${pad2(Math.floor(total / 3600))}:${pad2(Math.floor((total % 3600) / 60))}:${pad2(total % 60)}`);
}

/** The website's hero next-prayer card: a gold ring filling up towards the next prayer, with a live countdown. */
export function NextPrayerCard() {
  const { location, now, state } = usePrayerDay();
  const gold = useThemeColor("gold");
  const goldSoft = useThemeColor("gold-soft");
  const span = state.status === "ready" ? getPrayerWindow(state.day.times, now) : null;
  const progress = span
    ? Math.min(1, Math.max(0, (now.getTime() - span.previous.at.getTime()) / (span.next.at.getTime() - span.previous.at.getTime())))
    : 0;

  return (
    <View className="rounded-[32px] border border-white/15 bg-white/10 p-5">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <MapPin size={14} color={goldSoft} />
          <Text className="font-sans-bold text-xs text-gold-soft">{location.label}</Text>
        </View>
        <Text className="font-display-bold text-xl text-white" style={{ fontVariant: ["tabular-nums"] }}>
          {toArabicDigits(`${pad2(now.getHours() % 12 || 12)}:${pad2(now.getMinutes())}`)}
        </Text>
      </View>

      <View className="mt-4 flex-row items-center gap-4 rounded-3xl bg-emerald-night/60 p-4">
        <View className="size-24">
          <Svg viewBox="0 0 100 100" width="100%" height="100%" style={{ transform: [{ rotate: "-90deg" }] }}>
            <Circle cx="50" cy="50" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={7} />
            <Circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke={gold}
              strokeWidth={7}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
            />
          </Svg>
          <View className="absolute inset-0 items-center justify-center">
            <Text className="font-display-bold text-lg text-white">{span ? span.next.label : "…"}</Text>
          </View>
        </View>
        <View className="flex-1">
          <Text className="font-sans-bold text-xs text-white/60">الصلاة القادمة</Text>
          {state.status === "ready" && span ? (
            <>
              <Text className="mt-0.5 font-display-bold text-2xl text-white">
                {span.next.label}{" "}
                <Text className="text-base text-gold-soft">{toArabicDigits(formatPrayerClock(state.day.times[span.next.key]))}</Text>
              </Text>
              <Text className="mt-1 font-sans text-sm text-white/75">بعد {countdown(span.next.at.getTime() - now.getTime())}</Text>
            </>
          ) : (
            <Text className="mt-1 font-sans text-sm text-white/70">
              {state.status === "error" ? "تعذّر تحميل المواقيت الآن." : "جارٍ حساب المواقيت…"}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
