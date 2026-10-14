import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  ChevronDown,
  Gauge,
  Moon,
  Pause,
  Play,
  Repeat,
  Repeat1,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  type LucideIcon,
} from "lucide-react-native";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatDuration, toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { IconButton, enterSoft } from "@/components/ui/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { audio, currentTrack, nextRate, usePlayer } from "@/features/audio/playerStore";
import { TrackDownloadButton, isTrackDownloadable } from "@/features/downloads/TrackDownloadButton";
import { useNow } from "@/features/time/useNow";
import { useThemeColor } from "@/theme/useThemeColor";

const LOGO = require("@/assets/images/brand/logo.png");
const SLEEP_CHOICES: (number | null)[] = [null, 15, 30, 60];
const NIGHT = "#012a22";

function Chip({ label, active, onPress, icon: Icon }: { label: string; active?: boolean; onPress: () => void; icon?: LucideIcon }) {
  const primary = useThemeColor("primary");
  const onPrimary = useThemeColor("on-primary");
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 ${active ? "border-primary bg-primary" : "border-border bg-surface"}`}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
    >
      {Icon && <Icon size={14} color={active ? onPrimary : primary} />}
      <Text className={`font-sans-semibold text-xs ${active ? "text-on-primary" : "text-fg"}`}>{label}</Text>
    </Pressable>
  );
}

/** A round transport control; dimmed when disabled. */
function Control({
  icon: Icon,
  label,
  size,
  disabled,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  size: number;
  disabled?: boolean;
  onPress: () => void;
}) {
  const fg = useThemeColor("fg");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      className="size-12 items-center justify-center rounded-full"
      style={({ pressed }) => ({ opacity: disabled ? 0.3 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] })}
    >
      <Icon size={size} color={fg} strokeWidth={1.8} />
    </Pressable>
  );
}

/** The full-screen player, presented as a modal over whatever the user was doing. */
export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const state = usePlayer();
  const now = useNow(1000);
  const track = currentTrack(state);
  const onPrimary = useThemeColor("on-primary");

  if (!track) {
    return (
      <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 10 }}>
        <View className="flex-row px-4">
          <IconButton icon={ChevronDown} label="إغلاق" onPress={() => router.back()} />
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="font-sans text-base text-fg-muted">لا يوجد ما يُشغَّل الآن.</Text>
        </View>
      </View>
    );
  }

  const sleepLeft = state.sleepAt ? Math.max(0, Math.ceil((state.sleepAt - now.getTime()) / 60000)) : null;
  const RepeatIcon = state.repeat === "one" ? Repeat1 : Repeat;

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 20 }}>
      <View className="flex-row items-center gap-3 px-4 pb-3">
        <IconButton icon={ChevronDown} label="إغلاق" onPress={() => router.back()} />
        <Text className="flex-1 text-center font-sans-bold text-base text-fg">
          {state.queue.length > 1 ? `${toArabicDigits(state.index + 1)} من ${toArabicDigits(state.queue.length)}` : "يُشغَّل الآن"}
        </Text>
        {isTrackDownloadable(track) ? (
          <View className="h-12 min-w-12 items-center justify-center rounded-2xl border border-border bg-surface px-1">
            <TrackDownloadButton track={track} />
          </View>
        ) : (
          <View className="size-12" />
        )}
      </View>

      {/* The artwork keeps its night scene, as a rounded card inside the page. */}
      <Animated.View entering={enterSoft(0)} className="mx-4 flex-1 overflow-hidden rounded-4xl" style={{ backgroundColor: NIGHT }}>
        <Image
          source={require("@/assets/images/scenes/quran-terrace.webp")}
          contentFit="cover"
          style={{ position: "absolute", inset: 0, opacity: 0.35 }}
        />
        <LinearGradient colors={["rgba(1,42,34,0.4)", NIGHT]} locations={[0, 0.85]} style={{ position: "absolute", inset: 0 }} />
        <View className="flex-1 items-center justify-center p-6">
          <View className="aspect-square w-full max-w-64 items-center justify-center rounded-[48px] border border-gold/30 bg-white/5">
            <View className="absolute size-[80%] rotate-45 rounded-[40px] border border-gold/20" />
            {track.artworkUrl ? (
              <Image
                source={{ uri: track.artworkUrl }}
                placeholder={LOGO}
                placeholderContentFit="contain"
                contentFit="cover"
                transition={200}
                accessibilityIgnoresInvertColors
                style={{ width: "90%", height: "90%", borderRadius: 40 }}
              />
            ) : (
              <Image source={LOGO} contentFit="contain" style={{ width: 120, height: 120 }} />
            )}
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={enterSoft(1)} className="px-6 pt-6">
        <Text numberOfLines={2} className="text-center font-sans-bold text-2xl leading-10 text-fg">
          {track.title}
        </Text>
        <Text numberOfLines={1} className="mt-1 text-center font-sans text-base text-fg-muted">
          {track.artist}
        </Text>
        {state.error && (
          <View
            accessibilityRole="alert"
            className="mt-4 flex-row items-center gap-3 rounded-2xl border border-border bg-accent-soft px-4 py-3"
          >
            <Text className="flex-1 font-sans-bold text-sm text-accent-strong">تعذّر التشغيل الآن. نزّل التلاوة لتسمعها في أي وقت.</Text>
            <Button size="sm" onPress={audio.resume}>
              إعادة المحاولة
            </Button>
          </View>
        )}
      </Animated.View>

      <Animated.View entering={enterSoft(2)} className="px-6 pt-5">
        {track.live ? (
          <View className="flex-row items-center justify-center gap-2">
            <View className="size-2 rounded-full bg-danger" />
            <Text className="font-sans-bold text-sm text-fg">بث مباشر</Text>
          </View>
        ) : (
          <>
            <ProgressBar
              value={state.duration ? state.currentTime / state.duration : 0}
              onSeek={(fraction) => audio.seekTo(fraction * state.duration)}
            />
            <View className="mt-1 flex-row justify-between">
              <Text className="font-sans text-xs text-fg-muted">{formatDuration(state.currentTime)}</Text>
              <Text className="font-sans text-xs text-fg-muted">{formatDuration(state.duration)}</Text>
            </View>
          </>
        )}

        <View className="mt-4 flex-row items-center justify-between">
          <Control icon={RotateCw} label="تقديم ١٥ ثانية" size={24} disabled={track.live} onPress={() => audio.skip(15)} />
          <Control icon={SkipForward} label="التالي" size={28} disabled={state.index + 1 >= state.queue.length} onPress={audio.next} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={state.error ? "إعادة المحاولة" : state.playing ? "إيقاف مؤقت" : "تشغيل"}
            onPress={audio.toggle}
            className="size-20 items-center justify-center rounded-full bg-primary shadow-card"
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }] })}
          >
            {state.error ? (
              <RotateCcw size={32} color={onPrimary} />
            ) : state.buffering && !state.playing ? (
              <ActivityIndicator color={onPrimary} />
            ) : state.playing ? (
              <Pause size={34} color={onPrimary} fill={onPrimary} />
            ) : (
              <Play size={34} color={onPrimary} fill={onPrimary} />
            )}
          </Pressable>
          <Control icon={SkipBack} label="السابق" size={28} disabled={track.live} onPress={audio.previous} />
          <Control icon={RotateCcw} label="رجوع ١٥ ثانية" size={24} disabled={track.live} onPress={() => audio.skip(-15)} />
        </View>

        {!track.live && (
          <View className="mt-5 flex-row flex-wrap justify-center gap-2">
            <Chip
              label={`السرعة ×${toArabicDigits(state.rate)}`}
              active={state.rate !== 1}
              icon={Gauge}
              onPress={() => audio.setRate(nextRate(state.rate))}
            />
            <Chip
              label={state.repeat === "one" ? "تكرار المقطع" : state.repeat === "all" ? "تكرار الكل" : "بلا تكرار"}
              active={state.repeat !== "off"}
              icon={RepeatIcon}
              onPress={audio.cycleRepeat}
            />
            <Chip
              label={sleepLeft !== null ? `إيقاف بعد ${toArabicDigits(sleepLeft)} د` : "مؤقت النوم"}
              active={state.sleepAt !== null}
              icon={Moon}
              // Cycles off → 15 → 30 → 60 → off.
              onPress={() =>
                audio.setSleepTimer(SLEEP_CHOICES[(SLEEP_CHOICES.indexOf(state.sleepMinutes) + 1) % SLEEP_CHOICES.length] ?? null)
              }
            />
          </View>
        )}
      </Animated.View>
    </View>
  );
}
