import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { PanResponder, Pressable, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { useThemeColor } from "@/theme/useThemeColor";

import { APP_SECTIONS, SECTION_GROUPS, type AppSection } from "./sections";

const AUTO_MS = 5_000;
const GAP = 12;

function SectionSquare({ section, size }: { section: AppSection; size: number }) {
  const primary = useThemeColor("primary");
  const Icon = section.icon;
  const href = section.href;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={href ? () => router.push(href) : undefined}
      style={({ pressed }) => ({ width: size, height: size, transform: [{ scale: pressed ? 0.97 : 1 }] })}
    >
      <View className="flex-1 justify-between rounded-3xl border border-border bg-surface p-4 shadow-soft">
        <View className="flex-row items-start justify-between">
          <View className="size-12 items-center justify-center rounded-2xl bg-primary-soft">
            <Icon size={24} color={primary} />
          </View>
          {!href && (
            <View className="rounded-full bg-accent-soft px-2 py-0.5">
              <Text className="font-sans-bold text-[10px] text-accent-strong">قريبًا</Text>
            </View>
          )}
        </View>
        <View>
          <Text numberOfLines={1} className="font-display-bold text-base text-fg">
            {section.label}
          </Text>
          <Text numberOfLines={2} className="mt-1 font-sans text-xs leading-5 text-fg-muted">
            {section.description}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

/** The sections in groups of four equal squares; the slider turns by itself, by swipe, or by the group chips. */
export function SectionGrid() {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = SECTION_GROUPS.length;

  const slides = useMemo(
    () =>
      SECTION_GROUPS.map((group) => ({
        title: group.title,
        sections: group.labels.map((label) => APP_SECTIONS.find((section) => section.label === label)).filter((s) => s !== undefined),
      })),
    [],
  );

  // Next slide after a pause on each one; any change (auto, swipe or chip) restarts the wait.
  useEffect(() => {
    if (paused) return;
    const id = setTimeout(() => setIndex((current) => (current + 1) % count), AUTO_MS);
    return () => clearTimeout(id);
  }, [index, paused, count]);

  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderGrant: () => setPaused(true),
      onPanResponderRelease: (_, g) => {
        setPaused(false);
        if (Math.abs(g.dx) < 40) return;
        // Right to left reading: the next slide comes from the left, so a swipe to the right moves on.
        setIndex((current) => (current + (g.dx > 0 ? 1 : -1) + count) % count);
      },
      onPanResponderTerminate: () => setPaused(false),
    }),
  );

  const size = width > 0 ? (width - GAP) / 2 : 0;
  const slide = slides[index]!;

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <View className="mb-3 flex-row flex-wrap gap-2">
        {slides.map((item, i) => {
          const active = i === index;
          return (
            <Pressable
              key={item.title}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setIndex(i)}
              className={`rounded-full px-3.5 py-1.5 ${active ? "bg-primary" : "bg-primary-soft"}`}
            >
              <Text className={`font-sans-bold text-xs ${active ? "text-on-primary" : "text-primary"}`}>{item.title}</Text>
            </Pressable>
          );
        })}
      </View>

      {size > 0 && (
        // Always two rows tall, so a shorter group doesn't make the page jump.
        <View {...pan.panHandlers} style={{ height: size * 2 + GAP }}>
          <Animated.View key={index} entering={FadeIn.duration(450)} style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
            {slide.sections.map((section) => (
              <SectionSquare key={section.label} section={section} size={size} />
            ))}
          </Animated.View>
        </View>
      )}

      <View className="mt-3 flex-row justify-center gap-1.5">
        {slides.map((item, i) => (
          <View key={item.title} className={`h-1.5 rounded-full ${i === index ? "w-5 bg-gold" : "w-1.5 bg-border"}`} />
        ))}
      </View>
    </View>
  );
}
