import { memo, useEffect, useState } from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from "react-native-svg";

import { getRewardItem } from "@/core/kids/catalog";
import { companionInfo } from "@/core/kids/companionLines";
import type { CompanionAnimal } from "@/lib/database.types";

/**
 * The website's Companion.tsx: one shared rig, four animals, with the worn items layered on — the same SVG
 * drawn with react-native-svg. The body's framer-motion loop (bob, wiggle, jump) runs on the wrapping view.
 */

export type CompanionMood = "idle" | "happy" | "cheer" | "thinking" | "sleepy";

interface Palette {
  fur: string;
  dark: string;
  belly: string;
  inner: string;
}

const PALETTES: Record<CompanionAnimal, Palette> = {
  bear: { fur: "#b9824f", dark: "#7a4e2a", belly: "#f1d7b3", inner: "#e2a77a" },
  panda: { fur: "#ffffff", dark: "#2f2f3a", belly: "#ffffff", inner: "#ffb3c7" },
  rabbit: { fur: "#f4ecf2", dark: "#8b6f80", belly: "#ffffff", inner: "#ffa9c6" },
  fox: { fur: "#f2873a", dark: "#7b3a12", belly: "#fff6ec", inner: "#ffd2ae" },
};

const INK = "#2b2230";

function Ears({ animal, palette }: { animal: CompanionAnimal; palette: Palette }) {
  if (animal === "rabbit")
    return (
      <G>
        <Ellipse cx="74" cy="0" rx="15" ry="42" fill={palette.fur} stroke={palette.dark} strokeWidth="3" transform="rotate(-10 74 0)" />
        <Ellipse cx="74" cy="4" rx="7" ry="30" fill={palette.inner} transform="rotate(-10 74 4)" />
        <Ellipse cx="126" cy="0" rx="15" ry="42" fill={palette.fur} stroke={palette.dark} strokeWidth="3" transform="rotate(10 126 0)" />
        <Ellipse cx="126" cy="4" rx="7" ry="30" fill={palette.inner} transform="rotate(10 126 4)" />
      </G>
    );
  if (animal === "fox")
    return (
      <G stroke={palette.dark} strokeWidth="3" strokeLinejoin="round">
        <Path d="M48 58 L58 4 L98 36 Z" fill={palette.fur} />
        <Path d="M60 46 L63 18 L84 36 Z" fill={palette.dark} stroke="none" />
        <Path d="M152 58 L142 4 L102 36 Z" fill={palette.fur} />
        <Path d="M140 46 L137 18 L116 36 Z" fill={palette.dark} stroke="none" />
      </G>
    );
  const earFill = animal === "panda" ? palette.dark : palette.fur;
  return (
    <G stroke={palette.dark} strokeWidth="3">
      <Circle cx="56" cy="36" r="19" fill={earFill} />
      <Circle cx="144" cy="36" r="19" fill={earFill} />
      {animal === "bear" && (
        <>
          <Circle cx="56" cy="36" r="9" fill={palette.inner} stroke="none" />
          <Circle cx="144" cy="36" r="9" fill={palette.inner} stroke="none" />
        </>
      )}
    </G>
  );
}

function Eyes({ mood, animal, palette, blink }: { mood: CompanionMood; animal: CompanionAnimal; palette: Palette; blink: boolean }) {
  const patches = animal === "panda" && (
    <G fill={palette.dark}>
      <Ellipse cx="78" cy="82" rx="15" ry="19" transform="rotate(-25 78 82)" />
      <Ellipse cx="122" cy="82" rx="15" ry="19" transform="rotate(25 122 82)" />
    </G>
  );
  const pupil = animal === "panda" ? "#ffffff" : INK;
  if (mood === "happy" || mood === "cheer")
    return (
      <G>
        {patches}
        <Path d="M70 84 Q79 72 88 84" fill="none" stroke={pupil} strokeWidth="5" strokeLinecap="round" />
        <Path d="M112 84 Q121 72 130 84" fill="none" stroke={pupil} strokeWidth="5" strokeLinecap="round" />
      </G>
    );
  if (mood === "sleepy")
    return (
      <G>
        {patches}
        <Path d="M70 82 Q79 88 88 82" fill="none" stroke={pupil} strokeWidth="5" strokeLinecap="round" />
        <Path d="M112 82 Q121 88 130 82" fill="none" stroke={pupil} strokeWidth="5" strokeLinecap="round" />
      </G>
    );
  const lookY = mood === "thinking" ? 76 : 81;
  return (
    <G>
      {patches}
      {blink ? (
        <G>
          <Path d={`M72 ${lookY} L86 ${lookY}`} stroke={pupil} strokeWidth="4" strokeLinecap="round" />
          <Path d={`M114 ${lookY} L128 ${lookY}`} stroke={pupil} strokeWidth="4" strokeLinecap="round" />
        </G>
      ) : (
        <G>
          <Circle cx="79" cy={lookY} r="7" fill={pupil} />
          <Circle cx="121" cy={lookY} r="7" fill={pupil} />
          <Circle cx="81.5" cy={lookY - 2.5} r="2.4" fill={animal === "panda" ? INK : "#ffffff"} />
          <Circle cx="123.5" cy={lookY - 2.5} r="2.4" fill={animal === "panda" ? INK : "#ffffff"} />
        </G>
      )}
    </G>
  );
}

function Mouth({ mood, animal }: { mood: CompanionMood; animal: CompanionAnimal }) {
  return (
    <G>
      <Ellipse cx="100" cy="97" rx="7" ry="5" fill={INK} />
      {mood === "cheer" ? (
        <Path d="M88 105 Q100 124 112 105 Z" fill="#c2304f" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      ) : mood === "thinking" ? (
        <Circle cx="104" cy="110" r="4" fill="none" stroke={INK} strokeWidth="3" />
      ) : (
        <Path d="M90 104 Q95 111 100 104 Q105 111 110 104" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      )}
      {animal === "rabbit" && mood !== "cheer" && (
        <Rect x="96" y="106" width="8" height="8" rx="2" fill="#ffffff" stroke={INK} strokeWidth="2" />
      )}
    </G>
  );
}

function BackItems({ equipped }: { equipped: string[] }) {
  return (
    <G>
      {equipped.includes("cape") && (
        <Path d="M58 128 Q100 120 142 128 L158 214 Q100 226 42 214 Z" fill="#e84a67" stroke="#a52640" strokeWidth="3" />
      )}
      {equipped.includes("backpack") && (
        <G stroke="#7a4e2a" strokeWidth="3">
          <Rect x="132" y="138" width="40" height="54" rx="12" fill="#f5b92e" />
          <Rect x="140" y="160" width="24" height="16" rx="5" fill="#ffd66b" />
        </G>
      )}
    </G>
  );
}

const FLOWERS: [number, number, string][] = [
  [60, 44, "#ff8fb1"],
  [78, 30, "#ffd66b"],
  [100, 25, "#ff8fb1"],
  [122, 30, "#9ad7ff"],
  [140, 44, "#ffd66b"],
];

function FrontItems({ equipped }: { equipped: string[] }) {
  return (
    <G>
      {equipped.includes("scarf") && (
        <G stroke="#1f6f9e" strokeWidth="3" strokeLinejoin="round">
          <Path d="M62 126 Q100 142 138 126 L138 140 Q100 156 62 140 Z" fill="#1f9be0" />
          <Path d="M116 142 L128 176 L112 178 L106 146 Z" fill="#1f9be0" />
        </G>
      )}
      {equipped.includes("bowtie") && (
        <G stroke="#a52640" strokeWidth="3" strokeLinejoin="round" fill="#e84a67">
          <Path d="M100 136 L80 126 L80 148 Z" />
          <Path d="M100 136 L120 126 L120 148 Z" />
          <Circle cx="100" cy="137" r="5" />
        </G>
      )}
      {equipped.includes("glasses") && (
        <G fill="rgba(255,255,255,0.35)" stroke="#2b2230" strokeWidth="3.5">
          <Circle cx="79" cy="81" r="15" />
          <Circle cx="121" cy="81" r="15" />
          <Path d="M94 80 Q100 75 106 80" fill="none" />
        </G>
      )}
      {equipped.includes("cap") && (
        <G stroke="#a52640" strokeWidth="3" strokeLinejoin="round">
          <Path d="M54 52 Q100 -2 146 52 Z" fill="#e84a67" />
          <Path d="M100 52 Q140 44 172 56 Q140 64 100 58 Z" fill="#c9304f" />
          <Circle cx="100" cy="22" r="6" fill="#ffd66b" />
        </G>
      )}
      {equipped.includes("crown") && (
        <G stroke="#b07a00" strokeWidth="3" strokeLinejoin="round">
          <Path d="M64 42 L64 12 L82 28 L100 4 L118 28 L136 12 L136 42 Z" fill="#f5c542" />
          <Circle cx="100" cy="30" r="5" fill="#e84a67" stroke="none" />
          <Circle cx="78" cy="34" r="4" fill="#1f9be0" stroke="none" />
          <Circle cx="122" cy="34" r="4" fill="#12a15b" stroke="none" />
        </G>
      )}
      {equipped.includes("flower-crown") && (
        <G>
          {FLOWERS.map(([x, y, color]) => (
            <G key={x}>
              <Circle cx={x} cy={y} r="9" fill={color} stroke="#ffffff" strokeWidth="2" />
              <Circle cx={x} cy={y} r="3.5" fill="#f5a623" />
            </G>
          ))}
        </G>
      )}
    </G>
  );
}

/** Eyes close for a moment every few seconds (the website's scaleY blink). */
function useBlink(active: boolean): boolean {
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (!active) return;
    let close: ReturnType<typeof setTimeout> | null = null;
    const id = setInterval(() => {
      setBlink(true);
      close = setTimeout(() => setBlink(false), 140);
    }, 3550);
    return () => {
      clearInterval(id);
      if (close) clearTimeout(close);
    };
  }, [active]);
  return blink;
}

/** The website's BODY_MOTION per mood, as a loop on the wrapping view. */
function useBodyMotion(mood: CompanionMood) {
  const reduceMotion = useReducedMotion();
  const y = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(1);
  useEffect(() => {
    cancelAnimation(y);
    cancelAnimation(rotate);
    cancelAnimation(scale);
    y.value = 0;
    rotate.value = 0;
    scale.value = 1;
    if (reduceMotion) return;
    const ease = Easing.inOut(Easing.ease);
    if (mood === "idle")
      y.value = withRepeat(
        withSequence(withTiming(-4, { duration: 1300, easing: ease }), withTiming(0, { duration: 1300, easing: ease })),
        -1,
      );
    if (mood === "sleepy")
      y.value = withRepeat(
        withSequence(withTiming(2, { duration: 1700, easing: ease }), withTiming(0, { duration: 1700, easing: ease })),
        -1,
      );
    if (mood === "happy") {
      y.value = withRepeat(
        withSequence(withTiming(-6, { duration: 450, easing: ease }), withTiming(0, { duration: 450, easing: ease })),
        -1,
      );
      rotate.value = withRepeat(
        withSequence(withTiming(-4, { duration: 225 }), withTiming(4, { duration: 450 }), withTiming(0, { duration: 225 })),
        -1,
      );
    }
    if (mood === "cheer") {
      y.value = withRepeat(
        withSequence(withTiming(-26, { duration: 300, easing: Easing.out(Easing.ease) }), withTiming(0, { duration: 300 })),
        -1,
      );
      scale.value = withRepeat(withSequence(withTiming(1.05, { duration: 300 }), withTiming(1, { duration: 300 })), -1);
    }
    if (mood === "thinking")
      rotate.value = withRepeat(
        withSequence(
          withTiming(-6, { duration: 900, easing: ease }),
          withTiming(-6, { duration: 1200 }),
          withTiming(0, { duration: 900, easing: ease }),
        ),
        -1,
      );
  }, [mood, reduceMotion, y, rotate, scale]);
  return useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { rotate: `${rotate.value}deg` }, { scale: scale.value }],
  }));
}

interface CompanionProps {
  animal: CompanionAnimal;
  equipped?: string[];
  mood?: CompanionMood;
  width: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/** The child's companion: one shared rig, four animals, with the worn items layered on. */
export const Companion = memo(function Companion({ animal, equipped = [], mood = "idle", width, height, style }: CompanionProps) {
  const palette = PALETTES[animal];
  const worn = equipped.filter((id) => getRewardItem(id)?.kind === "companion");
  const stroke = palette.dark;
  const blink = useBlink(mood === "idle" || mood === "thinking");
  const motion = useBodyMotion(mood);
  const body = animal === "panda" ? palette.dark : palette.fur;
  const leftArm = mood === "cheer" ? 140 : 20;
  const rightArm = mood === "cheer" ? -140 : mood === "thinking" ? -150 : -20;
  const h = height ?? (width * 270) / 200;
  return (
    <Animated.View
      style={[{ width, height: h }, style, motion]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={companionInfo(animal).name}
    >
      <Svg width={width} height={h} viewBox="0 -46 200 270">
        <BackItems equipped={worn} />
        {animal === "fox" && (
          <G stroke={stroke} strokeWidth="3" strokeLinejoin="round">
            <Path d="M136 196 Q196 190 184 130 Q176 160 140 170 Z" fill={palette.fur} />
            <Path d="M184 130 Q192 150 178 160 Q172 146 184 130 Z" fill="#ffffff" />
          </G>
        )}
        {animal === "rabbit" && <Circle cx="146" cy="196" r="13" fill="#ffffff" stroke={stroke} strokeWidth="3" />}
        <Ellipse cx="100" cy="172" rx="50" ry="46" fill={body} stroke={stroke} strokeWidth="3" />
        <Ellipse cx="100" cy="180" rx="32" ry="30" fill={palette.belly} />
        <Ellipse cx="76" cy="214" rx="18" ry="11" fill={body} stroke={stroke} strokeWidth="3" />
        <Ellipse cx="124" cy="214" rx="18" ry="11" fill={body} stroke={stroke} strokeWidth="3" />
        <Ellipse cx="54" cy="164" rx="13" ry="24" fill={body} stroke={stroke} strokeWidth="3" transform={`rotate(${leftArm} 60 146)`} />
        <Ellipse cx="146" cy="164" rx="13" ry="24" fill={body} stroke={stroke} strokeWidth="3" transform={`rotate(${rightArm} 140 146)`} />
        <Ears animal={animal} palette={palette} />
        <Circle cx="100" cy="82" r="56" fill={palette.fur} stroke={stroke} strokeWidth="3" />
        {animal === "fox" && <Path d="M48 92 Q70 126 100 112 Q130 126 152 92 Q130 108 100 100 Q70 108 48 92 Z" fill={palette.belly} />}
        <Ellipse cx="100" cy="103" rx="22" ry="15" fill={animal === "fox" || animal === "bear" ? palette.belly : "#ffffff"} />
        <Circle cx="64" cy="100" r="8" fill="#ff8fa8" opacity={0.55} />
        <Circle cx="136" cy="100" r="8" fill="#ff8fa8" opacity={0.55} />
        <Eyes mood={mood} animal={animal} palette={palette} blink={blink} />
        <Mouth mood={mood} animal={animal} />
        {mood === "sleepy" && (
          <SvgText x="150" y="30" fontSize="26" fontWeight="800" fill="#7a5af5">
            z
          </SvgText>
        )}
        <FrontItems equipped={worn} />
      </Svg>
    </Animated.View>
  );
});
