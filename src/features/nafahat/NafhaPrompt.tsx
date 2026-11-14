import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useIsFocused } from "expo-router";
import { Play, Sparkles } from "lucide-react-native";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Text, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { enterSoft } from "@/components/ui/PageHeader";
import { useUpdatePromptOpen } from "@/features/appUpdate/AppUpdatePrompt";
import { useAppActive } from "@/lib/screenState";
import { useThemeColor } from "@/theme/useThemeColor";

import { NAFAHAT_TITLE, fetchLatestNafha, lastSeenNafha, markNafhaSeen, type Nafha } from "./nafahatApi";

const logo = require("@/assets/images/brand/logo.png");
/** A moment after Home appears, so the sheet doesn't land on top of the first frame. */
const SHOW_AFTER_MS = 900;

// Whether the sheet is up, so SetupPrompt waits instead of stacking on it.
let open = false;
const listeners = new Set<() => void>();
function setOpen(value: boolean) {
  if (open === value) return;
  open = value;
  listeners.forEach((listener) => listener());
}
export function useNafhaPromptOpen(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => open,
  );
}

/**
 * On Home: the newest "نفحة" the user hasn't seen yet, as an inviting sheet. "افتح النفحة" opens the channel,
 * "لاحقًا" puts this one away for good (the next post brings the sheet back). An app update offer goes first.
 */
export function NafhaPrompt() {
  const focused = useIsFocused();
  const active = useAppActive();
  const updateOpen = useUpdatePromptOpen();
  const night = useThemeColor("emerald-night");
  const deep = useThemeColor("emerald-deep");
  const goldSoft = useThemeColor("gold-soft");
  const [nafha, setNafha] = useState<Nafha | null>(null);
  const [due, setDue] = useState(false);

  // Checked on launch and whenever the app comes back to the front.
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    fetchLatestNafha()
      .then((latest) => {
        if (!cancelled && latest && latest.id !== lastSeenNafha()) setNafha(latest);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [active]);

  useEffect(() => {
    if (!nafha) return;
    const id = setTimeout(() => setDue(true), SHOW_AFTER_MS);
    return () => clearTimeout(id);
  }, [nafha]);

  const visible = !!nafha && due && focused && !updateOpen;
  useEffect(() => {
    setOpen(visible);
    return () => setOpen(false);
  }, [visible]);

  if (!nafha) return null;

  const close = () => {
    markNafhaSeen(nafha.id);
    setNafha(null);
    setDue(false);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      secondary={{ label: "لاحقًا", onPress: close }}
      primary={{
        label: "افتح النفحة",
        onPress: () => {
          close();
          router.push("/nafahat");
        },
      }}
    >
      <View accessibilityRole="alert" className="gap-4">
        <LinearGradient
          colors={[night, deep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 24, padding: 18, overflow: "hidden" }}
        >
          <View className="absolute -left-10 -top-12 size-40 rounded-full bg-gold/25" />
          <View className="flex-row items-center gap-3">
            <Animated.View
              entering={ZoomIn.springify().damping(12).delay(120)}
              className="size-14 items-center justify-center rounded-2xl bg-ivory"
            >
              <Image source={logo} style={{ width: 38, height: 38 }} contentFit="contain" accessible={false} />
            </Animated.View>
            <View className="flex-1 gap-1.5">
              <Text className="font-display-bold text-xl text-white">{NAFAHAT_TITLE}</Text>
              <View className="flex-row self-start items-center gap-1 rounded-full bg-gold/25 px-2.5 py-0.5">
                <Sparkles size={13} color={goldSoft} />
                <Text className="font-sans-bold text-xs text-gold-soft">نفحة جديدة</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {nafha.media_url ? (
          <Animated.View entering={enterSoft(1)} className="overflow-hidden rounded-2xl bg-emerald-night">
            {nafha.media_type === "image" ? (
              <Image
                source={{ uri: nafha.media_url }}
                style={{ width: "100%", height: 180 }}
                contentFit="cover"
                transition={200}
                accessible={false}
              />
            ) : (
              <View className="h-40 items-center justify-center">
                <View className="size-16 items-center justify-center rounded-full bg-white/90">
                  <Play size={28} color={deep} fill={deep} />
                </View>
                <Text className="mt-2 font-sans-bold text-xs text-white/80">مقطع فيديو</Text>
              </View>
            )}
          </Animated.View>
        ) : null}

        <Animated.View entering={enterSoft(2)} className="gap-1.5">
          <Text className="font-sans-bold text-xl leading-9 text-fg">{nafha.title}</Text>
          {nafha.body ? (
            <Text className="font-sans text-base leading-7 text-fg-muted" numberOfLines={4}>
              {nafha.body}
            </Text>
          ) : null}
        </Animated.View>
      </View>
    </BottomSheet>
  );
}
