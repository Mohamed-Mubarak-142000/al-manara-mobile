import Storage from "expo-sqlite/kv-store";
import { usePathname } from "expo-router";
import { BellOff, Sparkles, X } from "lucide-react-native";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AppState, Pressable, Text, View } from "react-native";
import Animated, { Easing, FadeInUp, FadeOutUp, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TOAST_ADHKAR, type ToastDhikr } from "@/core/adhkar/toastAdhkar";
import { useBackgroundStatus } from "@/features/notifications/backgroundReminderStatus";

/** In-app fallback; Android's native overlay owns delivery when enabled. */
const INTERVAL_MS = 10 * 60_000;
/** How often the gap since the last card is checked; a card still shows only once per INTERVAL_MS. */
const CHECK_MS = 30_000;
const VISIBLE_MS = 5_000;
const KEY = "al-manara:adhkar-toast:v1";
/** When the last card showed, so reopening the app doesn't bring one straight back. */
const LAST_SHOWN_KEY = "al-manara:adhkar-toast:last-shown:v1";

function writeLastShown(at: number) {
  try {
    Storage.setItemSync(LAST_SHOWN_KEY, String(at));
  } catch {
    // Lasts for this session only.
  }
}

/** The first run seeds "now", so the first card waits a full interval. */
function readLastShown(): number {
  try {
    const saved = Number(Storage.getItemSync(LAST_SHOWN_KEY));
    if (Number.isFinite(saved) && saved > 0) return saved;
  } catch {
    // Seeded below.
  }
  const now = Date.now();
  writeLastShown(now);
  return now;
}

/** Reading, reciting, exams and the player are never interrupted (the website skips its mushaf reader). */
const SUPPRESSED = /^\/(mushaf|tasmee|exams\/|player|repeat|onboarding|login|register|verify)/;

const listeners = new Set<() => void>();
let enabled: boolean | null = null;

function readEnabled(): boolean {
  if (enabled !== null) return enabled;
  try {
    enabled = Storage.getItemSync(KEY) !== "off";
  } catch {
    enabled = true;
  }
  return enabled;
}

export function setAdhkarToastEnabled(value: boolean) {
  enabled = value;
  try {
    Storage.setItemSync(KEY, value ? "on" : "off");
  } catch {
    // Lasts for this session only.
  }
  listeners.forEach((listener) => listener());
}

export function useAdhkarToastEnabled(): boolean {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, readEnabled);
}

/** The thin gold bar that runs down while the card is showing. */
function Countdown() {
  const progress = useSharedValue(1);
  useEffect(() => {
    progress.set(withTiming(0, { duration: VISIBLE_MS, easing: Easing.linear }));
  }, [progress]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.get() }] }));
  return <Animated.View style={style} className="absolute inset-x-0 bottom-0 h-0.5 bg-gold" />;
}

/** Mounted once in the root layout, above every screen. */
export function AdhkarToaster() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const on = useAdhkarToastEnabled();
  const { status } = useBackgroundStatus();
  const [current, setCurrent] = useState<ToastDhikr | null>(null);
  const index = useRef(-1);
  const suppressed = SUPPRESSED.test(pathname) || status?.overlayEnabled === true;

  useEffect(() => {
    if (!on || suppressed) return;
    // A random starting dhikr, then in order (the website does the same).
    if (index.current < 0) index.current = Math.floor(Math.random() * TOAST_ADHKAR.length);
    let lastShown = readLastShown();
    const tick = setInterval(() => {
      // Only while the app is on screen, like the website's visibility check.
      if (AppState.currentState !== "active") return;
      const hour = new Date().getHours();
      if (hour < 7 || hour >= 22) return;
      const now = Date.now();
      if (now - lastShown < INTERVAL_MS) return;
      lastShown = now;
      writeLastShown(now);
      index.current = (index.current + 1) % TOAST_ADHKAR.length;
      setCurrent(TOAST_ADHKAR[index.current] ?? null);
    }, CHECK_MS);
    return () => clearInterval(tick);
  }, [on, suppressed]);

  useEffect(() => {
    if (!current) return;
    const id = setTimeout(() => setCurrent(null), VISIBLE_MS);
    return () => clearTimeout(id);
  }, [current]);

  if (!current || !on || suppressed) return null;

  return (
    <Animated.View
      key={current.id}
      entering={FadeInUp.duration(320)}
      exiting={FadeOutUp.duration(220)}
      pointerEvents="box-none"
      className="absolute inset-x-3"
      style={{ top: insets.top + 8 }}
    >
      <View accessibilityRole="alert" className="overflow-hidden rounded-3xl border border-gold/30 bg-emerald-deep p-4 shadow-lift">
        <View className="flex-row gap-3">
          <Sparkles size={18} color="#cda23e" />
          <View className="flex-1">
            <Text className="font-sans-bold text-xs text-gold-soft">ذكّر قلبك</Text>
            <Text className="mt-1 font-quran-fallback text-lg leading-9 text-white">{current.text}</Text>
            <Text className="mt-0.5 font-sans text-xs text-white/60">{current.source}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setAdhkarToastEnabled(false)}
              hitSlop={8}
              className="mt-2 flex-row items-center gap-1.5 self-start"
            >
              <BellOff size={13} color="rgba(255,255,255,0.6)" />
              <Text className="font-sans text-xs text-white/60">إيقاف التذكير</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="إغلاق"
            onPress={() => setCurrent(null)}
            hitSlop={10}
            className="size-8 items-center justify-center"
          >
            <X size={16} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>
        <Countdown />
      </View>
    </Animated.View>
  );
}
