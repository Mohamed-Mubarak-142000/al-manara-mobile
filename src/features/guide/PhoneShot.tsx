import { Image } from "expo-image";
import { ImageOff, Maximize2, X } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, { Easing, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeColor } from "@/theme/useThemeColor";

import { GUIDE_SHOTS } from "./shots";

/** Screenshots are phone portraits; the frame keeps that shape whatever the device that took them. */
const ASPECT = 9 / 19.5;

/** A screenshot in a phone-like frame; tap to see it full screen. */
export function PhoneShot({ shot, label, width = 200 }: { shot: string; label: string; width?: number }) {
  const source = GUIDE_SHOTS[shot];
  const [open, setOpen] = useState(false);
  const muted = useThemeColor("fg-muted");
  const onPrimary = useThemeColor("on-primary");
  const heroFg = useThemeColor("hero-fg");
  const insets = useSafeAreaInsets();

  if (!source) {
    // Users never see an empty frame: the step keeps its text only. Developers see what to capture.
    if (!__DEV__) return null;
    return (
      <View
        className="items-center justify-center gap-2 self-center rounded-[28px] border-2 border-dashed border-border bg-surface-alt px-3"
        style={{ width, aspectRatio: ASPECT }}
      >
        <ImageOff size={22} color={muted} />
        <Text className="text-center font-sans text-xs text-fg-muted">الصورة ناقصة</Text>
        <Text className="text-center font-sans-bold text-xs text-fg-muted" selectable>
          assets/images/guide/{shot}.png
        </Text>
      </View>
    );
  }

  return (
    <>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={`صورة توضيحية: ${label}`}
        accessibilityHint="كبّر الصورة"
        onPress={() => setOpen(true)}
        className="self-center"
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
      >
        <Animated.View
          entering={ZoomIn.duration(520).easing(Easing.bezier(0.22, 1, 0.36, 1))}
          className="overflow-hidden rounded-[28px] border-[6px] border-fg/90 bg-surface-alt shadow-card"
          style={{ width, aspectRatio: ASPECT }}
        >
          <Image source={source} style={{ flex: 1 }} contentFit="cover" contentPosition="top" transition={200} accessible={false} />
        </Animated.View>
        <View className="absolute bottom-3 left-3 size-8 items-center justify-center rounded-full bg-primary/90">
          <Maximize2 size={15} color={onPrimary} />
        </View>
      </Pressable>

      <Modal visible={open} animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <View className="flex-1 bg-emerald-night" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <View className="flex-row items-center gap-3 px-4 py-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="إغلاق"
              onPress={() => setOpen(false)}
              hitSlop={8}
              className="size-11 items-center justify-center rounded-2xl bg-white/15"
            >
              <X size={22} color={heroFg} />
            </Pressable>
            <Text className="flex-1 font-sans-bold text-base text-hero-fg" numberOfLines={1}>
              {label}
            </Text>
          </View>
          <Image source={source} style={{ flex: 1 }} contentFit="contain" accessible={false} />
        </View>
      </Modal>
    </>
  );
}
