import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { BellOff, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { background } from "../../modules/almanara-background";
import { DUAS } from "@/core/adhkar/duasData";
import { isFreshAdhan, parseAdhanScreen } from "@/core/prayer/adhanScreen";
import { PRAYER_LABELS, formatPrayerClock } from "@/core/prayer/prayerTimesApi";
import { TASBIH_THEMES } from "@/core/tasbih/tasbihData";
import { toArabicDigits } from "@/core/text/arabic";
import { useAdhanVoice } from "@/features/prayer/adhanSound";
import { useAdhanSettings } from "@/features/prayer/adhanSettings";
import { useScaledText } from "@/theme/textScale";

/*
 * The adhan at prayer time, full screen: opened by the prayer notice (on Android also as a full-screen
 * intent over the lock screen, like an alarm). «إيقاف الأذان» stops the playing adhan and takes the
 * notice away; «إغلاق» leaves. Painted in the tasbih theme chosen in the adhan settings, so its colours
 * come from TASBIH_THEMES rather than the app tokens.
 */

/** Hisn al-Muslim's chapter on the adhan: what to say with the muezzin, and after it. */
const ADHAN_DUAS = ["hisn-22-general", "hisn-23-general", "hisn-24-general", "hisn-25-general", "hisn-26-general"]
  .map((id) => DUAS.find((dua) => dua.id === id))
  .filter((dua) => dua !== undefined);

/** Takes away the adhan's notice(s), which on iOS also silences the notification's own sound. */
async function dismissAdhanNotices() {
  await background?.dismissPrayerNotice?.();
  const presented = await Notifications.getPresentedNotificationsAsync().catch(() => []);
  await Promise.all(
    presented
      .filter((notification) => notification.request.content.data?.kind === "adhan")
      .map((notification) => Notifications.dismissNotificationAsync(notification.request.identifier).catch(() => {})),
  );
}

function clock(at: number): string {
  const date = new Date(at);
  return toArabicDigits(formatPrayerClock(`${date.getHours()}:${date.getMinutes()}`));
}

/** A slow breathing ring behind the stop button while the adhan plays. */
function Pulse({ color, active }: { color: string; active: boolean }) {
  const reduce = useReducedMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.set(active && !reduce ? withRepeat(withTiming(1.18, { duration: 1400 }), -1, true) : withTiming(1));
  }, [active, reduce, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }], opacity: active ? 0.35 : 0 }));
  return <Animated.View pointerEvents="none" className="absolute size-44 rounded-full" style={[{ backgroundColor: color }, style]} />;
}

export default function AdhanNowScreen() {
  const params = useLocalSearchParams<{ prayer?: string; at?: string; iftar?: string }>();
  const moment = useMemo(() => parseAdhanScreen(params), [params]);
  const insets = useSafeAreaInsets();
  const settings = useAdhanSettings();
  const voice = useAdhanVoice();
  const theme = TASBIH_THEMES.find((entry) => entry.id === settings.screenTheme) ?? TASBIH_THEMES[0]!;
  const duaText = useScaledText(19, 38);
  const [now] = useState(() => Date.now());
  const fresh = moment ? isFreshAdhan(moment, now) : false;
  // Android knows whether its adhan is still playing; iOS plays the notification's own sound, so a
  // fresh screen assumes it may be until stopped.
  const [playing, setPlaying] = useState(() => background?.isAdhanPlaying?.() ?? (Platform.OS === "ios" && fresh));
  const [stopped, setStopped] = useState(false);

  // Over the lock screen while this screen is up (the native side already did on a full-screen launch).
  useEffect(() => {
    void background?.setShowOverLock?.(true).catch(() => {});
    return () => {
      void background?.setShowOverLock?.(false).catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!background?.isAdhanPlaying) return;
    const id = setInterval(() => setPlaying(background?.isAdhanPlaying?.() ?? false), 1000);
    return () => clearInterval(id);
  }, []);

  async function stop() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setStopped(true);
    setPlaying(false);
    await background?.stopAdhan().catch(() => {});
    await dismissAdhanNotices();
  }

  function close() {
    void dismissAdhanNotices();
    if (router.canGoBack()) router.back();
    else router.replace("/prayer");
  }

  const name = moment ? PRAYER_LABELS[moment.prayer] : null;
  const title = !moment
    ? "حان وقت الصلاة"
    : moment.iftar
      ? "حان الآن وقت الإفطار وصلاة المغرب"
      : fresh
        ? `حان الآن وقت صلاة ${name}`
        : `صلاة ${name}`;

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background[2] }}>
      <StatusBar style={theme.id === "marble" ? "dark" : "light"} />
      <LinearGradient colors={theme.background} locations={[0, 0.55, 1]} style={{ position: "absolute", inset: 0 }} />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24, paddingHorizontal: 20 }}
      >
        <View className="flex-row justify-end">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="إغلاق"
            onPress={close}
            hitSlop={12}
            className="size-11 items-center justify-center rounded-full border"
            style={{ borderColor: theme.track, backgroundColor: theme.face }}
          >
            <X size={20} color={theme.ink} />
          </Pressable>
        </View>

        <View className="mt-4 items-center">
          <Text className="font-sans text-sm" style={{ color: theme.soft }}>
            {moment ? clock(moment.at) : ""}
          </Text>
          <Text accessibilityRole="header" className="mt-2 text-center font-sans-bold text-3xl leading-[52px]" style={{ color: theme.ink }}>
            {title}
          </Text>
          <Text className="mt-1 text-center font-sans text-sm" style={{ color: theme.soft }}>
            {playing ? `يرفع الأذان: ${voice?.artist ?? "الأذان الافتراضي"}` : stopped ? "أُوقف الأذان" : fresh ? "تقبّل الله صلاتك" : ""}
          </Text>
        </View>

        <View className="my-10 items-center justify-center">
          <Pulse color={theme.accent} active={playing} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={playing ? "إيقاف الأذان" : "إغلاق"}
            onPress={playing ? stop : close}
            className="size-40 items-center justify-center gap-2 rounded-full border-4"
            style={({ pressed }) => ({
              backgroundColor: theme.face,
              borderColor: theme.accent,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            })}
          >
            {playing ? <BellOff size={40} color={theme.accent} /> : <X size={40} color={theme.accent} />}
            <Text className="font-sans-bold text-lg" style={{ color: theme.ink }}>
              {playing ? "إيقاف الأذان" : "إغلاق"}
            </Text>
          </Pressable>
        </View>

        <View className="gap-3 rounded-3xl p-5" style={{ backgroundColor: `${theme.face}cc` }}>
          <Text className="font-sans-bold text-sm" style={{ color: theme.accent }}>
            أذكار الأذان — من حصن المسلم
          </Text>
          {ADHAN_DUAS.map((dua) => (
            // Amiri Quran, as on the adhkar cards: the Hafs face draws the Arabic comma as a dotted circle.
            <Text key={dua.id} className="font-quran-fallback" style={[duaText, { color: theme.ink }]}>
              {dua.text}
            </Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
