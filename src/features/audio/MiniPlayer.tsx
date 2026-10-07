import { router, useSegments } from "expo-router";
import { Pause, Play, RotateCcw, SkipBack, X } from "lucide-react-native";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TrackDownloadButton } from "@/features/downloads/TrackDownloadButton";
import { useThemeColor } from "@/theme/useThemeColor";

import { miniPlayerLayout, miniPlayerPlacement, useMiniPlayerLayout, type MiniPlayerPlacement } from "./miniPlayerLayout";
import { audio, currentTrack, useHasTrack, usePlayer, type PlayerState } from "./playerStore";

const NIGHT = "#012a22";
/** The stock bottom tab bar before it has been measured. */
const TAB_BAR_FALLBACK = 49;

function usePlacement(): MiniPlayerPlacement {
  return miniPlayerPlacement(useSegments());
}

/** The play button's face: a spinner while loading, retry after a failure. */
function PlayIcon({ state, size }: { state: PlayerState; size: number }) {
  if (state.error) return <RotateCcw size={size - 2} color={NIGHT} />;
  if (state.buffering && !state.playing) return <ActivityIndicator color={NIGHT} size="small" />;
  return state.playing ? <Pause size={size} color={NIGHT} fill={NIGHT} /> : <Play size={size} color={NIGHT} fill={NIGHT} />;
}

function playLabel(state: PlayerState): string {
  return state.error ? "إعادة المحاولة" : state.playing ? "إيقاف مؤقت" : "تشغيل";
}

/** The bar shown while something is loaded; tapping it opens the full player. */
function MiniPlayerBar({ state }: { state: PlayerState }) {
  const track = currentTrack(state);
  const heroFg = useThemeColor("hero-fg");
  const gold = useThemeColor("gold");
  if (!track) return null;

  const progress = state.duration > 0 ? Math.min(1, state.currentTime / state.duration) : 0;

  return (
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
          {state.error ? (
            <Text numberOfLines={1} accessibilityRole="alert" className="font-sans-bold text-xs text-gold-soft">
              تعذّر التشغيل — اضغط لإعادة المحاولة
            </Text>
          ) : (
            <Text numberOfLines={1} className="font-sans text-xs text-white/65">
              {track.artist}
            </Text>
          )}
        </View>
        <TrackDownloadButton track={track} tone="light" />
        {!track.live && (
          <Pressable accessibilityRole="button" accessibilityLabel="السابق" hitSlop={8} onPress={audio.previous} className="p-1.5">
            <SkipBack size={20} color={heroFg} />
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={playLabel(state)}
          hitSlop={8}
          onPress={audio.toggle}
          className="size-10 items-center justify-center rounded-full bg-gold"
        >
          <PlayIcon state={state} size={20} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="إغلاق المشغّل" hitSlop={8} onPress={audio.stop} className="p-1.5">
          <X size={18} color={heroFg} />
        </Pressable>
      </View>
      <View className="h-0.5 bg-white/10">
        <View style={{ width: `${progress * 100}%`, backgroundColor: gold }} className="h-full" />
      </View>
    </Pressable>
  );
}

/**
 * The app-wide mini player, mounted once in the root layout after the <Stack>. It rides just above
 * the tab bar on tab screens, at the bottom inset on stack screens, and steps aside where it would be
 * in the way or the screen has its own controls (see miniPlayerPlacement).
 */
export function GlobalMiniPlayer() {
  const state = usePlayer();
  const placement = usePlacement();
  const insets = useSafeAreaInsets();
  const { tabBarHeight } = useMiniPlayerLayout();
  const track = currentTrack(state);
  if (!track || placement === "hidden") return null;

  const bottom = placement === "tabs" ? tabBarHeight || TAB_BAR_FALLBACK + insets.bottom : insets.bottom;
  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      exiting={FadeOutDown.duration(200)}
      onLayout={(event) => miniPlayerLayout.setPlayerHeight(event.nativeEvent.layout.height)}
      className="absolute inset-x-0 px-3 pb-2"
      style={{ bottom }}
    >
      <MiniPlayerBar state={state} />
    </Animated.View>
  );
}

/**
 * How much a stack screen's scroll content should pad at the bottom so the mini player never covers
 * its last rows (0 while nothing is loaded). Add it on top of the safe-area inset.
 */
export function useMiniPlayerInset(): number {
  const hasTrack = useHasTrack();
  const placement = usePlacement();
  const { playerHeight } = useMiniPlayerLayout();
  if (!hasTrack || placement !== "bottom") return 0;
  return playerHeight || 72;
}

/**
 * Room above the tab bar for the mini player, drawn inside the tab bar so tab screens shrink to
 * make space for it instead of hiding their last rows under it.
 */
export function MiniPlayerSpacer() {
  const hasTrack = useHasTrack();
  const placement = usePlacement();
  const { playerHeight } = useMiniPlayerLayout();
  if (!hasTrack || placement !== "tabs") return null;
  return <View style={{ height: playerHeight || 72 }} />;
}
