import { Image } from "expo-image";
import { useIsFocused } from "expo-router";
import Storage from "expo-sqlite/kv-store";
import { ExternalLink, HandHeart } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, AppState, FlatList, Linking, Text, View, type ViewToken } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { useTextScale } from "@/theme/textScale";
import { useThemeColor } from "@/theme/useThemeColor";

import {
  createAutoAdvance,
  dayKey,
  liveSponsors,
  nextIndex,
  parseSponsorCache,
  type AutoAdvance,
  type SponsorItem,
} from "./SponsorRotation";

const CACHE_KEY = "al-manara:sponsors:v1";
const INTERVAL_MS = 5000;
const RESUME_AFTER_MS = 3000;
const VIEWABILITY = { itemVisiblePercentThreshold: 60 };

function readCache(): SponsorItem[] {
  try {
    return liveSponsors(parseSponsorCache(Storage.getItemSync(CACHE_KEY)), dayKey(new Date()));
  } catch {
    return [];
  }
}

function writeCache(sponsors: SponsorItem[]) {
  try {
    if (sponsors.length) Storage.setItemSync(CACHE_KEY, JSON.stringify(sponsors));
    else Storage.removeItemSync(CACHE_KEY);
  } catch {
    // The next launch just waits for the network.
  }
}

/** The running sponsors: the last list straight away (also offline), then a fresh one from Supabase. */
function useSponsors(): SponsorItem[] {
  const [sponsors, setSponsors] = useState<SponsorItem[]>(readCache);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from("sponsors")
        .select("id, name, message, link_url, logo_url, starts_on, ends_on")
        .order("starts_on", { ascending: false })
        .limit(5);
      // A failed request keeps what is cached; a successful empty one means the campaigns ended.
      if (cancelled || error || !data) return;
      const live = liveSponsors(data, dayKey(new Date()));
      writeCache(live);
      setSponsors(live);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return sponsors;
}

function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => alive && setReduce(value))
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);
  return reduce;
}

function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => setActive(state === "active"));
    return () => subscription.remove();
  }, []);
  return active;
}

function openLink(url: string) {
  Linking.openURL(url).catch(() => {});
}

/** Height of the sponsor's image band at the top of the card. */
const IMAGE_HEIGHT = 170;

/**
 * One sponsor: the image across the top (shown whole, never cropped), then the full name, the message,
 * and a button when it links somewhere.
 */
function SponsorSlide({ sponsor, height }: { sponsor: SponsorItem; height?: number }) {
  const accent = useThemeColor("accent-strong");
  const link = sponsor.link_url;
  return (
    <View
      style={height ? { height } : undefined}
      className={`${height ? "flex-1 " : ""}overflow-hidden rounded-3xl border border-border bg-surface shadow-soft`}
    >
      <View className="items-center justify-center overflow-hidden bg-accent-soft" style={{ height: IMAGE_HEIGHT }}>
        {sponsor.logo_url ? (
          <>
            {/* A portrait photo left empty bands on both sides: the same image, blurred and filling the
                band, sits behind the uncropped one. */}
            <Image
              source={{ uri: sponsor.logo_url }}
              style={{ position: "absolute", width: "100%", height: "100%", opacity: 0.55 }}
              contentFit="cover"
              blurRadius={24}
              accessible={false}
            />
            <Image
              source={{ uri: sponsor.logo_url }}
              style={{ width: "100%", height: "100%" }}
              contentFit="contain"
              transition={200}
              accessibilityIgnoresInvertColors
              accessibilityLabel={sponsor.name}
            />
          </>
        ) : (
          <HandHeart size={56} color={accent} />
        )}
      </View>
      <View className="flex-1 gap-1.5 p-4">
        <Text className="font-display-bold text-lg leading-8 text-fg" numberOfLines={2}>
          {sponsor.name}
        </Text>
        <Text className="font-sans text-sm leading-6 text-fg-muted" numberOfLines={height ? 2 : undefined}>
          {sponsor.message}
        </Text>
        {link ? (
          <View className="mt-auto pt-2">
            <Button
              size="sm"
              variant="gold"
              icon={ExternalLink}
              accessibilityLabel={`زيارة ${sponsor.name}`}
              onPress={() => openLink(link)}
            >
              زيارة الراعي
            </Button>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Dot({ active }: { active: boolean }) {
  const progress = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, { duration: 300 });
  }, [active, progress]);
  const box = useAnimatedStyle(() => ({ width: 6 + progress.value * 14 }));
  const fill = useAnimatedStyle(() => ({ opacity: progress.value }));
  return (
    <Animated.View className="h-1.5 overflow-hidden rounded-full bg-border" style={box}>
      <Animated.View className="absolute inset-0 rounded-full bg-gold" style={fill} />
    </Animated.View>
  );
}

/** Two or more sponsors: paged, auto-advancing every few seconds, paused while touched or out of view. */
function SponsorPager({ sponsors }: { sponsors: SponsorItem[] }) {
  const textScale = useTextScale();
  // Image band + two-line name + two-line message + the button, grown with the text size.
  const height = IMAGE_HEIGHT + Math.round(190 * Math.max(1, textScale));
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<SponsorItem>>(null);
  const indexRef = useRef(0);
  const countRef = useRef(sponsors.length);
  const timer = useRef<AutoAdvance | null>(null);

  const focused = useIsFocused();
  const appActive = useAppActive();
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    const controller = createAutoAdvance({
      intervalMs: INTERVAL_MS,
      resumeAfterMs: RESUME_AFTER_MS,
      blocked: ["unmeasured"],
      onAdvance: () => {
        const next = nextIndex(indexRef.current, countRef.current);
        indexRef.current = next;
        setIndex(next);
        listRef.current?.scrollToIndex({ index: next, animated: true });
      },
    });
    timer.current = controller;
    return () => {
      controller.dispose();
      timer.current = null;
    };
  }, []);

  useEffect(() => {
    timer.current?.update({
      unmeasured: width <= 0,
      single: sponsors.length < 2,
      unfocused: !focused,
      background: !appActive,
      reduceMotion,
    });
  }, [width, sponsors.length, focused, appActive, reduceMotion]);

  useEffect(() => {
    countRef.current = sponsors.length;
  }, [sponsors.length]);

  // FlatList measures in its own (RTL-aware) coordinates, so the visible item comes from viewability
  // rather than from a raw scroll offset, which Android reports mirrored in RTL.
  // Stable for the list's lifetime: FlatList does not accept a new callback after mount.
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken<SponsorItem>[] }) => {
    const visible = viewableItems.find((item) => item.isViewable && item.index !== null);
    if (visible?.index == null) return;
    indexRef.current = visible.index;
    setIndex(visible.index);
  }, []);

  const getItemLayout = useCallback(
    (_: ArrayLike<SponsorItem> | null | undefined, itemIndex: number) => ({ length: width, offset: width * itemIndex, index: itemIndex }),
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
            data={sponsors}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            initialNumToRender={sponsors.length}
            getItemLayout={getItemLayout}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={VIEWABILITY}
            onScrollBeginDrag={touchStart}
            onScrollEndDrag={touchEnd}
            onScrollToIndexFailed={({ index: failed }) => listRef.current?.scrollToOffset({ offset: failed * width, animated: true })}
            renderItem={({ item }) => (
              <View style={{ width, height }}>
                <SponsorSlide sponsor={item} height={height} />
              </View>
            )}
          />
        )}
      </View>
      <View className="flex-row justify-center gap-1.5" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {sponsors.map((sponsor, dotIndex) => (
          <Dot key={sponsor.id} active={dotIndex === (index < sponsors.length ? index : sponsors.length - 1)} />
        ))}
      </View>
    </View>
  );
}

/**
 * The sponsors added from the website's admin (/admin/sponsors), on the home screen above the
 * sections. RLS returns only the ones running today; the last list is cached so it shows offline and
 * without a flash. Nothing renders when there are none. Never shown on Quran or kids screens.
 */
export function SponsorCarousel({ className }: { className?: string }) {
  const sponsors = useSponsors();
  if (!sponsors.length) return null;
  return (
    <View className={`gap-2 ${className ?? ""}`}>
      <Text className="font-sans-bold text-xs text-fg-muted">برعاية</Text>
      {sponsors.length === 1 ? <SponsorSlide sponsor={sponsors[0]} /> : <SponsorPager sponsors={sponsors} />}
    </View>
  );
}

/** The home screen's original name for this section. */
export const SponsorCard = SponsorCarousel;
