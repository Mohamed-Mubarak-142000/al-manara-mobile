import { Image } from "expo-image";
import { router, type Href } from "expo-router";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from "react-native-reanimated";

import type { LastRead } from "@/features/mushaf/readerPrefs";

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

function Action({ action, index, scrollX, viewport }: { action: QuickAction; index: number; scrollX: SharedValue<number>; viewport: number }) {
  // Each tile grows a touch as it reaches the middle of the screen and settles back as it leaves: the strip
  // breathes as it is swiped, without any bounce.
  const style = useAnimatedStyle(() => {
    const centre = index * SPAN + ITEM / 2 + 16 - scrollX.get();
    const distance = Math.abs(centre - viewport / 2);
    const scale = interpolate(distance, [0, viewport / 2], [1.06, 0.92], Extrapolation.CLAMP);
    const opacity = interpolate(distance, [0, viewport / 2 + ITEM], [1, 0.7], Extrapolation.CLAMP);
    return { opacity, transform: [{ scale }] };
  });
  return (
    <Animated.View style={[{ width: ITEM }, style]}>
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

/** A full-width strip of shortcuts, swiped sideways, each with its 3D art. */
export function QuickActions() {
  const { width } = useWindowDimensions();
  // RTL lays the row from the right; the offset is measured from there too, so the maths is the same.
  const scrollX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.set(event.contentOffset.x);
  });
  return (
    <Animated.ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      decelerationRate="fast"
      snapToInterval={SPAN}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: GAP }}
    >
      {ACTIONS.map((action, index) => (
        <Action key={action.label} action={action} index={index} scrollX={scrollX} viewport={width} />
      ))}
    </Animated.ScrollView>
  );
}
