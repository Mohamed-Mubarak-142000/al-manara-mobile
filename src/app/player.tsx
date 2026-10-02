import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ChevronDown, Moon, Pause, Play, Repeat, Repeat1, RotateCcw, RotateCw, SkipBack, SkipForward } from "lucide-react-native";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatDuration, toArabicDigits } from "@/core/text/arabic";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { audio, currentTrack, usePlayer } from "@/features/audio/playerStore";
import { DownloadButton } from "@/features/downloads/DownloadButton";
import { useNow } from "@/features/time/useNow";

const RATES = [0.75, 1, 1.25, 1.5];
const SLEEP_CHOICES: (number | null)[] = [null, 15, 30, 60];
const WHITE = "#fbf8f1";
const NIGHT = "#012a22";

function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress: () => void; icon?: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 ${active ? "border-gold bg-gold/20" : "border-white/20 bg-white/5"}`}
    >
      {icon}
      <Text className={`font-sans-bold text-xs ${active ? "text-gold-soft" : "text-white/80"}`}>{label}</Text>
    </Pressable>
  );
}

/** The full-screen player, presented as a modal over whatever the user was doing. */
export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const state = usePlayer();
  const now = useNow(1000);
  const track = currentTrack(state);

  if (!track) {
    return (
      <View className="flex-1 items-center justify-center bg-emerald-night">
        <Text className="font-sans text-base text-white/70">لا يوجد ما يُشغَّل الآن.</Text>
      </View>
    );
  }

  const nextRate = RATES[(RATES.indexOf(state.rate) + 1) % RATES.length] ?? 1;
  const sleepLeft = state.sleepAt ? Math.max(0, Math.ceil((state.sleepAt - now.getTime()) / 60000)) : null;
  const RepeatIcon = state.repeat === "one" ? Repeat1 : Repeat;

  return (
    <View className="flex-1 bg-emerald-night" style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}>
      <Image
        source={require("@/assets/images/scenes/quran-terrace.png")}
        contentFit="cover"
        style={{ position: "absolute", inset: 0, opacity: 0.35 }}
      />
      <LinearGradient colors={["rgba(1,42,34,0.4)", NIGHT]} locations={[0, 0.6]} style={{ position: "absolute", inset: 0 }} />

      <View className="flex-row items-center justify-between px-4">
        <Pressable accessibilityRole="button" accessibilityLabel="إغلاق" onPress={() => router.back()} hitSlop={12} className="p-1">
          <ChevronDown size={28} color={WHITE} />
        </Pressable>
        <Text className="font-sans-bold text-sm text-gold-soft">
          {state.queue.length > 1 ? `${toArabicDigits(state.index + 1)} من ${toArabicDigits(state.queue.length)}` : "يُشغَّل الآن"}
        </Text>
        {track.live ? <View className="size-9" /> : <DownloadButton track={track} tone="light" />}
      </View>

      <View className="flex-1 items-center justify-center px-8">
        <View className="size-64 items-center justify-center rounded-[48px] border border-gold/30 bg-white/5">
          <View className="absolute size-52 rotate-45 rounded-[40px] border border-gold/20" />
          <Image source={require("@/assets/images/brand/logo.png")} contentFit="contain" style={{ width: 120, height: 120 }} />
        </View>
        <Text numberOfLines={2} className="mt-10 text-center font-display-bold text-3xl leading-[46px] text-white">
          {track.title}
        </Text>
        <Text numberOfLines={1} className="mt-1 text-center font-sans text-base text-white/70">
          {track.artist}
        </Text>
      </View>

      <View className="px-6">
        {track.live ? (
          <View className="flex-row items-center justify-center gap-2">
            <View className="size-2 rounded-full bg-rose" />
            <Text className="font-sans-bold text-sm text-white/80">بث مباشر</Text>
          </View>
        ) : (
          <>
            <ProgressBar
              tone="light"
              value={state.duration ? state.currentTime / state.duration : 0}
              onSeek={(fraction) => audio.seekTo(fraction * state.duration)}
            />
            <View className="mt-1 flex-row justify-between">
              <Text className="font-sans text-xs text-white/60">{formatDuration(state.currentTime)}</Text>
              <Text className="font-sans text-xs text-white/60">{formatDuration(state.duration)}</Text>
            </View>
          </>
        )}

        <View className="mt-6 flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="تقديم ١٥ ثانية"
            disabled={track.live}
            onPress={() => audio.skip(15)}
            className="p-2"
          >
            <RotateCw size={24} color={track.live ? "rgba(255,255,255,0.25)" : WHITE} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="التالي"
            disabled={state.index + 1 >= state.queue.length}
            onPress={audio.next}
            className="p-2"
          >
            <SkipForward size={30} color={state.index + 1 >= state.queue.length ? "rgba(255,255,255,0.25)" : WHITE} fill="transparent" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={state.playing ? "إيقاف مؤقت" : "تشغيل"}
            onPress={audio.toggle}
            className="size-20 items-center justify-center rounded-full bg-gold shadow-gold"
          >
            {state.buffering && !state.playing ? (
              <ActivityIndicator color={NIGHT} />
            ) : state.playing ? (
              <Pause size={34} color={NIGHT} fill={NIGHT} />
            ) : (
              <Play size={34} color={NIGHT} fill={NIGHT} />
            )}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="السابق" disabled={track.live} onPress={audio.previous} className="p-2">
            <SkipBack size={30} color={track.live ? "rgba(255,255,255,0.25)" : WHITE} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="رجوع ١٥ ثانية"
            disabled={track.live}
            onPress={() => audio.skip(-15)}
            className="p-2"
          >
            <RotateCcw size={24} color={track.live ? "rgba(255,255,255,0.25)" : WHITE} />
          </Pressable>
        </View>

        {!track.live && (
          <View className="mt-7 flex-row flex-wrap justify-center gap-2">
            <Chip label={`السرعة ×${toArabicDigits(state.rate)}`} active={state.rate !== 1} onPress={() => audio.setRate(nextRate)} />
            <Chip
              label={state.repeat === "one" ? "تكرار المقطع" : state.repeat === "all" ? "تكرار الكل" : "بلا تكرار"}
              active={state.repeat !== "off"}
              icon={<RepeatIcon size={14} color={state.repeat !== "off" ? "#e8d7a6" : "rgba(255,255,255,0.8)"} />}
              onPress={audio.cycleRepeat}
            />
            <Chip
              label={sleepLeft !== null ? `إيقاف بعد ${toArabicDigits(sleepLeft)} د` : "مؤقت النوم"}
              active={state.sleepAt !== null}
              icon={<Moon size={14} color={state.sleepAt !== null ? "#e8d7a6" : "rgba(255,255,255,0.8)"} />}
              // Cycles off → 15 → 30 → 60 → off.
              onPress={() =>
                audio.setSleepTimer(SLEEP_CHOICES[(SLEEP_CHOICES.indexOf(state.sleepMinutes) + 1) % SLEEP_CHOICES.length] ?? null)
              }
            />
          </View>
        )}
      </View>
    </View>
  );
}
