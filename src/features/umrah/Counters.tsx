import * as Haptics from "expo-haptics";
import { Check, RotateCcw, Undo2 } from "lucide-react-native";
import { useEffect } from "react";
import { Alert, Text, View } from "react-native";
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

import { ROUNDS, isRamalRound, saiAtMarwa, setRounds } from "@/core/umrah/umrahState";
import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { useThemeColor } from "@/theme/useThemeColor";

import { updateUmrah, useUmrah } from "./umrahStore";

/*
 * The tawaf and sa'i counters (the website's features/umrah/Counters.tsx). The drawings use fixed
 * colours for the Kaaba, its gold band and the hills; the cards around them follow the theme.
 */

const ORDINALS = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع"];
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const EASE = Easing.bezier(0.45, 0, 0.25, 1);

/** The seven rounds: done ones ticked, the current one ringed in gold. */
function Pips({ count, tone }: { count: number; tone: "dark" | "light" }) {
  const onPrimary = useThemeColor("on-primary");
  return (
    <View
      accessibilityLabel={`أتممت ${toArabicDigits(count)} من ${toArabicDigits(ROUNDS)} أشواط`}
      className="flex-row justify-center gap-1.5"
    >
      {Array.from({ length: ROUNDS }, (_, index) => {
        const done = index < count;
        const current = index === count;
        return (
          <View
            key={index}
            className={`size-9 items-center justify-center rounded-full ${
              done
                ? "bg-primary"
                : current
                  ? "border-2 border-gold bg-accent-soft"
                  : tone === "dark"
                    ? "border border-white/25"
                    : "border border-border bg-surface"
            }`}
          >
            {done ? (
              <Check size={16} color={onPrimary} />
            ) : (
              <Text
                className={`font-sans-bold text-sm ${current ? "text-accent-strong" : tone === "dark" ? "text-white/70" : "text-fg-muted"}`}
              >
                {toArabicDigits(index + 1)}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

/** The shared controls: finish a round, undo one, start over. */
function Controls({ count, field, tone }: { count: number; field: "tawaf" | "sai"; tone: "dark" | "light" }) {
  const finished = count >= ROUNDS;
  const set = (value: number) => updateUmrah((current) => ({ ...current, [field]: setRounds(value) }));
  // On the dark tawaf card the quiet buttons need the light variant to stay readable.
  const quiet = tone === "dark" ? "light" : "ghost";

  function finishRound() {
    set(count + 1);
    // A firmer buzz on the seventh, so the hand knows without looking.
    if (count + 1 === ROUNDS) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }

  return (
    <View className="mt-5 gap-3">
      <Button
        variant={tone === "dark" ? "gold" : "primary"}
        size="lg"
        icon={finished ? Check : undefined}
        disabled={finished}
        onPress={finishRound}
      >
        {finished ? "اكتملت الأشواط السبعة" : `أتممت الشوط ${ORDINALS[count] ?? ""}`}
      </Button>
      <View className="flex-row justify-center gap-2">
        <Button variant={quiet} size="sm" icon={Undo2} disabled={count === 0} onPress={() => set(count - 1)}>
          تراجع شوطًا
        </Button>
        <Button
          variant={quiet}
          size="sm"
          icon={RotateCcw}
          disabled={count === 0}
          onPress={() =>
            Alert.alert("ابدأ من جديد", "تصفير العدّاد والبدء من الشوط الأول؟", [
              { text: "إلغاء", style: "cancel" },
              { text: "تصفير", style: "destructive", onPress: () => set(0) },
            ])
          }
        >
          ابدأ من جديد
        </Button>
      </View>
    </View>
  );
}

/** A label laid over the drawing at a point of its viewBox (SVG text would not shape Arabic reliably). */
function Label({ x, y, box, children, className }: { x: number; y: number; box: number; children: string; className: string }) {
  return (
    <Text
      className={`absolute w-28 text-center ${className}`}
      style={{ left: `${(x / box) * 100}%`, top: `${(y / box) * 100}%`, marginLeft: -56, marginTop: -10 }}
    >
      {children}
    </Text>
  );
}

/**
 * The tawaf from above: the Kaaba with its corners, the Hijr, and a pilgrim who goes once around
 * (counter-clockwise, the Kaaba on the left) for every round counted.
 */
export function TawafCounter() {
  const { tawaf: count } = useUmrah();
  const reduce = useReducedMotion();
  const finished = count >= ROUNDS;
  // Radians walked: one full turn, counter-clockwise from above, per round.
  const turned = useSharedValue(-2 * Math.PI * count);
  useEffect(() => {
    turned.set(reduce ? -2 * Math.PI * count : withTiming(-2 * Math.PI * count, { duration: 1600, easing: EASE }));
  }, [count, reduce, turned]);
  // The pilgrim starts at the Black Stone corner's line (south-east, 45° below the x axis in SVG).
  const pilgrim = useAnimatedProps(() => ({
    cx: 130 + 86 * Math.cos(Math.PI / 4 + turned.get()),
    cy: 130 + 86 * Math.sin(Math.PI / 4 + turned.get()),
  }));

  return (
    <View className="rounded-[28px] bg-hero p-5 shadow-lift">
      <View className="flex-row items-baseline justify-between gap-3">
        <Text accessibilityRole="header" className="font-sans-bold text-lg text-hero-fg">
          عدّاد الطواف
        </Text>
        <Text accessibilityLiveRegion="polite" className="font-sans text-sm text-white/70">
          {finished ? "تمّ الطواف" : `أنت في الشوط ${ORDINALS[count]}`}
        </Text>
      </View>

      <View
        accessible
        accessibilityLabel="الكعبة من أعلى، والطائف يدور حولها والكعبة عن يساره"
        className="mt-3 aspect-square w-full max-w-[304px] self-center"
      >
        <Svg viewBox="0 0 260 260" width="100%" height="100%">
          <Circle cx="130" cy="130" r="122" fill="rgba(255,255,255,0.06)" stroke="rgba(232,215,166,0.25)" />
          <Circle cx="130" cy="130" r="86" fill="none" stroke="rgba(232,215,166,0.35)" strokeDasharray="2 7" strokeLinecap="round" />
          {/* The direction of tawaf: down the left side, so counter-clockwise from above. */}
          <Path d="M 39 122 l 5 10 l 5 -10" fill="none" stroke="#cda23e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <Path
            d="M 221 138 l -5 -10 l -5 10"
            fill="none"
            stroke="#cda23e"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Hijr Ismail, the low half-circle wall on the north-west side: tawaf goes outside it. */}
          <Path d="M 102 97 A 30 30 0 0 1 158 97" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="3" strokeLinecap="round" />
          <Rect x="98" y="98" width="64" height="64" rx="3" fill="#000000" />
          <Rect x="98" y="113" width="64" height="6" fill="#cda23e" />
          {/* The Black Stone corner, where every round starts and ends, with its start line. */}
          <Line x1="162" y1="162" x2="214" y2="214" stroke="#cda23e" strokeWidth="2" strokeDasharray="4 4" />
          <Circle cx="162" cy="162" r="6" fill="#3a2a1a" stroke="#cda23e" strokeWidth="2" />
          {/* The Yemeni corner. */}
          <Circle cx="98" cy="162" r="4" fill="rgba(255,255,255,0.85)" />
          <AnimatedCircle r="9" fill="#cda23e" stroke="#ffffff" strokeWidth="3" animatedProps={pilgrim} />
        </Svg>
        <Label x={214} y={236} box={260} className="font-sans-bold text-[11px] text-gold-soft">
          الحجر الأسود
        </Label>
        <Label x={58} y={200} box={260} className="font-sans-bold text-[11px] text-white/85">
          الركن اليماني
        </Label>
        <Label x={130} y={60} box={260} className="font-sans text-[10px] text-white/60">
          حِجْر إسماعيل
        </Label>
      </View>

      <View className="mt-2">
        <Pips count={count} tone="dark" />
      </View>

      <View accessibilityLiveRegion="polite" className="mt-4 rounded-2xl bg-white/10 p-4">
        {finished ? (
          <Text className="font-sans text-sm leading-7 text-hero-fg">
            أتممت الطواف، تقبّل الله منك. غطِّ كتفك الأيمن واتجه إلى مقام إبراهيم لتصلّي ركعتين.
          </Text>
        ) : (
          <>
            <Text className="font-sans text-sm leading-7 text-hero-fg">
              {isRamalRound(count) ? "شوط رَمَل للرجال: أسرع مشيك مع مقاربة الخطى." : "امشِ مشيًا عاديًا في هذا الشوط."} وكلما حاذيت الحجر
              الأسود فأشر إليه وقل: «الله أكبر».
            </Text>
            <Text className="mt-1 font-sans text-sm leading-7 text-gold-soft">
              بين الركن اليماني والحجر الأسود: ﴿رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً…﴾
            </Text>
          </>
        )}
      </View>

      <Controls count={count} field="tawaf" tone="dark" />
    </View>
  );
}

/**
 * The sa'i as a path between the two hills, with the green-lit stretch where men hurry; the pilgrim
 * crosses to the other hill for every round counted. Safa is on the right, where the Arabic reader starts.
 */
export function SaiCounter() {
  const { sai: count } = useUmrah();
  const reduce = useReducedMotion();
  const track = useThemeColor("primary");
  const finished = count >= ROUNDS;
  const atMarwa = saiAtMarwa(count);
  const x = useSharedValue(atMarwa ? 46 : 274);
  useEffect(() => {
    const target = atMarwa ? 46 : 274;
    x.set(reduce ? target : withTiming(target, { duration: 1200, easing: EASE }));
  }, [atMarwa, reduce, x]);
  const walker = useAnimatedProps(() => ({ cx: x.get() }));

  return (
    <View className="rounded-[28px] border border-accent/40 bg-accent-soft p-5">
      <View className="flex-row items-baseline justify-between gap-3">
        <Text accessibilityRole="header" className="font-sans-bold text-lg text-fg">
          عدّاد السعي
        </Text>
        <Text accessibilityLiveRegion="polite" className="shrink font-sans text-sm text-fg-muted">
          {finished ? "تمّ السعي عند المروة" : `الشوط ${ORDINALS[count]}: ${atMarwa ? "من المروة إلى الصفا" : "من الصفا إلى المروة"}`}
        </Text>
      </View>

      <View accessible accessibilityLabel="المسعى بين الصفا والمروة" className="mt-3 w-full" style={{ aspectRatio: 320 / 130 }}>
        <Svg viewBox="0 0 320 130" width="100%" height="100%">
          <Path d="M 236 92 Q 270 34 312 92 Z" fill="#d8c08a" />
          <Path d="M 8 92 Q 50 40 84 92 Z" fill="#d8c08a" />
          <Line x1="70" y1="92" x2="250" y2="92" stroke={track} strokeOpacity={0.35} strokeWidth="10" strokeLinecap="round" />
          <Rect x="134" y="84" width="52" height="16" rx="8" fill="#3fbf6f" fillOpacity={0.85} />
          <AnimatedCircle cy="74" r="10" fill="#cda23e" stroke="#ffffff" strokeWidth="3" animatedProps={walker} />
        </Svg>
        <SaiLabel x={160} className="font-sans text-[10px] text-fg-muted">
          العلَمان الأخضران
        </SaiLabel>
        <SaiLabel x={274} className="font-sans-bold text-[13px] text-fg">
          الصفا
        </SaiLabel>
        <SaiLabel x={46} className="font-sans-bold text-[13px] text-fg">
          المروة
        </SaiLabel>
      </View>

      <View className="mt-2">
        <Pips count={count} tone="light" />
      </View>

      <Text accessibilityLiveRegion="polite" className="mt-4 rounded-2xl bg-surface p-4 font-sans text-sm leading-7 text-fg">
        {finished
          ? "أتممت السعي، تقبّل الله منك. بقي الحلق أو التقصير لتتمّ عمرتك."
          : count === 0
            ? "اصعد الصفا واقرأ الآية، ثم استقبل الكعبة وكبّر وادعُ، وانطلق إلى المروة."
            : `على ${atMarwa ? "المروة" : "الصفا"} الآن: استقبل الكعبة وكبّر وادعُ كما فعلت أول مرة، ثم انطلق.`}
      </Text>

      <Controls count={count} field="sai" tone="light" />
    </View>
  );
}

/** A label under the sa'i drawing, at an x of its 320-wide viewBox. */
function SaiLabel({ x, children, className }: { x: number; children: string; className: string }) {
  return (
    <Text className={`absolute w-28 text-center ${className}`} style={{ left: `${(x / 320) * 100}%`, top: "80%", marginLeft: -56 }}>
      {children}
    </Text>
  );
}
