import { useEffect } from "react";
import { View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";

import type { TasbihTheme } from "@/core/tasbih/tasbihData";

/*
 * The adhan screen's picture: a mosque drawn in the screen theme's accent, with sound waves rising from
 * both minarets while the adhan plays, so the screen reads as "the adhan is being raised now". The waves
 * stop with the adhan; with reduced motion they hold still instead.
 */

const VIEW_W = 300;
const VIEW_H = 270;
/** The minarets' crescents, in viewBox units: the waves rise from here. */
const SOURCES = [
  { x: 51, y: 58 },
  { x: 249, y: 58 },
] as const;
const WAVES = 3;
const WAVE_MS = 2400;
/** A wave's largest radius, in viewBox units. */
const WAVE_R = 56;

/** One rising wave: an upward arc that grows from the crescent and fades out. */
function Wave({
  progress,
  size,
  color,
  still,
  index,
}: {
  progress: SharedValue<number>;
  size: number;
  color: string;
  still: boolean;
  index: number;
}) {
  const style = useAnimatedStyle(() => {
    if (still) return { opacity: 0.75 - index * 0.2, transform: [{ scale: 0.45 + index * 0.27 }] };
    const p = progress.get();
    return { opacity: interpolate(p, [0, 0.2, 1], [0, 0.85, 0]), transform: [{ scale: 0.3 + 0.7 * p }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", width: size, height: size }, style]}>
      <Svg viewBox="-50 -50 100 100" width={size} height={size}>
        {/* Upward arc from 160° to 20°, around the crescent. */}
        <Path d="M -44 -16 A 47 47 0 0 1 44 -16" stroke={color} strokeWidth={4} strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
}

function useWaveProgress(index: number, playing: boolean, reduce: boolean) {
  const progress = useSharedValue(0);
  useEffect(() => {
    if (!playing || reduce) {
      cancelAnimation(progress);
      progress.set(0);
      return;
    }
    progress.set(0);
    progress.set(
      withDelay((index * WAVE_MS) / WAVES, withRepeat(withTiming(1, { duration: WAVE_MS, easing: Easing.out(Easing.quad) }), -1, false)),
    );
    return () => cancelAnimation(progress);
  }, [index, playing, progress, reduce]);
  return progress;
}

function Minaret({ x, color }: { x: number; color: string }) {
  return (
    <G>
      {/* Shaft, two balconies, the cone, and the crescent finial. */}
      <Rect x={x - 11} y={92} width={22} height={168} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={2} />
      <Rect x={x - 17} y={130} width={34} height={8} rx={2} fill={color} fillOpacity={0.55} />
      <Rect x={x - 15} y={186} width={30} height={7} rx={2} fill={color} fillOpacity={0.4} />
      <Path
        d={`M ${x - 11} 92 L ${x} 66 L ${x + 11} 92 Z`}
        fill={color}
        fillOpacity={0.55}
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path d={`M ${x} 50 A 8 8 0 0 0 ${x} 66 A 10 10 0 0 1 ${x} 50 Z`} fill={color} />
      <Path d={`M ${x - 4} 152 V 145 A 4 4 0 0 1 ${x + 4} 145 V 152 Z`} fill={color} fillOpacity={0.6} />
    </G>
  );
}

export function AdhanScene({ theme, playing }: { theme: TasbihTheme; playing: boolean }) {
  const { width } = useWindowDimensions();
  const reduce = useReducedMotion();
  const sceneW = Math.min(width - 40, 340);
  const sceneH = (sceneW * VIEW_H) / VIEW_W;
  const unit = sceneW / VIEW_W;
  const waveSize = WAVE_R * 2 * unit;
  const accent = theme.accent;
  const p0 = useWaveProgress(0, playing, reduce);
  const p1 = useWaveProgress(1, playing, reduce);
  const p2 = useWaveProgress(2, playing, reduce);
  const progress = [p0, p1, p2];

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={playing ? "مسجد يرتفع منه الأذان" : "مسجد"}
      style={{ width: sceneW, height: sceneH }}
    >
      <Svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width={sceneW} height={sceneH}>
        {/* A few quiet stars. */}
        {[
          [110, 30, 1.6],
          [190, 22, 1.3],
          [150, 48, 1.1],
          [86, 70, 1.2],
          [222, 84, 1.4],
        ].map(([cx, cy, r]) => (
          <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={theme.soft} />
        ))}
        <Minaret x={51} color={accent} />
        <Minaret x={249} color={accent} />
        {/* The prayer hall, its dome with a crescent, and the door and windows. */}
        <Rect x={78} y={172} width={144} height={88} fill={accent} fillOpacity={0.18} stroke={accent} strokeWidth={2} />
        <Path
          d="M 92 172 C 92 132 122 118 150 92 C 178 118 208 132 208 172 Z"
          fill={accent}
          fillOpacity={0.3}
          stroke={accent}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <Path d="M 150 92 V 80" stroke={accent} strokeWidth={2} />
        <Path d="M 150 64 A 8 8 0 0 0 150 80 A 10 10 0 0 1 150 64 Z" fill={accent} />
        <Path d="M 134 260 V 222 A 16 16 0 0 1 166 222 V 260 Z" fill={accent} fillOpacity={0.6} />
        {[100, 200].map((x) => (
          <Path key={x} d={`M ${x - 8} 230 V 206 A 8 8 0 0 1 ${x + 8} 206 V 230 Z`} fill={accent} fillOpacity={playing ? 0.75 : 0.45} />
        ))}
        <Rect x={0} y={259} width={VIEW_W} height={2} rx={1} fill={accent} fillOpacity={0.5} />
      </Svg>
      {playing &&
        SOURCES.map((source) => (
          <View
            key={source.x}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: source.x * unit - waveSize / 2,
              top: source.y * unit - waveSize / 2,
              width: waveSize,
              height: waveSize,
            }}
          >
            {progress.map((value, index) => (
              <Wave key={index} progress={value} size={waveSize} color={accent} still={reduce} index={index} />
            ))}
          </View>
        ))}
    </View>
  );
}
