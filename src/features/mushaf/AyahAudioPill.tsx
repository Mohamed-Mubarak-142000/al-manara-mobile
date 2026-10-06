import { Pause, Play, X } from "lucide-react-native";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";

import { audio, currentTrack, usePlayer } from "@/features/audio/playerStore";
import { TrackDownloadButton } from "@/features/downloads/TrackDownloadButton";

import { READER_THEMES, type ReaderTheme } from "./readerPrefs";

/** Height of the pill itself; the screen keeps `bottom` + this clear at the foot of the page. */
export const AYAH_PILL_HEIGHT = 44;

/**
 * Pause, resume or stop whatever is playing without leaving the page: the ayah sheet closes when it starts
 * the audio, and the global mini player is hidden on the mushaf. Covers full-surah recitations too.
 */
export function AyahAudioPill({ theme, bottom }: { theme: ReaderTheme; bottom: number }) {
  const state = usePlayer();
  const track = currentTrack(state);
  const colors = READER_THEMES[theme];
  if (!track) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutDown.duration(180)}
      className="absolute inset-x-0 items-center"
      style={{ bottom }}
      pointerEvents="box-none"
    >
      <View
        className="max-w-[80%] flex-row items-center gap-2 rounded-full border ps-1.5 pe-3 shadow-lift"
        style={{ height: AYAH_PILL_HEIGHT, backgroundColor: colors.frame, borderColor: colors.accent }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={state.playing ? "إيقاف التلاوة مؤقتًا" : "متابعة التلاوة"}
          onPress={audio.toggle}
          hitSlop={6}
          className="size-8 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.accent }}
        >
          {state.buffering && !state.playing ? (
            <ActivityIndicator size="small" color={colors.page} />
          ) : state.playing ? (
            <Pause size={16} color={colors.page} fill={colors.page} />
          ) : (
            <Play size={16} color={colors.page} fill={colors.page} />
          )}
        </Pressable>
        <Text numberOfLines={1} className="shrink font-sans-bold text-xs" style={{ color: colors.ink }}>
          {track.title}
        </Text>
        {/* A full surah saves as one file, ayah-by-ayah audio as its surah's pack. */}
        <TrackDownloadButton track={track} tint={colors.ink} />
        <Pressable accessibilityRole="button" accessibilityLabel="إيقاف التلاوة" onPress={audio.stop} hitSlop={10} className="p-1">
          <X size={16} color={colors.ink} />
        </Pressable>
      </View>
    </Animated.View>
  );
}
