import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Pointer,
  Settings as SettingsIcon,
  Star,
  Users,
} from "lucide-react-native";
import { router } from "expo-router";
import { useEffect, useRef, useState, type RefObject } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInLeft,
  FadeInRight,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { isSurahUnlocked } from "@/core/kids/levels";
import type { Surah } from "@/core/quran/api";
import type { Ayah } from "@/core/quran/textApi";
import { toArabicDigits } from "@/core/text/arabic";

import { kidsAudio, useKidsAudio } from "../kidsAudio";
import { getKidsSurahs, getTeachingTrack, husaryAyah, kidsAyahs, kidsBasmala, kidsSurah, kidsTafsir, muallimAyah } from "../kidsData";
import { useKidsProgress } from "../progress/progressStore";
import { ReciteRecorder } from "../ReciteRecorder";
import { sfx } from "../sfx";
import { useLoad } from "../useLoad";
import { Celebration } from "../ui/Celebration";
import { KidsButton } from "../ui/KidsButton";
import { KidsPanel, KidsText, QuranText } from "../ui/KidsPanel";
import { KidsScroll } from "../ui/KidsScroll";
import { KIDS, PANEL_SHADOW } from "../ui/kidsStyles";
import { go, kidsHref } from "../ui/nav";

type Mode = "muallim" | "plain";
interface Settings {
  repeat: 1 | 3 | 5;
  autoAdvance: boolean;
}

const STEP_GROUP = 10;

interface PlaybackContext {
  ayahs: Ayah[];
  surah: Surah;
  repeats: RefObject<number>;
  settings: RefObject<Settings>;
  onAdvance: (index: number) => void;
  onFinished: () => void;
}

// Module-level (not component) functions so the replay → next-ayah chain can recurse freely.
function startAyah(ctx: PlaybackContext, index: number, mode: Mode, resetRepeats = true) {
  const ayah = ctx.ayahs[index];
  if (!ayah) return;
  if (resetRepeats) ctx.repeats.current = 0;
  kidsAudio.play(
    `kids-${mode}-${ayah.number}`,
    mode === "muallim" ? muallimAyah(ctx.surah.id, ayah.numberInSurah) : husaryAyah(ctx.surah.id, ayah.numberInSurah),
    { onEnded: () => onAyahEnded(ctx, index, mode) },
  );
}

function onAyahEnded(ctx: PlaybackContext, index: number, mode: Mode) {
  ctx.repeats.current += 1;
  if (ctx.repeats.current < ctx.settings.current.repeat) {
    startAyah(ctx, index, mode, false);
    return;
  }
  if (index === ctx.ayahs.length - 1) {
    ctx.onFinished();
    return;
  }
  if (ctx.settings.current.autoAdvance) {
    ctx.onAdvance(index + 1);
    startAyah(ctx, index + 1, mode);
  }
}

function BouncingPointer() {
  const reduceMotion = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    y.value = withRepeat(withSequence(withTiming(-5, { duration: 550 }), withTiming(0, { duration: 550 })), -1);
  }, [reduceMotion, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View style={[{ position: "absolute", top: "100%", alignSelf: "center", marginTop: 2 }, style]} pointerEvents="none">
      <Pointer size={26} color={KIDS.gold} fill={KIDS.pointer} />
    </Animated.View>
  );
}

function Chip({
  active,
  onPress,
  icon,
  children,
  gold,
}: {
  active: boolean;
  onPress: () => void;
  icon: React.ReactNode;
  children: string;
  gold?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderWidth: 2,
        backgroundColor: active ? (gold ? KIDS.cream : KIDS.mist) : KIDS.white,
        borderColor: active ? (gold ? KIDS.starFill : "rgba(0,85,68,0.4)") : KIDS.chipRing,
      }}
    >
      {icon}
      <KidsText size={14} bold style={{ color: active ? (gold ? KIDS.honey : KIDS.deep) : KIDS.muted }}>
        {children}
      </KidsText>
    </Pressable>
  );
}

function PlayButton({
  tone,
  label,
  caption,
  state,
  onPress,
}: {
  tone: "emerald" | "sky";
  label: string;
  caption: string;
  state: { playing: boolean; loading: boolean };
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ flex: 1 }}>
      {({ pressed }) => (
        <View
          style={{
            borderRadius: 28,
            paddingVertical: 12,
            paddingHorizontal: 10,
            alignItems: "center",
            backgroundColor: tone === "emerald" ? KIDS.emerald : KIDS.sky,
            borderBottomWidth: pressed ? 1 : 6,
            borderBottomColor: tone === "emerald" ? KIDS.emeraldShadow : KIDS.skyShadow,
            marginTop: pressed ? 5 : 0,
          }}
        >
          <View className="flex-row items-center gap-2">
            {state.loading ? (
              <ActivityIndicator color={KIDS.white} size="small" />
            ) : state.playing ? (
              <Pause size={20} color={KIDS.white} fill={KIDS.white} />
            ) : (
              <Play size={20} color={KIDS.white} fill={KIDS.white} />
            )}
            <KidsText size={17} bold tone="white">
              {label}
            </KidsText>
          </View>
          <KidsText size={11} bold tone="white" style={{ opacity: 0.85 }}>
            {caption}
          </KidsText>
        </View>
      )}
    </Pressable>
  );
}

export function KidsLearn({ surahId }: { surahId: number }) {
  const surah = kidsSurah(surahId);
  const ayahs = kidsAyahs(surahId);
  const basmala = kidsBasmala(surahId);
  const player = useKidsAudio();
  const { state, setAyahMemorized, recordListenCompletion } = useKidsProgress();
  const teachingState = useLoad(`teach-${surahId}`, () => getTeachingTrack(surahId), null);
  const teaching = teachingState.status === "ready" ? teachingState.data : null;
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [panel, setPanel] = useState<"tafsir" | "settings" | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>({ repeat: 1, autoAdvance: true });
  const [celebrate, setCelebrate] = useState<"listened" | "memorized" | null>(null);
  const settingsRef = useRef<Settings>(settings);
  const repeatsRef = useRef(0);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  useEffect(
    () => () => {
      if (kidsAudio.getState().id?.startsWith("kids-")) kidsAudio.stop();
    },
    [],
  );

  const ayah = ayahs[index];
  const memorized = new Set(state.memorizedAyahsBySurah[surah.id] ?? []);
  const group = Math.floor(index / STEP_GROUP);
  const groupAyahs = ayahs.slice(group * STEP_GROUP, group * STEP_GROUP + STEP_GROUP);
  const groups = Math.ceil(ayahs.length / STEP_GROUP);

  const ctx: PlaybackContext = {
    ayahs,
    surah,
    repeats: repeatsRef,
    settings: settingsRef,
    onAdvance: (next) => {
      setDirection(1);
      setIndex(next);
    },
    onFinished: () => {
      recordListenCompletion(surah.id);
      sfx.win();
      setCelebrate("listened");
    },
  };

  function goTo(next: number) {
    if (next < 0 || next >= ayahs.length || next === index) return;
    if (kidsAudio.getState().id?.startsWith("kids-") && kidsAudio.getState().playing) kidsAudio.pause();
    setDirection(next > index ? 1 : -1);
    setIndex(next);
    setPanel((current) => (current === "tafsir" ? current : null));
    sfx.tap();
  }

  function playMode(mode: Mode) {
    if (!ayah) return;
    const id = `kids-${mode}-${ayah.number}`;
    if (kidsAudio.isCurrent(id)) {
      kidsAudio.toggle();
      return;
    }
    startAyah(ctx, index, mode);
  }

  function toggleMemorized() {
    if (!ayah) return;
    const next = !memorized.has(ayah.numberInSurah);
    setAyahMemorized(surah.id, ayah.numberInSurah, next);
    if (!next) return;
    sfx.correct();
    if (memorized.size + 1 >= ayahs.length) setCelebrate("memorized");
  }

  const teachingId = `kids-teach-${surah.id}`;
  const teachingOn = player.id === teachingId;

  function playTeaching() {
    if (!teaching) return;
    if (teachingOn) {
      kidsAudio.toggle();
      return;
    }
    kidsAudio.play(teachingId, teaching.src);
  }

  if (!ayah) {
    return (
      <KidsScroll>
        <KidsPanel>
          <KidsText size={17} tone="muted" center>
            تعذّر تحميل آيات السورة الآن، جرّب بعد قليل.
          </KidsText>
        </KidsPanel>
      </KidsScroll>
    );
  }

  const modeState = (mode: Mode) => ({
    playing: player.id === `kids-${mode}-${ayah.number}` && player.playing,
    loading: player.id === `kids-${mode}-${ayah.number}` && player.loading,
  });
  const tafsirText = panel === "tafsir" ? kidsTafsir(surah.id, ayah.numberInSurah) : undefined;
  const isMemorized = memorized.has(ayah.numberInSurah);

  return (
    <KidsScroll gap={0}>
      {/* Surah switcher */}
      <View className="items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`تعلّم سورة ${surah.name}`}
          onPress={() => setSwitcherOpen(true)}
          style={[
            {
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              borderRadius: 999,
              backgroundColor: KIDS.white,
              paddingHorizontal: 28,
              paddingVertical: 6,
              borderWidth: 4,
              borderColor: KIDS.surahRing,
            },
            PANEL_SHADOW,
          ]}
        >
          <QuranText size={28} color={KIDS.surahTitle}>
            سورة {surah.name}
          </QuranText>
          <ChevronDown size={20} color={KIDS.muted} />
          <View
            style={{
              position: "absolute",
              top: -12,
              end: -10,
              transform: [{ rotate: "-8deg" }],
              borderRadius: 999,
              backgroundColor: KIDS.starFill,
              paddingHorizontal: 10,
            }}
          >
            <Text className="font-kids-bold" style={{ fontSize: 11, color: KIDS.goldText }}>
              {surah.meccan ? "سورة مكية" : "سورة مدنية"}
            </Text>
          </View>
        </Pressable>
      </View>
      <BottomSheet
        visible={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        title="اختر سورة لتتعلّمها"
        icon={BookOpen}
        maxHeight={0.75}
      >
        <KidsSurahGrid current={surah.id} onPick={() => setSwitcherOpen(false)} />
      </BottomSheet>

      {/* Ayah steps */}
      <View accessibilityLabel="آيات السورة" className="mt-8 flex-row items-center justify-center gap-2">
        {groups > 1 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="الآيات السابقة"
            disabled={group === 0}
            onPress={() => goTo(Math.max(0, (group - 1) * STEP_GROUP))}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(255,255,255,0.9)",
              alignItems: "center",
              justifyContent: "center",
              opacity: group === 0 ? 0.3 : 1,
            }}
          >
            <ChevronRight size={20} color={KIDS.deep} />
          </Pressable>
        )}
        <View className="flex-row flex-wrap items-center justify-center" style={{ gap: 6, flexShrink: 1 }}>
          {groupAyahs.map((entry) => {
            const entryIndex = ayahs.indexOf(entry);
            const active = entryIndex === index;
            const done = memorized.has(entry.numberInSurah);
            return (
              <View key={entry.number} style={{ marginBottom: active ? 22 : 0 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`الآية ${toArabicDigits(entry.numberInSurah)}${done ? " — محفوظة" : ""}`}
                  accessibilityState={{ selected: active }}
                  onPress={() => goTo(entryIndex)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 3,
                    transform: [{ scale: active ? 1.2 : 1 }],
                    backgroundColor: active ? KIDS.rose : done ? KIDS.emerald : KIDS.white,
                    borderColor: active ? KIDS.white : done ? "rgba(255,255,255,0.8)" : KIDS.stepRing,
                  }}
                >
                  {done && !active ? (
                    <Check size={18} color={KIDS.white} />
                  ) : (
                    <Text className="font-kids-bold" style={{ fontSize: 16, color: active || done ? KIDS.white : KIDS.muted }}>
                      {toArabicDigits(entry.numberInSurah)}
                    </Text>
                  )}
                </Pressable>
                {active && <BouncingPointer />}
              </View>
            );
          })}
        </View>
        {groups > 1 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="الآيات التالية"
            disabled={group === groups - 1}
            onPress={() => goTo(Math.min(ayahs.length - 1, (group + 1) * STEP_GROUP))}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(255,255,255,0.9)",
              alignItems: "center",
              justifyContent: "center",
              opacity: group === groups - 1 ? 0.3 : 1,
            }}
          >
            <ChevronLeft size={20} color={KIDS.deep} />
          </Pressable>
        )}
      </View>

      {/* The ayah card */}
      <View className="mt-10">
        <View
          style={[
            {
              borderRadius: 44,
              backgroundColor: "rgba(255,255,255,0.95)",
              paddingHorizontal: 18,
              paddingTop: 26,
              paddingBottom: 28,
              borderWidth: 4,
              borderColor: "rgba(255,255,255,0.7)",
              overflow: "hidden",
            },
            PANEL_SHADOW,
          ]}
        >
          <View
            style={{ position: "absolute", end: -40, top: -40, width: 112, height: 112, borderRadius: 56, backgroundColor: KIDS.blush }}
          />
          <Animated.View
            key={ayah.number}
            entering={direction >= 0 ? FadeInLeft.duration(300) : FadeInRight.duration(300)}
            style={{ alignItems: "center" }}
          >
            <View style={{ borderRadius: 999, backgroundColor: KIDS.soft, paddingHorizontal: 16, paddingVertical: 2 }}>
              <KidsText size={13} bold tone="muted">
                الآية {toArabicDigits(ayah.numberInSurah)}
              </KidsText>
            </View>
            {index === 0 && basmala ? (
              <QuranText size={20} color={KIDS.muted} style={{ marginTop: 14 }}>
                {basmala}
              </QuranText>
            ) : null}
            <QuranText size={34} style={{ marginTop: 14 }}>
              {ayah.text}
            </QuranText>
          </Animated.View>

          <View className="mt-6 flex-row flex-wrap justify-center gap-2">
            <Chip
              active={panel === "tafsir"}
              onPress={() => setPanel((current) => (current === "tafsir" ? null : "tafsir"))}
              icon={<BookOpen size={16} color={KIDS.muted} />}
            >
              تفسير الآية (للكبار)
            </Chip>
            <Chip
              active={panel === "settings"}
              onPress={() => setPanel((current) => (current === "settings" ? null : "settings"))}
              icon={<SettingsIcon size={16} color={KIDS.muted} />}
            >
              إعدادات التلاوة
            </Chip>
            <Chip
              gold
              active={isMemorized}
              onPress={toggleMemorized}
              icon={<Star size={16} color={isMemorized ? KIDS.starStroke : KIDS.muted} fill={isMemorized ? KIDS.starFill : "none"} />}
            >
              {isMemorized ? "حفظتها!" : "حفظتُ هذه الآية"}
            </Chip>
          </View>

          {panel === "tafsir" && (
            <Animated.View
              entering={FadeIn}
              exiting={FadeOut}
              style={{ marginTop: 16, borderRadius: 24, backgroundColor: KIDS.ivory, padding: 16 }}
            >
              <Text className="font-sans-bold" style={{ fontSize: 12, color: KIDS.goldDeep }}>
                التفسير الميسّر
              </Text>
              <Text className="font-sans" style={{ fontSize: 16, lineHeight: 32, color: "rgba(24,61,52,0.85)" }}>
                {tafsirText ?? "التفسير غير متاح الآن."}
              </Text>
            </Animated.View>
          )}
          {panel === "settings" && (
            <Animated.View
              entering={FadeIn}
              exiting={FadeOut}
              style={{ marginTop: 16, borderRadius: 24, backgroundColor: KIDS.ivory, padding: 16, gap: 16 }}
            >
              <View>
                <KidsText size={14} bold>
                  كم مرة تتكرر الآية؟
                </KidsText>
                <View className="mt-2 flex-row gap-2">
                  {([1, 3, 5] as const).map((count) => (
                    <Pressable
                      key={count}
                      accessibilityRole="button"
                      accessibilityState={{ selected: settings.repeat === count }}
                      onPress={() => setSettings((current) => ({ ...current, repeat: count }))}
                      style={{
                        flex: 1,
                        borderRadius: 16,
                        paddingVertical: 8,
                        alignItems: "center",
                        backgroundColor: settings.repeat === count ? KIDS.emerald : KIDS.white,
                      }}
                    >
                      <KidsText size={15} bold style={{ color: settings.repeat === count ? KIDS.white : KIDS.muted }}>
                        {toArabicDigits(count)} {count === 1 ? "مرة" : "مرات"}
                      </KidsText>
                    </Pressable>
                  ))}
                </View>
              </View>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: settings.autoAdvance }}
                onPress={() => setSettings((current) => ({ ...current, autoAdvance: !current.autoAdvance }))}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderRadius: 16,
                  backgroundColor: KIDS.white,
                  padding: 12,
                }}
              >
                <KidsText size={15} bold>
                  انتقل للآية التالية تلقائيًا
                </KidsText>
                <View
                  style={{
                    width: 48,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: settings.autoAdvance ? KIDS.emerald : KIDS.line,
                    justifyContent: "center",
                    paddingHorizontal: 4,
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: KIDS.white,
                      alignSelf: settings.autoAdvance ? "flex-end" : "flex-start",
                    }}
                  />
                </View>
              </Pressable>
            </Animated.View>
          )}

          {/* The listening box */}
          <View
            style={{
              marginTop: 28,
              borderRadius: 32,
              backgroundColor: KIDS.softer,
              paddingHorizontal: 14,
              paddingBottom: 18,
              paddingTop: 36,
            }}
          >
            <View
              style={[
                {
                  position: "absolute",
                  top: -28,
                  alignSelf: "center",
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: KIDS.white,
                  alignItems: "center",
                  justifyContent: "center",
                },
                PANEL_SHADOW,
              ]}
            >
              <BookOpen size={28} color={KIDS.sky} />
            </View>
            <View className="flex-row gap-3">
              <PlayButton
                tone="emerald"
                label="الشيخ مع التكرار"
                caption="الحصري — المصحف المعلّم"
                state={modeState("muallim")}
                onPress={() => playMode("muallim")}
              />
              <PlayButton
                tone="sky"
                label="الشيخ فقط"
                caption="الحصري — تلاوة"
                state={modeState("plain")}
                onPress={() => playMode("plain")}
              />
            </View>
            {teaching && (
              <KidsButton
                tone="gold"
                size="sm"
                className="mt-3"
                icon={teachingOn && player.playing ? Pause : Users}
                iconFilled={teachingOn && player.playing}
                caption={`(${teaching.reciterName})`}
                onPress={playTeaching}
              >
                {teachingOn && player.playing ? "إيقاف السورة" : "استمع للسورة كاملة مع الأطفال"}
              </KidsButton>
            )}
            {player.error && player.id?.startsWith("kids-") ? (
              <KidsText size={14} bold center className="mt-3" style={{ color: KIDS.roseShadow }}>
                {player.error}
              </KidsText>
            ) : null}
          </View>

          <View className="mt-6">
            <ReciteRecorder key={ayah.number} />
          </View>
        </View>

        {/* Previous / next ayah, on the card's sides like the website */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="الآية السابقة"
          disabled={index === 0}
          onPress={() => goTo(index - 1)}
          style={[
            {
              position: "absolute",
              start: -6,
              top: 70,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: KIDS.white,
              alignItems: "center",
              justifyContent: "center",
              opacity: index === 0 ? 0 : 1,
            },
            PANEL_SHADOW,
          ]}
        >
          <ChevronRight size={24} color={KIDS.deep} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="الآية التالية"
          disabled={index === ayahs.length - 1}
          onPress={() => goTo(index + 1)}
          style={[
            {
              position: "absolute",
              end: -6,
              top: 70,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: KIDS.white,
              alignItems: "center",
              justifyContent: "center",
              opacity: index === ayahs.length - 1 ? 0 : 1,
            },
            PANEL_SHADOW,
          ]}
        >
          <ChevronLeft size={24} color={KIDS.deep} />
        </Pressable>
      </View>

      <Celebration
        open={celebrate !== null}
        title={celebrate === "memorized" ? "ما شاء الله! حفظت السورة" : "أحسنت! أكملت السورة"}
        message={celebrate === "memorized" ? `أتممت حفظ سورة ${surah.name} كاملة` : `استمعت لسورة ${surah.name} كاملة`}
        stars={3}
        onClose={() => setCelebrate(null)}
      >
        <KidsButton
          tone="gold"
          onPress={() => {
            setCelebrate(null);
            go(`/kids/quiz/${surah.id}`);
          }}
        >
          اختبر نفسك لتفتح السورة التالية
        </KidsButton>
        <KidsButton tone="emerald" onPress={() => setCelebrate(null)}>
          أكمل
        </KidsButton>
      </Celebration>
    </KidsScroll>
  );
}

/** The switcher's grid: the surahs open to this child (the sheet scrolls it). */
function KidsSurahGrid({ current, onPick }: { current: number; onPick: () => void }) {
  const { state } = useKidsProgress();
  const open = getKidsSurahs().filter((entry) => isSurahUnlocked(state, entry.id));
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {open.map((entry) => (
        <Pressable
          key={entry.id}
          accessibilityRole="button"
          onPress={() => {
            onPick();
            if (entry.id !== current) router.replace(kidsHref(`/kids/learn/${entry.id}`));
          }}
          accessibilityState={{ selected: entry.id === current }}
          style={({ pressed }) => ({
            width: "48%",
            borderRadius: 16,
            paddingVertical: 10,
            alignItems: "center",
            backgroundColor: entry.id === current ? KIDS.emerald : KIDS.mist,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          <KidsText size={16} bold style={{ color: entry.id === current ? KIDS.white : KIDS.deep }}>
            {entry.name}
          </KidsText>
        </Pressable>
      ))}
    </View>
  );
}
