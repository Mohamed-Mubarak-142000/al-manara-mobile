import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { router } from "expo-router";
import { ChevronRight, Compass, MapPin } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";

import { distanceToKaaba, qiblaBearing } from "@/core/prayer/qibla";
import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { requestPreciseLocation } from "@/features/prayer/locationStore";
import { usePrayerDay } from "@/features/prayer/usePrayerDay";
import { useThemeColor } from "@/theme/useThemeColor";

const SIZE = 280;
/** Within this many degrees the phone counts as facing the qibla. */
const ALIGNED = 4;

/** Shortest signed angle from a to b, in degrees (-180…180). */
function delta(a: number, b: number): number {
  return ((b - a + 540) % 360) - 180;
}

export default function QiblaScreen() {
  const insets = useSafeAreaInsets();
  const fg = useThemeColor("fg");
  const gold = useThemeColor("gold");
  const primary = useThemeColor("primary");
  const border = useThemeColor("border");
  const muted = useThemeColor("fg-muted");
  const { location, state } = usePrayerDay();
  const [heading, setHeading] = useState<number | null>(null);
  const [denied, setDenied] = useState(false);
  const rotation = useSharedValue(0);
  const wasAligned = useRef(false);

  // Precise coordinates when the user shared them, else the city centre the prayer-times API resolved.
  const coords =
    location.latitude !== undefined && location.longitude !== undefined
      ? { latitude: location.latitude, longitude: location.longitude }
      : state.status === "ready"
        ? { latitude: state.day.latitude, longitude: state.day.longitude }
        : null;
  const bearing = coords ? qiblaBearing(coords.latitude, coords.longitude) : null;
  const offset = bearing !== null && heading !== null ? delta(heading, bearing) : null;
  const aligned = offset !== null && Math.abs(offset) <= ALIGNED;

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (!cancelled) setDenied(true);
        return;
      }
      subscription = await Location.watchHeadingAsync((value) => {
        const next = value.trueHeading >= 0 ? value.trueHeading : value.magHeading;
        setHeading(next);
        // The dial turns the shortest way round instead of spinning through 360 → 0.
        rotation.set(withTiming(rotation.get() + delta(rotation.get() % 360, -next), { duration: 180 }));
      });
      if (cancelled) subscription.remove();
    })();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [rotation]);

  useEffect(() => {
    if (aligned && !wasAligned.current) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    wasAligned.current = aligned;
  }, [aligned]);

  const dial = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.get()}deg` }] }));
  const ticks = Array.from({ length: 72 }, (_, index) => index * 5);
  const center = SIZE / 2;

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}>
      <View className="flex-row items-center gap-2 px-3">
        <Pressable accessibilityRole="button" accessibilityLabel="رجوع" onPress={() => router.back()} hitSlop={12} className="p-1">
          <ChevronRight size={26} color={fg} />
        </Pressable>
        <Text className="font-display-bold text-xl text-fg">اتجاه القبلة</Text>
      </View>

      <View className="flex-1 items-center justify-center gap-6 px-6">
        <View className="flex-row items-center gap-1.5">
          <MapPin size={14} color={muted} />
          <Text className="font-sans text-sm text-fg-muted">{location.label}</Text>
        </View>

        <View style={{ width: SIZE, height: SIZE }}>
          <Animated.View style={[{ width: SIZE, height: SIZE }, dial]}>
            <Svg width={SIZE} height={SIZE}>
              <Circle cx={center} cy={center} r={center - 4} fill="none" stroke={border} strokeWidth={2} />
              {ticks.map((angle) => {
                const major = angle % 90 === 0;
                const r1 = center - 6;
                const r2 = center - (major ? 22 : angle % 30 === 0 ? 16 : 11);
                const a = ((angle - 90) * Math.PI) / 180;
                return (
                  <Line
                    key={angle}
                    x1={center + r1 * Math.cos(a)}
                    y1={center + r1 * Math.sin(a)}
                    x2={center + r2 * Math.cos(a)}
                    y2={center + r2 * Math.sin(a)}
                    stroke={major ? fg : muted}
                    strokeWidth={major ? 2.5 : 1}
                  />
                );
              })}
              {(
                [
                  ["ش", 0],
                  ["ق", 90],
                  ["ج", 180],
                  ["غ", 270],
                ] as const
              ).map(([label, angle]) => {
                const a = ((angle - 90) * Math.PI) / 180;
                return (
                  <SvgText
                    key={label}
                    x={center + (center - 40) * Math.cos(a)}
                    y={center + (center - 40) * Math.sin(a) + 6}
                    fill={angle === 0 ? gold : fg}
                    fontSize={18}
                    fontFamily="Cairo_700Bold"
                    textAnchor="middle"
                  >
                    {label}
                  </SvgText>
                );
              })}
              {bearing !== null && (
                // The qibla needle, fixed on the dial at the bearing; the dial turns with the phone.
                <Path
                  d={`M ${center} ${center} L ${center + (center - 52) * Math.cos(((bearing - 90) * Math.PI) / 180)} ${center + (center - 52) * Math.sin(((bearing - 90) * Math.PI) / 180)}`}
                  stroke={aligned ? primary : gold}
                  strokeWidth={6}
                  strokeLinecap="round"
                />
              )}
              <Circle cx={center} cy={center} r={9} fill={aligned ? primary : gold} />
            </Svg>
          </Animated.View>
          {/* The phone's own direction: a fixed marker at the top. */}
          <View className="absolute -top-3 self-center">
            <View
              className="size-0 border-x-[10px] border-b-[16px] border-x-transparent"
              style={{ borderBottomColor: aligned ? primary : fg }}
            />
          </View>
        </View>

        {denied ? (
          <View className="items-center gap-3">
            <Text className="text-center font-sans text-sm text-fg-muted">
              نحتاج الإذن بالموقع لتشغيل البوصلة وتحديد اتجاه القبلة بدقة.
            </Text>
            <Button icon={Compass} onPress={() => requestPreciseLocation()}>
              السماح بالموقع
            </Button>
          </View>
        ) : bearing === null ? (
          <Text className="font-sans text-sm text-fg-muted">جارٍ تحديد موقعك…</Text>
        ) : (
          <View className="items-center gap-1">
            <Text className={`font-display-bold text-2xl ${aligned ? "text-primary" : "text-fg"}`}>
              {aligned
                ? "أنت تتجه إلى القبلة"
                : offset !== null
                  ? `استدر ${offset > 0 ? "يمينًا" : "يسارًا"} ${toArabicDigits(Math.round(Math.abs(offset)))}°`
                  : "…"}
            </Text>
            <Text className="font-sans text-sm text-fg-muted">
              القبلة على {toArabicDigits(Math.round(bearing))}° من الشمال
              {coords
                ? ` · ${toArabicDigits(Math.round(distanceToKaaba(coords.latitude, coords.longitude)).toLocaleString("en"))} كم إلى مكة`
                : ""}
            </Text>
          </View>
        )}
        <Text className="text-center font-sans text-xs leading-5 text-fg-muted">
          أمسك الهاتف مستويًا وبعيدًا عن المعادن والمغناطيس. لدقة أكبر حرّك الهاتف على شكل رقم ٨ لمعايرة البوصلة.
        </Text>
      </View>
    </View>
  );
}
