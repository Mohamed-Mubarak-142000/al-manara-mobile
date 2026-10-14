import { Image } from "expo-image";
import { router, useIsFocused, type Href } from "expo-router";
import { useEffect } from "react";
import { I18nManager, Pressable, Text, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withDecay,
  type SharedValue,
} from "react-native-reanimated";

import type { LastRead } from "@/features/mushaf/readerPrefs";
import { useAppActive, useReduceMotion } from "@/lib/screenState";

import { SECTION_ART, type SectionArt } from "./sectionArt";

/** The mushaf at the last-read page, or the Quran index when nothing has been read yet. */
export function openReading(lastRead: LastRead | null) {
  if (lastRead) router.push({ pathname: "/mushaf", params: { page: String(lastRead.page) } });
  else router.push("/quran");
}

interface QuickAction {
  art: SectionArt;
  label: string;
  hint?: string;
  href: Href;
}

/**
 * What most people open Home for. Not the mushaf: "اقرأ القرآن" above and the continue-reading card below
 * already open it.
 */
const ACTIONS: QuickAction[] = [
  { art: "tasmee", label: "التسميع", hint: "سمّع من حفظك بصوتك", href: "/tasmee" },
  { art: "adhkar", label: "الأذكار", href: "/adhkar" },
  { art: "qibla", label: "القبلة", href: "/qibla" },
  { art: "radio", label: "الإذاعة", href: "/radio" },
  { art: "tasbih", label: "السبحة", href: "/tasbih" },
  { art: "prayer", label: "المواقيت", href: "/prayer" },
  { art: "hadith", label: "الأحاديث", href: "/hadith" },
  { art: "ruqyah", label: "الرقية", href: "/ruqyah" },
];

const ITEM = 92;
const GAP = 12;
const SPAN = ITEM + GAP;
const EDGE = 16;
const HEIGHT = 124;
/** Glide speed of the strip, in points per second: slow enough to read, quick enough to notice. */
const SPEED = 24;
/** After a swipe the strip waits this long before gliding again. */
const RESUME_AFTER_MS = 2000;

/** Modulo that stays positive for negative numbers. */
function wrap(value: number, length: number) {
  "worklet";
  return ((value % length) + length) % length;
}

interface ActionProps {
  action: QuickAction;
  slot: number;
  offset: SharedValue<number>;
  length: number;
  viewport: number;
  hidden: boolean;
}

function Action({ action, slot, offset, length, viewport, hidden }: ActionProps) {
  const direction = I18nManager.isRTL ? -1 : 1;
  // Each tile wraps on its own: once it leaves past the start edge it comes back in after the last one,
  // so the strip never ends and never jumps. It grows a touch as it crosses the middle of the screen.
  const style = useAnimatedStyle(() => {
    const position = wrap(slot * SPAN - offset.get() + SPAN, length) - SPAN + EDGE;
    const distance = Math.abs(position + ITEM / 2 - viewport / 2);
    const scale = interpolate(distance, [0, viewport / 2], [1.06, 0.92], Extrapolation.CLAMP);
    const opacity = interpolate(distance, [0, viewport / 2 + ITEM], [1, 0.7], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateX: direction * position }, { scale }] };
  });
  return (
    <Animated.View
      style={[{ position: "absolute", top: 8, start: 0, width: ITEM }, style]}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={action.label}
        accessibilityHint={action.hint}
        onPress={() => router.push(action.href)}
        className="items-center gap-2"
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.95 : 1 }] })}
      >
        <View className="size-19 items-center justify-center rounded-[26px] bg-surface-alt">
          <Image source={SECTION_ART[action.art]} style={{ width: 46, height: 46 }} contentFit="contain" accessible={false} />
        </View>
        <Text numberOfLines={1} className="font-sans-bold text-xs text-fg">
          {action.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/**
 * A full-width strip of shortcuts, each with its 3D art, that glides by on its own without end. A finger
 * stops it and drags it; it carries on a moment after letting go. Still with reduce motion on.
 */
export function QuickActions() {
  const { width } = useWindowDimensions();
  const focused = useIsFocused();
  const appActive = useAppActive();
  const reduceMotion = useReduceMotion();

  // Enough copies of the shortcuts to always overfill the screen by one tile, so wrapping is never seen.
  const copies = Math.max(1, Math.ceil((width + 2 * SPAN) / (ACTIONS.length * SPAN)));
  const slots = Array.from({ length: copies }, () => ACTIONS).flat();
  const length = slots.length * SPAN;

  const offset = useSharedValue(0);
  const dragging = useSharedValue(false);
  const hold = useSharedValue(0);
  const start = useSharedValue(0);

  const glide = useFrameCallback((frame) => {
    const elapsed = frame.timeSincePreviousFrame ?? 16;
    if (dragging.get()) return;
    if (hold.get() > 0) {
      hold.set(Math.max(0, hold.get() - elapsed));
      return;
    }
    offset.set(wrap(offset.get() + (SPEED * elapsed) / 1000, length));
  }, false);

  const moving = focused && appActive && !reduceMotion;
  useEffect(() => {
    glide.setActive(moving);
  }, [glide, moving]);

  const direction = I18nManager.isRTL ? -1 : 1;
  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-12, 12])
    .onBegin(() => {
      dragging.set(true);
      cancelAnimation(offset);
      start.set(offset.get());
    })
    .onUpdate((event) => {
      offset.set(start.get() - direction * event.translationX);
    })
    .onEnd((event) => {
      offset.set(withDecay({ velocity: -direction * event.velocityX, deceleration: 0.995 }));
    })
    .onFinalize(() => {
      dragging.set(false);
      hold.set(RESUME_AFTER_MS);
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={{ height: HEIGHT }} className="overflow-hidden">
        {slots.map((action, slot) => (
          <Action
            key={`${action.label}:${slot}`}
            action={action}
            slot={slot}
            offset={offset}
            length={length}
            viewport={width}
            hidden={slot >= ACTIONS.length}
          />
        ))}
      </View>
    </GestureDetector>
  );
}
