import { Image } from "expo-image";
import { router } from "expo-router";
import { ListMusic, Pause, Play } from "lucide-react-native";
import { useEffect } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from "react-native";
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

import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Ornament";
import { ScreenHeader, enterSoft } from "@/components/ui/PageHeader";
import { audio, currentTrack, usePlayer } from "@/features/audio/playerStore";
import { SECTION_ART } from "@/features/home/sectionArt";
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
  const onPrimary = useThemeColor("on-primary");
  const state = usePlayer();
  const onRadio = currentTrack(state)?.id === RADIO_TRACK.id;
  const playing = onRadio && state.playing;
  const connecting = onRadio && state.buffering && !state.playing;

  function toggle() {
    if (onRadio) audio.toggle();
    else audio.playTrack(RADIO_TRACK);
  }

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="الإذاعة" subtitle="بث مباشر" art={SECTION_ART.radio} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}>
        <Animated.View
          entering={enterSoft(0)}
          className="mt-2 items-center gap-7 rounded-3xl border border-border bg-surface px-5 py-8 shadow-card"
        >
          <View className="items-center gap-4">
            <Image source={SECTION_ART.radio} style={{ width: 112, height: 112 }} contentFit="contain" accessible={false} />
            <View
              className={`flex-row items-center gap-2 rounded-full border px-4 py-1.5 ${playing ? "border-rose/40 bg-rose/10" : "border-border bg-accent-soft"}`}
            >
              {playing ? <View className="size-2 rounded-full bg-rose" /> : null}
              <Text className={`font-sans-bold text-sm ${playing ? "text-rose" : "text-accent-strong"}`}>
                {playing ? "على الهواء الآن" : "بث مباشر على مدار الساعة"}
              </Text>
            </View>
          </View>

          <View className="items-center gap-1.5">
            <Text className="text-center font-sans-bold text-3xl leading-12 text-fg">إذاعة القرآن الكريم</Text>
            <Text className="text-center font-sans text-base text-fg-muted">{RADIO_STATION.name}</Text>
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
            className="size-24 items-center justify-center rounded-full bg-primary"
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
          >
            {connecting ? (
              <ActivityIndicator color={onPrimary} size="large" />
            ) : playing ? (
              <Pause size={40} color={onPrimary} fill={onPrimary} />
            ) : (
              <Play size={40} color={onPrimary} fill={onPrimary} />
            )}
          </Pressable>

          <View className="min-h-12 items-center px-2">
            {onRadio && state.error ? (
              <Text className="text-center font-sans text-sm leading-6 text-fg-muted">
                البث متوقف من المصدر الآن، وسنعيد المحاولة تلقائيًا.
              </Text>
            ) : onRadio && state.streamIndex > 0 ? (
              <Text className="text-center font-sans text-sm leading-6 text-fg-muted">
                البث الرسمي متوقف مؤقتًا، ونشغّل لك من مصدر بديل حتى يعود.
              </Text>
            ) : (
              <Text className="text-center font-sans text-sm leading-6 text-fg-muted">
                يستمر البث وأنت تتنقّل في التطبيق أو تغلق الشاشة.
              </Text>
            )}
          </View>
        </Animated.View>

        <Animated.View entering={enterSoft(1)} className="mt-4">
          <Button
            variant="secondary"
            size="lg"
            icon={ListMusic}
            accessibilityRole="link"
            onPress={() => router.push({ pathname: "/sounds/[category]", params: { category: "recordings" } })}
          >
            استمع إلى تسجيلات الإذاعة
          </Button>
        </Animated.View>

        <View className="flex-1" />
        <View className="mt-8 items-center gap-3 px-8">
          <View className="w-1/2">
            <Divider />
          </View>
          <Pressable accessibilityRole="link" onPress={() => Linking.openURL(RADIO_STATION.providerUrl)}>
            <Text className="font-sans text-xs text-fg-muted">مصدر البث: {RADIO_STATION.providerName}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
