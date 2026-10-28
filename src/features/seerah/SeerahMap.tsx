import { memo, useEffect, useState, type ComponentType } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, G, Path, Rect, type GProps } from "react-native-svg";

import {
  MAP,
  PLACES,
  ROUTES,
  frameAround,
  project,
  routePoints,
  type Frame,
  type PlaceId,
  type RouteId,
  type Stage,
} from "@/core/seerah/seerahContent";
import { useThemeColor, withAlpha } from "@/theme/useThemeColor";

/*
 * The website's SeerahMap. The camera glides between the frames each beat names; the land moves as one
 * transformed group, while routes, lights and names are placed in screen pixels on the UI thread, so
 * they keep their size at every zoom (Makkah to Thawr is thirty times closer than all of Arabia).
 */

// The native group takes its transform as `matrix` (a, b, c, d, e, f); G's public props leave it out.
const AnimatedG = Animated.createAnimatedComponent(G as unknown as ComponentType<GProps & { matrix?: number[] }>);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const EASE = Easing.bezier(0.65, 0, 0.35, 1);
const MOVE_MS = 1100;
const DRAW_MS = 1800;
const DOT = 9;
const LIT_DOT = 13;

export function stageFrame(stage: Extract<Stage, { kind: "map" }>): Frame {
  return frameAround(stage.focus, stage.span ?? 90);
}

/** Where the camera stands: the map point at the centre of the stage, and the zoom as a logarithm (so zooming feels even). */
interface Camera {
  cx: SharedValue<number>;
  cy: SharedValue<number>;
  zoom: SharedValue<number>;
  width: number;
  height: number;
}

/** The zoom that covers the stage with the frame, as the website's preserveAspectRatio "slice". */
function coverZoom(frame: Frame, width: number, height: number) {
  return Math.log(Math.max(width / frame.width, height / frame.height));
}

function toScreen(x: number, y: number, cx: number, cy: number, zoom: number, width: number, height: number) {
  "worklet";
  const scale = Math.exp(zoom);
  return { x: (x - cx) * scale + width / 2, y: (y - cy) * scale + height / 2 };
}

/** The land, drawn once and moved as a whole; its coast keeps a hairline at every zoom. */
const Land = memo(function Land({ camera, fill, stroke }: { camera: Camera; fill: string; stroke: string }) {
  const { cx, cy, zoom, width, height } = camera;
  // What React renders before the first animated frame arrives: the camera where it stands now.
  const [initial] = useState(() => ({ ...toScreen(0, 0, cx.get(), cy.get(), zoom.get(), width, height), scale: Math.exp(zoom.get()) }));
  const animatedProps = useAnimatedProps(() => {
    const scale = Math.exp(zoom.get());
    const origin = toScreen(0, 0, cx.get(), cy.get(), zoom.get(), width, height);
    return { matrix: [scale, 0, 0, scale, origin.x, origin.y] };
  });
  return (
    <AnimatedG animatedProps={animatedProps} x={initial.x} y={initial.y} scale={initial.scale}>
      <Path d={MAP.land} fill={fill} stroke={stroke} strokeWidth={1} vectorEffect="non-scaling-stroke" />
    </AnimatedG>
  );
});

/** A journey drawn up to `drawn` of its length, with a light travelling at its head. */
function Journey({ route, drawn, camera, color }: { route: RouteId; drawn: number; camera: Camera; color: string }) {
  const reduce = useReducedMotion();
  const share = useSharedValue(0);
  const { cx, cy, zoom, width, height } = camera;
  const points = routePoints(route);
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const lengths = points.map((point, index) =>
    index === 0 ? 0 : Math.hypot(point.x - points[index - 1]!.x, point.y - points[index - 1]!.y),
  );
  const total = lengths.reduce((sum, length) => sum + length, 0);

  useEffect(() => {
    share.set(reduce ? drawn : withTiming(drawn, { duration: DRAW_MS, easing: EASE }));
  }, [drawn, reduce, share]);

  const whole = useAnimatedProps(() => {
    let d = "";
    for (let index = 0; index < xs.length; index++) {
      const point = toScreen(xs[index]!, ys[index]!, cx.get(), cy.get(), zoom.get(), width, height);
      d += `${index === 0 ? "M" : "L"}${point.x} ${point.y}`;
    }
    return { d };
  });

  // The drawn part: every waypoint passed, then the point the share has reached on the next leg.
  const drawnLine = useDerivedValue(() => {
    let remaining = share.get() * total;
    const first = toScreen(xs[0]!, ys[0]!, cx.get(), cy.get(), zoom.get(), width, height);
    let d = `M${first.x} ${first.y}`;
    let end = first;
    for (let index = 1; index < xs.length && remaining > 0; index++) {
      const t = Math.min(1, remaining / (lengths[index]! || 1));
      end = toScreen(
        xs[index - 1]! + (xs[index]! - xs[index - 1]!) * t,
        ys[index - 1]! + (ys[index]! - ys[index - 1]!) * t,
        cx.get(),
        cy.get(),
        zoom.get(),
        width,
        height,
      );
      d += `L${end.x} ${end.y}`;
      remaining -= lengths[index]!;
    }
    return { d, end };
  });

  const drawnPath = useAnimatedProps(() => ({ d: drawnLine.get().d }));
  const light = useAnimatedProps(() => ({
    cx: drawnLine.get().end.x,
    cy: drawnLine.get().end.y,
    opacity: share.get() > 0.001 && share.get() < 0.999 ? 1 : 0,
  }));
  const halo = useAnimatedProps(() => ({
    cx: drawnLine.get().end.x,
    cy: drawnLine.get().end.y,
    opacity: share.get() > 0.001 && share.get() < 0.999 ? 0.3 : 0,
  }));

  return (
    <G>
      <AnimatedPath animatedProps={whole} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="2 6" />
      <AnimatedPath animatedProps={drawnPath} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <AnimatedCircle animatedProps={halo} r={12} fill={color} />
      <AnimatedCircle animatedProps={light} r={5} fill={color} />
    </G>
  );
}

/** A place's light and name, laid over the map at its screen point. */
function PlaceMark({ id, camera, named, lit }: { id: PlaceId; camera: Camera; named: boolean; lit: boolean }) {
  const reduce = useReducedMotion();
  const place = PLACES[id];
  const point = project(place.lat, place.lon);
  const { cx, cy, zoom, width, height } = camera;
  const pulse = useSharedValue(0);
  const halo = useThemeColor("bg");

  useEffect(() => {
    pulse.set(lit && !reduce ? withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false) : 0);
  }, [lit, reduce, pulse]);

  const position = useAnimatedStyle(() => {
    const screen = toScreen(point.x, point.y, cx.get(), cy.get(), zoom.get(), width, height);
    return { transform: [{ translateX: screen.x }, { translateY: screen.y }] };
  });
  const ring = useAnimatedStyle(() => ({ opacity: lit ? 0.55 * (1 - pulse.get()) : 0, transform: [{ scale: 1 + pulse.get() * 2.5 }] }));
  const size = lit ? LIT_DOT : DOT;

  return (
    <Animated.View className="absolute left-0 top-0" style={position}>
      <Animated.View
        className="absolute rounded-full bg-gold"
        style={[{ width: LIT_DOT, height: LIT_DOT, left: -LIT_DOT / 2, top: -LIT_DOT / 2 }, ring]}
      />
      <View
        className={`absolute rounded-full border-2 border-white ${lit ? "bg-gold" : "bg-primary"}`}
        style={{ width: size, height: size, left: -size / 2, top: -size / 2 }}
      />
      {named && (
        <Text
          numberOfLines={1}
          className="absolute font-sans-bold text-sm text-fg"
          style={[
            { width: 120, top: -11, lineHeight: 22, textShadowColor: halo, textShadowRadius: 4, textShadowOffset: { width: 0, height: 0 } },
            place.side === "left" ? { right: size, textAlign: "right" } : { left: size, textAlign: "left" },
          ]}
        >
          {place.name}
        </Text>
      )}
    </Animated.View>
  );
}

/**
 * Arabia, its places and journeys. Fills its parent; routes draw as far as the story has gone, and
 * stepping back undraws them.
 */
export function SeerahMap({
  frame,
  routes,
  named,
  glow,
}: {
  frame: Frame;
  routes: Partial<Record<RouteId, number>>;
  /** The places whose names show — the beat's own, so neighbours don't write over each other. */
  named: PlaceId[];
  glow: PlaceId[];
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  return (
    <View className="flex-1 overflow-hidden" onLayout={(event) => setSize(event.nativeEvent.layout)}>
      {size.width > 0 && <MapStage frame={frame} routes={routes} named={named} glow={glow} width={size.width} height={size.height} />}
    </View>
  );
}

function MapStage({
  frame,
  routes,
  named,
  glow,
  width,
  height,
}: {
  frame: Frame;
  routes: Partial<Record<RouteId, number>>;
  named: PlaceId[];
  glow: PlaceId[];
  width: number;
  height: number;
}) {
  const reduce = useReducedMotion();
  const bg = useThemeColor("bg");
  const sky = useThemeColor("tile-sky");
  const land = useThemeColor("surface-alt");
  const coast = useThemeColor("accent-strong");
  const gold = useThemeColor("accent");
  const cx = useSharedValue(frame.x + frame.width / 2);
  const cy = useSharedValue(frame.y + frame.height / 2);
  const zoom = useSharedValue(coverZoom(frame, width, height));

  useEffect(() => {
    const timing = { duration: reduce ? 0 : MOVE_MS, easing: EASE };
    cx.set(withTiming(frame.x + frame.width / 2, timing));
    cy.set(withTiming(frame.y + frame.height / 2, timing));
    zoom.set(withTiming(coverZoom(frame, width, height), timing));
  }, [frame, width, height, reduce, cx, cy, zoom]);

  const camera: Camera = { cx, cy, zoom, width, height };

  return (
    <View className="flex-1" accessible accessibilityRole="image" accessibilityLabel="خريطة الجزيرة العربية">
      <Svg width={width} height={height}>
        <Rect width={width} height={height} fill={bg} />
        <Rect width={width} height={height} fill={withAlpha(sky, 0.16)} />
        <Land key={`${width}x${height}`} camera={camera} fill={land} stroke={withAlpha(coast, 0.45)} />
        {(Object.keys(ROUTES) as RouteId[]).map((route) =>
          routes[route] ? <Journey key={route} route={route} drawn={routes[route]!} camera={camera} color={gold} /> : null,
        )}
      </Svg>
      {/* Physical positions for the marks: under the app's RTL, "left" would mean the right edge. */}
      <View className="absolute inset-0" style={{ direction: "ltr" }} pointerEvents="none">
        {(Object.keys(PLACES) as PlaceId[]).map((id) => (
          <PlaceMark key={id} id={id} camera={camera} named={named.includes(id)} lit={glow.includes(id)} />
        ))}
      </View>
    </View>
  );
}
