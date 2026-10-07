import * as Haptics from "expo-haptics";
import Storage from "expo-sqlite/kv-store";
import { Sparkles, Star } from "lucide-react-native";
import { useEffect } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import type { DuaCategory } from "@/core/adhkar/duasData";
import { Button } from "@/components/ui/Button";
import { useThemeColor } from "@/theme/useThemeColor";

/** The sections worth celebrating: a whole daily set (not one chapter of the general adhkar). */
export const CELEBRATED: readonly DuaCategory[] = ["morning", "evening", "after-prayer", "sleep", "waking"];

const COPY: Partial<Record<DuaCategory, { title: string; body: string }>> = {
  morning: { title: "أتممت أذكار الصباح", body: "بارك الله في يومك، وجعلك في حفظه ورعايته حتى تمسي." },
  evening: { title: "أتممت أذكار المساء", body: "تقبّل الله منك، وجعل ليلتك في حفظه وأمانه." },
  "after-prayer": { title: "أتممت أذكار الصلاة", body: "تقبّل الله صلاتك وذكرك، وجعلها نورًا لك." },
  sleep: { title: "أتممت أذكار النوم", body: "نم في حفظ الله ورعايته، وأصبحت على خير." },
  waking: { title: "أتممت أذكار الاستيقاظ", body: "الحمد لله الذي أحياك، بداية مباركة ليومك." },
};

const KEY = "al-manara:adhkar-celebrated:v1";
const today = () => new Date().toDateString();

/** Once a day per section: resetting the counters and finishing again doesn't celebrate twice. */
export function claimCelebration(category: DuaCategory): boolean {
  if (!CELEBRATED.includes(category)) return false;
  try {
    const saved = JSON.parse(Storage.getItemSync(KEY) ?? "null") as { day: string; done: DuaCategory[] } | null;
    const done = saved?.day === today() ? saved.done : [];
    if (done.includes(category)) return false;
    Storage.setItemSync(KEY, JSON.stringify({ day: today(), done: [...done, category] }));
  } catch {
    // Celebrate anyway; worst case it shows again.
  }
  return true;
}

/** A gold star that drifts up and fades, around the medal. */
function Spark({ x, delay, size }: { x: number; delay: number; size: number }) {
  const gold = useThemeColor("gold-soft");
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withDelay(delay, withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1, false)));
  }, [delay, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.get(),
    transform: [{ translateX: x * progress.get() }, { translateY: -70 * progress.get() }, { scale: 0.6 + progress.get() * 0.6 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={style} className="absolute">
      <Star size={size} color={gold} fill={gold} />
    </Animated.View>
  );
}

function Medal() {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.set(withRepeat(withSequence(withTiming(1.08, { duration: 700 }), withTiming(1, { duration: 700 })), -1, false));
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.get() }] }));
  return (
    <View className="h-36 items-center justify-center">
      {[
        { x: -70, delay: 0, size: 14 },
        { x: 60, delay: 300, size: 18 },
        { x: -30, delay: 650, size: 12 },
        { x: 85, delay: 900, size: 12 },
        { x: -90, delay: 1200, size: 16 },
      ].map((spark, index) => (
        <Spark key={index} {...spark} />
      ))}
      <Animated.View style={style} className="size-24 items-center justify-center rounded-full border-2 border-gold/50 bg-gold/15 shadow-gold">
        <View className="size-18 items-center justify-center rounded-full bg-gold">
          <Sparkles size={36} color="#012a22" />
        </View>
      </Animated.View>
    </View>
  );
}

/** "أحسنت!" after finishing a whole daily set of adhkar. */
export function AdhkarCelebration({ category, onClose }: { category: DuaCategory | null; onClose: () => void }) {
  const copy = category ? COPY[category] : undefined;
  useEffect(() => {
    if (copy) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [copy]);

  return (
    <Modal visible={!!copy} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(200)} className="flex-1 items-center justify-center bg-black/60 px-6">
        <Pressable accessibilityLabel="إغلاق" onPress={onClose} className="absolute inset-0" />
        {copy && (
          <Animated.View
            entering={ZoomIn.springify().damping(14)}
            accessibilityRole="alert"
            className="w-full max-w-sm items-center rounded-4xl bg-hero px-6 pb-6 pt-4 shadow-lift"
          >
            <Medal />
            <Text className="font-sans-bold text-sm text-gold-soft">أحسنت! ما شاء الله</Text>
            <Text className="mt-1 text-center font-display-bold text-2xl text-hero-fg">{copy.title}</Text>
            <Text className="mt-3 text-center font-sans text-base leading-7 text-white/80">{copy.body}</Text>
            <Text className="mt-3 text-center font-quran-fallback text-lg leading-9 text-gold-soft">
              ﴿فَاذْكُرُونِي أَذْكُرْكُمْ﴾
            </Text>
            <Button className="mt-5 self-stretch" variant="gold" size="lg" onPress={onClose}>
              الحمد لله
            </Button>
          </Animated.View>
        )}
      </Animated.View>
    </Modal>
  );
}
