import { router } from "expo-router";
import { Pause, Play, SkipBack, X } from "lucide-react-native";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";

import { useThemeColor } from "@/theme/useThemeColor";

import { audio, currentTrack, usePlayer } from "./playerStore";

/** The bar that sits on top of the tab bar while something is loaded; tapping it opens the full player. */
export function MiniPlayer() {
  const state = usePlayer();
  const track = currentTrack(state);
  const heroFg = useThemeColor("hero-fg");
  const gold = useThemeColor("gold");
  if (!track) return null;

  const progress = state.duration > 0 ? Math.min(1, state.currentTime / state.duration) : 0;

  return (
    <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOutDown.duration(200)} className="px-3 pb-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`مشغّل: ${track.title}`}
        onPress={() => router.push("/player")}
        className="overflow-hidden rounded-2xl bg-hero shadow-lift"
      >
        <View className="flex-row items-center gap-3 px-3 py-2.5">
          <View className="flex-1">
            <Text numberOfLines={1} className="font-display-bold text-sm text-hero-fg">
              {track.title}
            </Text>
            <Text numberOfLines={1} className="font-sans text-xs text-white/65">
              {track.artist}
            </Text>
          </View>
          {!track.live && (
            <Pressable accessibilityRole="button" accessibilityLabel="السابق" hitSlop={8} onPress={audio.previous} className="p-1.5">
              <SkipBack size={20} color={heroFg} />
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={state.playing ? "إيقاف مؤقت" : "تشغيل"}
            hitSlop={8}
            onPress={audio.toggle}
            className="size-10 items-center justify-center rounded-full bg-gold"
          >
            {state.buffering && !state.playing ? (
              <ActivityIndicator color="#012a22" size="small" />
            ) : state.playing ? (
              <Pause size={20} color="#012a22" fill="#012a22" />
            ) : (
              <Play size={20} color="#012a22" fill="#012a22" />
            )}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="إغلاق المشغّل" hitSlop={8} onPress={audio.stop} className="p-1.5">
            <X size={18} color={heroFg} />
          </Pressable>
        </View>
        <View className="h-0.5 bg-white/10">
          <View style={{ width: `${progress * 100}%`, backgroundColor: gold }} className="h-full" />
        </View>
      </Pressable>
    </Animated.View>
  );
}
