import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronRight } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View, type ImageSourcePropType } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Pager, type PagerHandle } from "@/components/ui/Pager";
import { SECTION_ART, type SectionArt } from "@/features/home/sectionArt";
import { introButtonLabel } from "@/features/onboarding/steps";
import { useThemeColor } from "@/theme/useThemeColor";

interface Slide {
  key: string;
  caption: string;
  /** A photo filling the card; without one the card shows the sections' 3D art on emerald. */
  photo?: ImageSourcePropType;
}

const SLIDES: Slide[] = [
  { key: "quran", caption: "اقرأ القرآن، واستمع لأجمل التلاوات", photo: require("@/assets/images/scenes/quran-terrace.webp") },
  { key: "kids", caption: "حديقة القرآن… لأطفالك", photo: require("@/assets/images/scenes/garden.jpg") },
  { key: "sections", caption: "مواقيت، وأذكار، وإذاعة… في مكان واحد" },
];

/** The 3D art scattered over the last card: where each sits (in % of the card), its size, and its delay. */
const COLLAGE: { art: SectionArt; top: `${number}%`; left: `${number}%`; size: number; delay: number }[] = [
  { art: "quran", top: "14%", left: "34%", size: 110, delay: 0 },
  { art: "adhan", top: "8%", left: "8%", size: 64, delay: 400 },
  { art: "tasbih", top: "40%", left: "64%", size: 72, delay: 800 },
  { art: "prayer", top: "46%", left: "10%", size: 68, delay: 200 },
  { art: "radio", top: "66%", left: "40%", size: 70, delay: 600 },
  { art: "hadith", top: "10%", left: "70%", size: 56, delay: 1000 },
];

/** A picture that bobs gently up and down, each on its own beat. */
function FloatingArt({ art, size, delay, still }: { art: SectionArt; size: number; delay: number; still: boolean }) {
  const lift = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    lift.set(withDelay(delay, withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true)));
  }, [delay, lift, still]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -10 * lift.get() }] }));
  return (
    <Animated.View style={style}>
      <Image source={SECTION_ART[art]} style={{ width: size, height: size }} contentFit="contain" accessible={false} />
    </Animated.View>
  );
}

function SlideCard({ slide, still }: { slide: Slide; still: boolean }) {
  const deep = useThemeColor("emerald-deep");
  const night = useThemeColor("emerald-night");
  return (
    <View className="flex-1 gap-5">
      <View className="flex-1 overflow-hidden rounded-[32px] bg-emerald-night">
        {slide.photo ? (
          <>
            <Image source={slide.photo} contentFit="cover" style={{ position: "absolute", inset: 0 }} accessible={false} />
            <LinearGradient
              colors={["transparent", "rgba(1,42,34,0.55)"]}
              locations={[0.55, 1]}
              style={{ position: "absolute", inset: 0 }}
            />
          </>
        ) : (
          <>
            <LinearGradient colors={[deep, night]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={{ position: "absolute", inset: 0 }} />
            <View className="absolute -end-12 -top-12 size-48 rounded-full bg-gold/15" />
            <View className="absolute -bottom-16 -start-10 size-44 rounded-full bg-gold/10" />
            {COLLAGE.map((item) => (
              <View key={item.art} style={{ position: "absolute", top: item.top, left: item.left }}>
                <FloatingArt art={item.art} size={item.size} delay={item.delay} still={still} />
              </View>
            ))}
          </>
        )}
      </View>
      <Text className="px-4 text-center font-sans-bold text-xl leading-9 text-fg">{slide.caption}</Text>
    </View>
  );
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
  const pager = useRef<PagerHandle>(null);
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
          <Pager
            ref={pager}
            data={SLIDES}
            keyExtractor={(slide) => slide.key}
            // The dots sit under the pages, inside the measured area.
            height={height - 18}
            gutter={20}
            onIndexChange={setIndex}
            renderItem={(slide) => <SlideCard slide={slide} still={reduceMotion} />}
          />
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
