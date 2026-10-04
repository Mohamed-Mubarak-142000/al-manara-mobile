import { router } from "expo-router";
import { ChevronRight, Pause, Play, Radio } from "lucide-react-native";
import { useEffect } from "react";
import { ActivityIndicator, Linking, Pressable, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Divider } from "@/components/ui/Ornament";
import { audio, currentTrack, usePlayer } from "@/features/audio/playerStore";
import { RADIO_STATION, RADIO_TRACK } from "@/features/radio/station";
import { useThemeColor } from "@/theme/useThemeColor";

const BARS = 28;

/** One bar of the equaliser: grows and shrinks while the radio plays, rests flat otherwise. */
function Bar({ index, active }: { index: number; active: boolean }) {
  const scale = useSharedValue(0.25);
  useEffect(() => {
    if (!active) {
      cancelAnimation(scale);
      scale.set(withTiming(0.25, { duration: 300 }));
      return;
    }
    const duration = 500 + ((index * 137) % 600);
    scale.set(
      withDelay(
        (index * 53) % 400,
        withRepeat(withSequence(withTiming(1, { duration }), withTiming(0.25 + ((index * 31) % 40) / 100, { duration })), -1, true),
      ),
    );
  }, [active, index, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: scale.get() }] }));
  return <Animated.View style={style} className="h-16 w-1.5 rounded-full bg-gold" />;
}

/** Live Cairo Quran Radio, with the website's automatic switch to a backup stream. */
export default function RadioScreen() {
  const insets = useSafeAreaInsets();
  const heroFg = useThemeColor("hero-fg");
  const gold = useThemeColor("gold-soft");
  const state = usePlayer();
  const onRadio = currentTrack(state)?.id === RADIO_TRACK.id;
  const playing = onRadio && state.playing;
  const connecting = onRadio && state.buffering && !state.playing;

  function toggle() {
    if (onRadio) audio.toggle();
    else audio.playTrack(RADIO_TRACK);
  }

  return (
    <View className="flex-1 bg-emerald-night" style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="رجوع"
        onPress={() => router.back()}
        hitSlop={12}
        className="mx-3 self-start p-1"
      >
        <ChevronRight size={26} color={heroFg} />
      </Pressable>

      <View className="flex-1 items-center justify-center gap-8 px-6">
        <View className={`flex-row items-center gap-2 rounded-full px-4 py-1.5 ${playing ? "bg-rose/20" : "bg-white/10"}`}>
          {playing ? <View className="size-2 rounded-full bg-rose" /> : <Radio size={14} color={gold} />}
          <Text className="font-sans-bold text-sm text-gold-soft">{playing ? "على الهواء الآن" : "بث مباشر على مدار الساعة"}</Text>
        </View>

        <View className="items-center gap-2">
          <Text className="text-center font-display-black text-4xl leading-[56px] text-hero-fg">إذاعة القرآن الكريم</Text>
          <Text className="text-center font-sans text-base text-white/70">{RADIO_STATION.name}</Text>
        </View>

        <View className="h-20 flex-row items-center gap-1">
          {Array.from({ length: BARS }, (_, index) => (
            <Bar key={index} index={index} active={playing} />
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={playing ? "إيقاف الإذاعة" : "تشغيل الإذاعة"}
          onPress={toggle}
          className="size-24 items-center justify-center rounded-full bg-gold shadow-gold"
        >
          {connecting ? (
            <ActivityIndicator color="#012a22" size="large" />
          ) : playing ? (
            <Pause size={40} color="#012a22" fill="#012a22" />
          ) : (
            <Play size={40} color="#012a22" fill="#012a22" />
          )}
        </Pressable>

        <View className="min-h-12 items-center px-4">
          {onRadio && state.error ? (
            <Text className="text-center font-sans text-sm text-white/80">البث متوقف من المصدر الآن، وسنعيد المحاولة تلقائيًا.</Text>
          ) : onRadio && state.streamIndex > 0 ? (
            <Text className="text-center font-sans text-sm text-white/80">البث الرسمي متوقف مؤقتًا، ونشغّل لك من مصدر بديل حتى يعود.</Text>
          ) : (
            <Text className="text-center font-sans text-sm text-white/60">يستمر البث وأنت تتنقّل في التطبيق أو تغلق الشاشة.</Text>
          )}
        </View>
      </View>

      <View className="items-center gap-3 px-8">
        <View className="w-1/2">
          <Divider tone="light" />
        </View>
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(RADIO_STATION.providerUrl)}>
          <Text className="font-sans text-xs text-white/60">مصدر البث: {RADIO_STATION.providerName}</Text>
        </Pressable>
      </View>
    </View>
  );
}
