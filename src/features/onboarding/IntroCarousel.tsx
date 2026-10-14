import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronRight } from "lucide-react-native";
import { useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import { I18nManager, Pressable, Text, View, useWindowDimensions, type ImageSourcePropType } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { Button } from "@/components/ui/Button";
import { PagerDot } from "@/components/ui/Pager";
import { introButtonLabel } from "@/features/onboarding/steps";
import { useThemeColor } from "@/theme/useThemeColor";

interface Slide {
  key: string;
  caption: string;
  /** Locally bundled artwork for instant, offline onboarding. */
  photo: ImageSourcePropType;
}

const SLIDES: Slide[] = [
  { key: "quran", caption: "اقرأ القرآن، واستمع لأجمل التلاوات", photo: require("@/assets/images/onboarding/quran.jpg") },
  { key: "kids", caption: "حديقة القرآن… لأطفالك", photo: require("@/assets/images/onboarding/kids.jpg") },
  { key: "sections", caption: "مواقيت، وأذكار، وإذاعة… في مكان واحد", photo: require("@/assets/images/onboarding/sections.jpg") },
];

function SlideCard({ slide }: { slide: Slide }) {
  const night = useThemeColor("emerald-night");
  return (
    <View className="flex-1 gap-5">
      <View className="flex-1 overflow-hidden rounded-[32px] bg-surface-alt">
        <Image source={slide.photo} contentFit="cover" style={{ position: "absolute", inset: 0 }} accessible={false} />
        <LinearGradient colors={["transparent", night]} locations={[0.65, 1]} style={{ position: "absolute", inset: 0, opacity: 0.25 }} />
      </View>
      <Text className="px-4 text-center font-sans-bold text-xl leading-9 text-fg">{slide.caption}</Text>
    </View>
  );
}

/** How much of the neighbouring cards shows on each side, and the space between cards. */
const PEEK = 22;
const GAP = 12;
const SNAP = { damping: 22, stiffness: 190, mass: 0.9 };

interface CardsHandle {
  goTo(index: number): void;
}

/**
 * The cards side by side with the neighbours peeking in at the edges, moved by a finger or the buttons
 * and settling with a spring. Built on transforms rather than a scroll view, so RTL needs no offset
 * mirroring: the first card sits at the reading start, the next ones follow towards the end.
 */
function PeekCards({
  height,
  still,
  onIndexChange,
  ref,
}: {
  height: number;
  still: boolean;
  onIndexChange: (index: number) => void;
  ref?: Ref<CardsHandle>;
}) {
  const { width } = useWindowDimensions();
  const cardWidth = width - 2 * (PEEK + GAP);
  const span = cardWidth + GAP;
  const last = SLIDES.length - 1;
  const direction = I18nManager.isRTL ? -1 : 1;
  const position = useSharedValue(0);
  const start = useSharedValue(0);
  const current = useSharedValue(0);

  const settle = (target: number, velocity = 0) => {
    "worklet";
    current.set(target);
    position.set(still ? target * span : withSpring(target * span, { ...SNAP, velocity }));
    scheduleOnRN(onIndexChange, target);
  };

  // The buttons run on the JS thread, so they move the cards directly rather than through the worklet.
  useImperativeHandle(ref, () => ({
    goTo: (index) => {
      const target = Math.min(Math.max(index, 0), last);
      current.set(target);
      position.set(still ? target * span : withSpring(target * span, SNAP));
      onIndexChange(target);
    },
  }));

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-16, 16])
    .onBegin(() => {
      cancelAnimation(position);
      start.set(position.get());
    })
    .onUpdate((event) => {
      // Past either end the cards resist, so the edge is felt rather than hit.
      const raw = start.get() - direction * event.translationX;
      const over = raw < 0 ? raw : raw > last * span ? raw - last * span : 0;
      position.set(raw - over * 0.65);
    })
    .onEnd((event) => {
      const velocity = -direction * event.velocityX;
      const moved = position.get() - current.get() * span;
      // One card per swipe: a short quick flick counts as much as a long drag.
      const step = Math.abs(moved) > span * 0.22 || Math.abs(velocity) > 500 ? Math.sign(moved || velocity) : 0;
      settle(Math.min(Math.max(current.get() + step, 0), last), velocity);
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={{ height }} className="overflow-hidden">
        {SLIDES.map((slide, slot) => (
          <PeekCard key={slide.key} slot={slot} span={span} width={cardWidth} height={height} position={position} direction={direction}>
            <SlideCard slide={slide} />
          </PeekCard>
        ))}
      </View>
    </GestureDetector>
  );
}

function PeekCard({
  slot,
  span,
  width,
  height,
  position,
  direction,
  children,
}: {
  slot: number;
  span: number;
  width: number;
  height: number;
  position: SharedValue<number>;
  direction: number;
  children: ReactNode;
}) {
  // The card in front is full size; its neighbours sit a touch smaller and softer.
  const style = useAnimatedStyle(() => {
    const offset = slot * span - position.get();
    const distance = Math.min(Math.abs(offset) / span, 1);
    return {
      opacity: 1 - distance * 0.35,
      transform: [{ translateX: direction * (offset + PEEK + GAP) }, { scale: 1 - distance * 0.08 }],
    };
  });
  return <Animated.View style={[{ position: "absolute", top: 0, start: 0, width, height }, style]}>{children}</Animated.View>;
}

interface IntroCarouselProps {
  reduceMotion: boolean;
  onDone: () => void;
  onSkip: () => void;
}

/** First run: a welcome with the logo, three picture cards of a line each, and "التالي" / "ابدأ". */
export function IntroCarousel({ reduceMotion, onDone, onSkip }: IntroCarouselProps) {
  const insets = useSafeAreaInsets();
  const primary = useThemeColor("primary");
  const pager = useRef<CardsHandle>(null);
  const [index, setIndex] = useState(0);
  const [height, setHeight] = useState(0);
  const last = index === SLIDES.length - 1;

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}>
      <View className="flex-row items-center px-5">
        <View className="w-12" />
        <View className="flex-1 items-center gap-1">
          <Text className="font-sans text-sm text-fg-muted">مرحبًا بك في</Text>
          <Image
            source={require("@/assets/images/brand/logo.png")}
            style={{ width: 52, height: 52 }}
            contentFit="contain"
            accessibilityLabel="المنارة"
          />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="تخطَّ" onPress={onSkip} hitSlop={12} className="w-12 items-end py-2">
          <Text className="font-sans-bold text-sm text-fg-muted">تخطَّ</Text>
        </Pressable>
      </View>

      <View className="mt-4 flex-1" style={{ minHeight: 0 }} onLayout={(event) => setHeight(Math.floor(event.nativeEvent.layout.height))}>
        {height > 0 && (
          <View className="gap-3">
            {/* The dots sit under the cards, inside the measured area. */}
            <PeekCards ref={pager} height={height - 18} still={reduceMotion} onIndexChange={setIndex} />
            <View className="flex-row justify-center gap-1.5" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {SLIDES.map((slide, dot) => (
                <PagerDot key={slide.key} tone="primary" active={dot === index} />
              ))}
            </View>
          </View>
        )}
      </View>

      <View className="mt-5 flex-row items-center gap-3 px-5">
        {index > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="السابق"
            onPress={() => pager.current?.goTo(index - 1)}
            className="size-13 items-center justify-center rounded-xl bg-primary-soft"
          >
            <ChevronRight size={22} color={primary} />
          </Pressable>
        )}
        <Button size="lg" className="flex-1" onPress={() => (last ? onDone() : pager.current?.goTo(index + 1))}>
          {introButtonLabel(index, SLIDES.length)}
        </Button>
      </View>
    </View>
  );
}
