import { useIsFocused } from "expo-router";
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import { FlatList, View, type ViewToken } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { createAutoAdvance, nextIndex, type AutoAdvance } from "@/features/home/SponsorRotation";
import { useAppActive, useReduceMotion } from "@/lib/screenState";

const RESUME_AFTER_MS = 3000;
const VIEWABILITY = { itemVisiblePercentThreshold: 60 };
/** How long the glide onto the looped copy of the first page takes before the silent jump back. */
const LOOP_SETTLE_MS = 500;

export interface PagerHandle {
  goTo(index: number): void;
}

interface PagerProps<T> {
  data: readonly T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  height: number;
  /** Advances one page every `autoplayMs`; off when left out. */
  autoplayMs?: number;
  /** After the last page, glides on to the first instead of rewinding across every page. */
  loop?: boolean;
  /** Space kept on each side of a page, so neighbouring cards never touch while swiping. */
  gutter?: number;
  dots?: "gold" | "primary" | false;
  onIndexChange?: (index: number) => void;
  /** The page it opens on, without scrolling there. */
  initialIndex?: number;
  ref?: Ref<PagerHandle>;
}

export function PagerDot({ active, tone }: { active: boolean; tone: "gold" | "primary" }) {
  const progress = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    progress.set(withTiming(active ? 1 : 0, { duration: 300, easing: Easing.bezier(0.22, 1, 0.36, 1) }));
  }, [active, progress]);
  const box = useAnimatedStyle(() => ({ width: 6 + progress.get() * 14 }));
  const fill = useAnimatedStyle(() => ({ opacity: progress.get() }));
  return (
    <Animated.View className="h-1.5 overflow-hidden rounded-full bg-border" style={box}>
      <Animated.View className={`absolute inset-0 rounded-full ${tone === "gold" ? "bg-gold" : "bg-primary"}`} style={fill} />
    </Animated.View>
  );
}

/**
 * Full-width pages that move exactly one at a time. The current page comes from viewability, not a raw
 * scroll offset (Android reports offsets mirrored in RTL). Autoplay pauses while touched, off screen, in
 * the background, or with reduce motion on.
 */
export function Pager<T>({
  data,
  keyExtractor,
  renderItem,
  height,
  autoplayMs,
  loop = false,
  gutter = 0,
  dots = "primary",
  onIndexChange,
  initialIndex = 0,
  ref,
}: PagerProps<T>) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(initialIndex);
  const listRef = useRef<FlatList<T>>(null);
  const indexRef = useRef(initialIndex);
  const count = data.length;
  const countRef = useRef(count);
  const looping = loop && count > 1;
  const loopingRef = useRef(looping);
  const timer = useRef<AutoAdvance | null>(null);
  const loopJump = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onIndexChangeRef = useRef(onIndexChange);

  const focused = useIsFocused();
  const appActive = useAppActive();
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    countRef.current = count;
    loopingRef.current = looping;
    onIndexChangeRef.current = onIndexChange;
  });

  // The pages, plus a copy of the first one at the end when looping.
  const pages = looping ? [...data, data[0]] : data;

  const scrollTo = useCallback((target: number, animated = true) => {
    listRef.current?.scrollToIndex({ index: target, animated });
  }, []);

  useImperativeHandle(ref, () => ({ goTo: (target) => scrollTo(Math.min(Math.max(target, 0), countRef.current - 1)) }), [scrollTo]);

  useEffect(() => {
    if (!autoplayMs) return;
    const controller = createAutoAdvance({
      intervalMs: autoplayMs,
      resumeAfterMs: RESUME_AFTER_MS,
      blocked: ["unmeasured"],
      onAdvance: () => {
        const current = indexRef.current;
        scrollTo(loopingRef.current ? current + 1 : nextIndex(current, countRef.current));
      },
    });
    timer.current = controller;
    return () => {
      controller.dispose();
      timer.current = null;
    };
  }, [autoplayMs, scrollTo]);

  useEffect(() => {
    timer.current?.update({
      unmeasured: width <= 0,
      single: count < 2,
      unfocused: !focused,
      background: !appActive,
      reduceMotion,
    });
  }, [width, count, focused, appActive, reduceMotion]);

  useEffect(
    () => () => {
      if (loopJump.current) clearTimeout(loopJump.current);
    },
    [],
  );

  // Stable for the list's lifetime: FlatList does not accept a new callback after mount.
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<T>[] }) => {
      const visible = viewableItems.find((item) => item.isViewable && item.index !== null);
      if (visible?.index == null) return;
      let current = visible.index;
      if (loopingRef.current && current >= countRef.current) {
        // On the copy of the first page: once the glide settles, swap to the real one without animation.
        current = 0;
        if (loopJump.current) clearTimeout(loopJump.current);
        loopJump.current = setTimeout(() => {
          loopJump.current = null;
          scrollTo(0, false);
        }, LOOP_SETTLE_MS);
      }
      indexRef.current = current;
      setIndex(current);
      onIndexChangeRef.current?.(current);
    },
    [scrollTo],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<T> | null | undefined, itemIndex: number) => ({ length: width, offset: width * itemIndex, index: itemIndex }),
    [width],
  );

  const touchStart = () => timer.current?.touchStart();
  const touchEnd = () => timer.current?.touchEnd();

  return (
    <View className="gap-3">
      <View
        style={{ height }}
        onLayout={(event) => setWidth(Math.round(event.nativeEvent.layout.width))}
        onTouchStart={touchStart}
        onTouchEnd={touchEnd}
        onTouchCancel={touchEnd}
      >
        {width > 0 && (
          <FlatList
            ref={listRef}
            data={pages}
            keyExtractor={(item, itemIndex) => (itemIndex >= count ? `${keyExtractor(item)}:loop` : keyExtractor(item))}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            initialNumToRender={Math.min(pages.length, 4)}
            initialScrollIndex={initialIndex || undefined}
            getItemLayout={getItemLayout}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={VIEWABILITY}
            onScrollBeginDrag={touchStart}
            onScrollEndDrag={touchEnd}
            onScrollToIndexFailed={({ index: failed }) => listRef.current?.scrollToOffset({ offset: failed * width, animated: true })}
            renderItem={({ item, index: itemIndex }) => (
              <View style={{ width, height, paddingHorizontal: gutter }}>{renderItem(item, itemIndex % count)}</View>
            )}
          />
        )}
      </View>
      {dots && count > 1 ? (
        <View className="flex-row justify-center gap-1.5" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {data.map((item, dotIndex) => (
            <PagerDot key={keyExtractor(item)} tone={dots} active={dotIndex === Math.min(index, count - 1)} />
          ))}
        </View>
      ) : null}
    </View>
  );
}
