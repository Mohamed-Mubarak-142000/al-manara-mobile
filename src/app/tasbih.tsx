import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Palette,
  Pencil,
  RotateCcw,
  Vibrate,
  VibrateOff,
  Volume2,
  VolumeX,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { currentDhikr, parseTarget, sessionOf, todayCount } from "@/core/tasbih/tasbih";
import { TARGET_CHOICES, TASBIH_THEMES, type TasbihTheme } from "@/core/tasbih/tasbihData";
import { toArabicDigits } from "@/core/text/arabic";
import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { AdhkarSheet, ThemeSheet } from "@/features/tasbih/TasbihSheets";
import { playTasbihClick } from "@/features/tasbih/tasbihClick";
import { countTap, updateTasbih, useTasbih } from "@/features/tasbih/tasbihStore";

/*
 * The electronic tasbih (the website's features/tasbih/TasbihView.tsx). The stage is painted in the
 * chosen tasbih theme's own palette, so its colours come from TASBIH_THEMES rather than the app tokens.
 */

const BEADS = 33;

function ToolButton({
  icon: Icon,
  label,
  theme,
  pressed,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  theme: TasbihTheme;
  pressed?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={pressed === undefined ? undefined : { selected: pressed }}
      onPress={onPress}
      hitSlop={6}
      className="size-12 items-center justify-center rounded-2xl border"
      style={({ pressed: down }) => ({
        backgroundColor: pressed ? theme.accent : theme.face,
        borderColor: theme.accent,
        transform: [{ scale: down ? 0.96 : 1 }],
      })}
    >
      <Icon size={20} color={pressed ? theme.face : theme.ink} strokeWidth={1.8} />
    </Pressable>
  );
}

function TargetChip({
  label,
  active,
  theme,
  onPress,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  theme: TasbihTheme;
  onPress: () => void;
  /** A small glyph after the label (the custom count's pencil). */
  icon?: LucideIcon;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className="flex-row items-center gap-1.5 rounded-full border px-3.5 py-1.5"
      style={{ backgroundColor: active ? theme.accent : "transparent", borderColor: active ? theme.accent : theme.track }}
    >
      <Text className="font-sans-bold text-sm" style={{ color: active ? theme.face : theme.ink }}>
        {label}
      </Text>
      {Icon ? <Icon size={14} color={active ? theme.face : theme.ink} strokeWidth={2} /> : null}
    </Pressable>
  );
}

/** "عدد آخر": any count from 1, typed in Arabic or Latin digits. */
function CustomTarget({ current, theme }: { current: number; theme: TasbihTheme }) {
  const custom = !(TARGET_CHOICES as readonly number[]).includes(current);
  const [draft, setDraft] = useState<string | null>(null);

  if (draft === null) {
    return (
      <TargetChip
        label={custom ? toArabicDigits(current) : "عدد آخر"}
        icon={custom ? Pencil : undefined}
        active={custom}
        theme={theme}
        onPress={() => setDraft(custom ? String(current) : "")}
      />
    );
  }
  function save() {
    const value = parseTarget(draft ?? "");
    if (value) updateTasbih({ type: "target", target: value });
    setDraft(null);
  }
  return (
    <View className="flex-row items-center gap-1">
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={save}
        onBlur={save}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
        accessibilityLabel="العدد المطلوب"
        className="w-24 rounded-full px-3 py-1.5 text-center font-sans-bold text-sm"
        style={{ backgroundColor: theme.face, color: theme.ink, borderColor: theme.accent, borderWidth: 1 }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="حفظ العدد"
        onPress={save}
        className="size-8 items-center justify-center rounded-full"
        style={{ backgroundColor: theme.accent }}
      >
        <Check size={16} color={theme.face} />
      </Pressable>
    </View>
  );
}

/** The ring of 33 beads round the counter: lit up to the progress, the newest one a little larger. */
function BeadRing({ lit, theme }: { lit: number; theme: TasbihTheme }) {
  return (
    <Svg viewBox="0 0 200 200" width="100%" height="100%" style={{ position: "absolute" }}>
      {Array.from({ length: BEADS }, (_, index) => {
        // Clockwise from the top, as on the website.
        const angle = (index / BEADS) * Math.PI * 2 - Math.PI / 2;
        const on = index < lit;
        const radius = index === 0 ? 6 : 4.6;
        return (
          <Circle
            key={index}
            cx={100 + Math.cos(angle) * 92}
            cy={100 + Math.sin(angle) * 92}
            r={on && index === lit - 1 ? radius * 1.25 : radius}
            fill={on ? theme.accent : theme.track}
          />
        );
      })}
    </Svg>
  );
}

function Stat({ label, value, theme }: { label: string; value: number; theme: TasbihTheme }) {
  return (
    <View
      className="flex-1 items-center rounded-2xl border px-2 py-3"
      style={{ backgroundColor: `${theme.face}cc`, borderColor: theme.track }}
    >
      <Text className="font-sans text-xs" style={{ color: theme.soft }}>
        {label}
      </Text>
      <Text className="mt-1 font-sans-bold text-xl" style={{ color: theme.ink }}>
        {toArabicDigits(value)}
      </Text>
    </View>
  );
}

export default function TasbihScreen() {
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();
  const { width } = useWindowDimensions();
  const state = useTasbih();
  const dhikr = currentDhikr(state);
  const session = sessionOf(state, dhikr);
  const theme = TASBIH_THEMES.find((entry) => entry.id === state.theme) ?? TASBIH_THEMES[0]!;
  const today = todayCount(state);
  const [sheet, setSheet] = useState<"adhkar" | "themes" | null>(null);

  const size = Math.min(width - 32, 352);
  const progress = session.target > 0 ? session.count / session.target : (session.count % BEADS) / BEADS;
  const litBeads = session.target > 0 ? Math.round(progress * BEADS) : session.count % BEADS;
  const ringLength = 2 * Math.PI * 46;

  const press = useSharedValue(1);
  // 1 is the finished (invisible) state of the round-complete ripple.
  const burst = useSharedValue(1);
  const faceStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.get() }] }));
  const burstStyle = useAnimatedStyle(() => ({ opacity: 1 - burst.get(), transform: [{ scale: 0.9 + burst.get() * 0.45 }] }));

  function tap() {
    const completed = countTap();
    // .set() rather than assigning .value, which the React Compiler treats as mutating a hook value.
    press.set(withSequence(withTiming(0.94, { duration: 60 }), withTiming(1, { duration: 140 })));
    if (completed) burst.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 900 })));
    if (state.sound) playTasbihClick();
    if (!state.vibrate) return;
    // A firmer buzz at the end of a round, so the thumb knows without looking.
    if (completed) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background[2] }}>
      <StatusBar style={theme.id === "marble" ? "dark" : "light"} />
      <LinearGradient colors={theme.background} locations={[0, 0.55, 1]} style={{ position: "absolute", inset: 0 }} />
      <ScrollView
        contentContainerStyle={{
          alignItems: "center",
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + miniPlayer + 32,
          paddingHorizontal: 16,
        }}
      >
        <View className="w-full flex-row items-center justify-between">
          <ToolButton
            icon={ChevronRight}
            label="رجوع"
            theme={theme}
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          />
          <Text className="font-sans-bold text-lg" style={{ color: theme.ink }}>
            السبحة الإلكترونية
          </Text>
          <View className="size-12" />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${dhikr.text} — تغيير الذكر`}
          onPress={() => setSheet("adhkar")}
          className="mt-4 w-full flex-row items-center justify-center gap-2 rounded-full border-2 px-5 py-2.5"
          style={({ pressed }) => ({ backgroundColor: theme.accent, borderColor: theme.ink, transform: [{ scale: pressed ? 0.98 : 1 }] })}
        >
          <Text className="shrink text-center font-quran-fallback text-xl leading-9" style={{ color: theme.face }}>
            {dhikr.text}
          </Text>
          <ChevronDown size={20} color={theme.face} />
        </Pressable>
        {dhikr.note && (
          <Text className="mt-2 text-center font-sans text-xs" style={{ color: theme.soft }}>
            {dhikr.note}
          </Text>
        )}

        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="عدد التكرار"
          className="mt-4 flex-row flex-wrap items-center justify-center gap-2"
        >
          {TARGET_CHOICES.map((target) => (
            <TargetChip
              key={target}
              label={target === 0 ? "مفتوح" : toArabicDigits(target)}
              active={session.target === target}
              theme={theme}
              onPress={() => updateTasbih({ type: "target", target })}
            />
          ))}
          <CustomTarget current={session.target} theme={theme} />
        </View>

        <View className="mt-5 w-full flex-row items-center justify-around">
          <ToolButton icon={Palette} label="شكل السبحة" theme={theme} onPress={() => setSheet("themes")} />
          <ToolButton icon={RotateCcw} label="تصفير العدّاد" theme={theme} onPress={() => updateTasbih({ type: "reset" })} />
          <ToolButton
            icon={state.sound ? Volume2 : VolumeX}
            label="صوت التكة"
            pressed={state.sound}
            theme={theme}
            onPress={() => updateTasbih({ type: "sound" })}
          />
          <ToolButton
            icon={state.vibrate ? Vibrate : VibrateOff}
            label="الاهتزاز"
            pressed={state.vibrate}
            theme={theme}
            onPress={() => updateTasbih({ type: "vibrate" })}
          />
        </View>

        <View className="mt-6" style={{ width: size, height: size }}>
          <BeadRing lit={litBeads} theme={theme} />
          <Animated.View
            pointerEvents="none"
            className="absolute rounded-full border-4"
            style={[{ inset: size * 0.13, borderColor: theme.accent }, burstStyle]}
          />
          <Animated.View className="absolute" style={[{ inset: size * 0.13 }, faceStyle]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`سبّح — ${toArabicDigits(session.count)}${session.target ? ` من ${toArabicDigits(session.target)}` : ""}`}
              onPress={tap}
              className="flex-1 items-center justify-center rounded-full"
              style={{ backgroundColor: theme.face, boxShadow: `0 20px 50px -20px ${theme.accent}` }}
            >
              <Svg viewBox="0 0 100 100" width="100%" height="100%" style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
                <Circle cx="50" cy="50" r="46" fill="none" stroke={theme.track} strokeWidth={4} />
                {progress > 0 && (
                  <Circle
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    stroke={theme.accent}
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeDasharray={ringLength}
                    strokeDashoffset={ringLength * (1 - progress)}
                  />
                )}
              </Svg>
              <Text className="font-display-bold text-6xl leading-[84px]" style={{ color: theme.ink }}>
                {toArabicDigits(session.count)}
              </Text>
              <Text className="font-sans text-sm" style={{ color: theme.soft }}>
                {session.target ? `من ${toArabicDigits(session.target)}` : "اضغط للتسبيح"}
              </Text>
            </Pressable>
          </Animated.View>
        </View>

        <View className="mt-6 w-full flex-row gap-2">
          <Stat label="الدورات" value={session.rounds} theme={theme} />
          <Stat label="اليوم" value={today} theme={theme} />
          <Stat label="الإجمالي" value={state.total} theme={theme} />
        </View>

        <Text className="mt-5 text-center font-sans text-xs leading-6" style={{ color: theme.soft }}>
          العدّ محفوظ على هذا الجهاز فقط. اضغط على الذكر لتغييره أو لإضافة ذكر خاص بك.
        </Text>
      </ScrollView>

      <AdhkarSheet open={sheet === "adhkar"} onClose={() => setSheet(null)} />
      <ThemeSheet open={sheet === "themes"} onClose={() => setSheet(null)} />
    </View>
  );
}
