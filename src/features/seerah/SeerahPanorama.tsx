import { useIsFocused } from "expo-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";

import type { Interaction, Panorama, SceneItem, ScenePart } from "@/core/seerah/seerahContent";
import { useAppActive } from "@/lib/screenState";

import { ClockContext, NightContext, PARTS } from "./parts";
import { seerahSound } from "./sound";

/*
 * The website's SeerahPanorama: a chapter told across one long landscape. The camera travels to
 * where each beat looks; near things slide past faster than far ones; the reader can drag to look
 * around; the travellers walk on as the story goes; the parts with a note pulse and can be tapped.
 *
 * Built for low-end phones. Each depth of the landscape is its own still picture that the native side
 * slides with the camera (a transform: no SVG is redrawn while the camera moves). Things that live on
 * their own (birds, flocks, flames) read a clock that ticks 12 times a second and stops when the screen
 * is hidden, so only the strip that holds them redraws, and only then. Wide strips are cut in tiles so
 * no picture is larger than a phone's GPU accepts.
 */

const HEIGHT = 300;
/** Widest single picture, in pixels (Android's texture limit is 4096 on many phones). */
const TILE_PX = 2048;
/** The ambient clock's step: 12 frames a second is plenty for swaying palms and flapping birds. */
const TICK = 1 / 12;
/** Depths the items are grouped into; each is one sliding strip. */
const BANDS = 6;

const depthOf = (y: number) => Math.min(1, Math.max(0, (y - 200) / 90));
const sizeAt = (y: number) => 0.55 + depthOf(y) * 0.8;
const bandOf = (y: number) => Math.round(depthOf(y) * (BANDS - 1));
const parallaxOfBand = (band: number) => 0.55 + (band / (BANDS - 1)) * 0.45;
const PARTY_Y = 262;

function LightGradient() {
  return (
    <Defs>
      <RadialGradient id="seerah-light">
        <Stop offset="0" stopColor="#fff6d8" stopOpacity={0.95} />
        <Stop offset="1" stopColor="#cda23e" stopOpacity={0} />
      </RadialGradient>
    </Defs>
  );
}

/**
 * A strip of the landscape spanning [from, to] in its own units, moving at `factor` of the camera's speed.
 * `children` is SVG (drawn in tiles); `overlay` is native views placed in pixels from the strip's start.
 */
function Strip({
  factor,
  from,
  to,
  camera,
  half,
  k,
  children,
  overlay,
}: {
  factor: number;
  from: number;
  to: number;
  camera: SharedValue<number>;
  half: number;
  k: number;
  children?: ReactNode;
  overlay?: ReactNode;
}) {
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: (half - camera.get() * factor + from) * k }] }));
  const tileUnits = TILE_PX / k;
  const tiles: [number, number][] = [];
  if (children) for (let start = from; start < to; start += tileUnits) tiles.push([start, Math.min(to, start + tileUnits)]);
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[{ position: "absolute", left: 0, top: 0, width: (to - from) * k, height: HEIGHT * k }, style]}
    >
      {tiles.map(([a, b]) => (
        <Svg
          key={a}
          width={(b - a) * k}
          height={HEIGHT * k}
          viewBox={`${a} 0 ${b - a} ${HEIGHT}`}
          style={{ position: "absolute", left: (a - from) * k, top: 0 }}
          pointerEvents="none"
        >
          <LightGradient />
          {children}
        </Svg>
      ))}
      {overlay}
    </Animated.View>
  );
}

/** One part, standing at (x, y) in its strip's units. Static: the strip moves, not the part. */
function Item({ item, x }: { item: SceneItem; x: number }) {
  const y = item.y ?? 250;
  const scale = sizeAt(y) * (item.size ?? 1);
  const shadow = PARTS[item.part].shadow;
  return (
    <G transform={`translate(${x} ${y}) scale(${item.flip ? -scale : scale} ${scale})`}>
      {shadow ? <Ellipse cx={0} cy={1} rx={shadow} ry={3.2} fill="#000" opacity={0.13} /> : null}
      {PARTS[item.part].draw(item)}
    </G>
  );
}

/** A note's pulsing dot above its part: a native view, so its pulse never redraws the landscape. */
function Marker({
  left,
  top,
  pulse,
  active,
  onPress,
}: {
  left: number;
  top: number;
  pulse: SharedValue<number>;
  active: boolean;
  onPress: () => void;
}) {
  const ring = useAnimatedStyle(() => ({ opacity: 0.9 * (1 - pulse.get()), transform: [{ scale: 1 + pulse.get() * 1.4 }] }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="معلومة"
      onPress={onPress}
      hitSlop={6}
      style={{
        position: "absolute",
        left: left - 18,
        top: top - 18,
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={[{ position: "absolute", width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#cda23e" }, ring]}
      />
      <View
        style={{
          width: 11,
          height: 11,
          borderRadius: 6,
          backgroundColor: active ? "#ffffff" : "#cda23e",
          borderWidth: 1.5,
          borderColor: "#ffffff",
        }}
      />
    </Pressable>
  );
}

/** The travellers, walking to where the beat puts them: one small picture slid by the native side. */
function Party({
  part,
  at,
  camera,
  half,
  k,
}: {
  part: ScenePart;
  at: number | undefined;
  camera: SharedValue<number>;
  half: number;
  k: number;
}) {
  const reduce = useReducedMotion();
  const position = useSharedValue(at ?? 0);
  const shown = useSharedValue(at === undefined ? 0 : 1);
  const scale = sizeAt(PARTY_Y);
  const p = parallaxOfBand(bandOf(PARTY_Y));
  const box = 120;

  useEffect(() => {
    shown.set(withTiming(at === undefined ? 0 : 1, { duration: 600 }));
    if (at !== undefined) position.set(reduce ? at : withTiming(at, { duration: 2400, easing: Easing.inOut(Easing.quad) }));
  }, [at, position, shown, reduce]);

  const style = useAnimatedStyle(() => ({
    opacity: shown.get(),
    transform: [{ translateX: (half + (position.get() - camera.get()) * p - box) * k }],
  }));
  const shadow = PARTS[part].shadow;
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: box * 2 * k, height: HEIGHT * k }, style]}>
      <Svg width={box * 2 * k} height={HEIGHT * k} viewBox={`${-box} 0 ${box * 2} ${HEIGHT}`}>
        <LightGradient />
        <G transform={`translate(0 ${PARTY_Y}) scale(${scale})`}>
          {shadow ? <Ellipse cx={0} cy={1} rx={shadow} ry={3.2} fill="#000" opacity={0.13} /> : null}
          {PARTS[part].draw({ part, x: 0 })}
        </G>
      </Svg>
    </Animated.View>
  );
}

const MOODS = {
  night: { color: "#011a15", level: 0.62, stars: true },
  dawn: { color: "#5b4a7a", level: 0.22, stars: false },
  dusk: { color: "#7a3b2a", level: 0.28, stars: false },
} as const;

/** A stretch under another sky than day, full within it and fading 150 units either side: native fades. */
function Mood({
  mood,
  camera,
  width,
  height,
}: {
  mood: NonNullable<Panorama["moods"]>[number];
  camera: SharedValue<number>;
  width: number;
  height: number;
}) {
  const { color, level, stars } = MOODS[mood.sky];
  const amount = useDerivedValue(() => {
    const c = camera.get();
    if (c <= mood.from - 150 || c >= mood.to + 150) return 0;
    if (c < mood.from) return (level * (c - (mood.from - 150))) / 150;
    if (c > mood.to) return (level * (mood.to + 150 - c)) / 150;
    return level;
  });
  const shade = useAnimatedStyle(() => ({ opacity: amount.get() }));
  const sky = useAnimatedStyle(() => ({ opacity: amount.get() / level }));
  const viewWidth = (HEIGHT * width) / height;
  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[{ position: "absolute", left: 0, top: 0, width, height, backgroundColor: color }, shade]}
      />
      {stars && (
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width, height }, sky]}>
          <Svg width={width} height={height} viewBox={`0 0 ${viewWidth} ${HEIGHT}`}>
            {Array.from({ length: Math.round(viewWidth / 8) }, (_, index) => (
              <Circle
                key={index}
                cx={(index * 97) % viewWidth}
                cy={(index * 53) % 170}
                r={0.5 + (index % 3) * 0.4}
                fill="#ffffff"
                opacity={0.5 + (index % 2) * 0.4}
              />
            ))}
            <Path d={`M${viewWidth - 60} 48a20 20 0 1 0 17 31 16 16 0 1 1-17-31Z`} fill="#e8d7a6" />
          </Svg>
        </Animated.View>
      )}
    </>
  );
}

/** Wipe across the footprints to erase them, as the shepherd's flock did. */
function EraseTracks({ interaction }: { interaction: Extract<Interaction, { kind: "erase-tracks" }> }) {
  const tracks = useMemo(() => Array.from({ length: 12 }, (_, index) => ({ x: 140 + index * 11, y: 262 + (index % 2 ? -5 : 4) })), []);
  const [erased, setErased] = useState<number[]>([]);
  const [box, setBox] = useState({ width: 1, height: 1 });
  const done = erased.length === tracks.length;

  function wipe(touchX: number, touchY: number) {
    // The overlay draws 400 × 300 fitted inside the stage (xMidYMid meet).
    const scale = Math.min(box.width / 400, box.height / 300);
    const x = (touchX - (box.width - 400 * scale) / 2) / scale;
    const y = (touchY - (box.height - 300 * scale) / 2) / scale;
    const next = tracks.flatMap((track, index) => (!erased.includes(index) && Math.hypot(track.x - x, track.y - y) < 24 ? [index] : []));
    if (!next.length) return;
    const all = [...erased, ...next];
    if (all.length === tracks.length) seerahSound.effect("chime");
    else seerahSound.effect("swish");
    setErased(all);
  }

  const gesture = Gesture.Pan()
    .minDistance(0)
    .onBegin((event) => runOnJS(wipe)(event.x, event.y))
    .onUpdate((event) => runOnJS(wipe)(event.x, event.y));

  return (
    <GestureDetector gesture={gesture}>
      <View className="absolute inset-0" onLayout={(event) => setBox(event.nativeEvent.layout)}>
        <Svg width="100%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          {tracks.map((track, index) => (
            <Ellipse key={index} cx={track.x} cy={track.y} rx={4} ry={2.4} fill="#5a432a" opacity={erased.includes(index) ? 0 : 0.9} />
          ))}
        </Svg>
        <View className="absolute inset-x-3 top-14 rounded-2xl bg-black/55 px-4 py-2">
          <Text className="text-center font-sans text-sm leading-7 text-white">{done ? interaction.done : interaction.prompt}</Text>
        </View>
      </View>
    </GestureDetector>
  );
}

function Choice({ interaction }: { interaction: Extract<Interaction, { kind: "choose-route" | "choice" }> }) {
  const [picked, setPicked] = useState<number | null>(null);
  const choice = picked === null ? null : interaction.options[picked]!;
  return (
    <View className="absolute inset-x-3 top-14 rounded-2xl bg-white/95 p-4">
      <Text className="font-sans text-sm leading-7 text-emerald-night">{choice ? choice.feedback : interaction.prompt}</Text>
      {!choice ? (
        <View className="mt-3 gap-2">
          {interaction.options.map((option, index) => (
            <Pressable
              key={option.label}
              accessibilityRole="button"
              onPress={() => {
                seerahSound.effect(option.right ? "chime" : "wrong");
                setPicked(index);
              }}
              className="rounded-xl border border-gold/50 bg-gold-soft/40 px-3 py-2"
            >
              <Text className="text-center font-sans-bold text-sm text-emerald-night">{option.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : !choice.right ? (
        <Text className="mt-2 font-sans-bold text-sm leading-7 text-emerald-night">
          {interaction.options.find((option) => option.right)?.feedback}
        </Text>
      ) : null}
    </View>
  );
}

interface Band {
  band: number;
  p: number;
  from: number;
  to: number;
  items: SceneItem[];
}

/** The items grouped by depth, far to near, each group drawn in the order of its feet. */
function groupBands(items: SceneItem[]): Band[] {
  const groups = new Map<number, SceneItem[]>();
  for (const item of items) {
    const band = bandOf(item.y ?? 250);
    groups.set(band, [...(groups.get(band) ?? []), item]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([band, list]) => {
      const p = parallaxOfBand(band);
      const sorted = [...list].sort((a, b) => (a.y ?? 250) - (b.y ?? 250));
      const xs = sorted.map((item) => item.x * p);
      return { band, p, from: Math.min(...xs) - 160, to: Math.max(...xs) + 160, items: sorted };
    });
}

export function SeerahPanorama({
  panorama,
  pan,
  party,
  interaction,
}: {
  panorama: Panorama;
  pan: number;
  party: number | undefined;
  interaction: Interaction | undefined;
}) {
  const reduce = useReducedMotion();
  const focused = useIsFocused();
  const active = useAppActive();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const k = size.height ? size.height / HEIGHT : 1;
  const viewWidth = size.height ? (HEIGHT * size.width) / size.height : 400;
  const half = viewWidth / 2;
  const target = useSharedValue(pan);
  const drag = useSharedValue(0);
  const dragFrom = useSharedValue(0);
  const camera = useDerivedValue(() => target.get() + drag.get());
  const clock = useSharedValue(0);
  const pulse = useSharedValue(0);
  // A note belongs to the beat it was opened on; moving on closes it.
  const [opened, setOpened] = useState<{ pan: number; text: string } | null>(null);
  const note = opened?.pan === pan ? opened.text : null;

  // The ambient clock, in steps of TICK seconds: a part redraws only when its step changes.
  const ticker = useFrameCallback((frame) => {
    const t = Math.floor(frame.timeSinceFirstFrame / 1000 / TICK) * TICK;
    if (t !== clock.get()) clock.set(t);
  }, false);
  const running = !reduce && focused && active;
  useEffect(() => {
    ticker.setActive(running);
    pulse.set(running ? withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1, false) : 0);
    return () => ticker.setActive(false);
  }, [running, ticker, pulse]);

  useEffect(() => {
    target.set(reduce ? pan : withTiming(pan, { duration: 1800, easing: Easing.bezier(0.65, 0, 0.35, 1) }));
    drag.set(0);
  }, [pan, target, drag, reduce]);

  const limit = { min: half - pan, max: panorama.width - half - pan };
  const gesture = Gesture.Pan()
    .enabled(interaction?.kind !== "erase-tracks")
    .activeOffsetX([-12, 12])
    .failOffsetY([-12, 12])
    .onStart(() => dragFrom.set(drag.get()))
    .onUpdate((event) => {
      const scale = HEIGHT / Math.max(1, size.height);
      // Dragging right looks left, as with a photo. The stage is laid out left to right (below).
      drag.set(Math.max(limit.min, Math.min(limit.max, dragFrom.get() - event.translationX * scale)));
    });

  const bands = useMemo(() => groupBands(panorama.items), [panorama.items]);
  const hills = useMemo(() => {
    const far = [];
    const mid = [];
    for (let at = -200; at <= panorama.width + 400; at += 60) far.push(`${at} ${200 - ((at * 37) % 50)}`);
    for (let at = -200; at <= panorama.width + 400; at += 90) mid.push(`${at} ${208 - ((at * 53) % 26)}`);
    return {
      far: `M-200 216L${far.join("L")}L${panorama.width + 400} 216Z`,
      mid: `M-200 218L${mid.join("L")}L${panorama.width + 400} 218Z`,
    };
  }, [panorama.width]);
  const clouds = Math.ceil(panorama.width / 500);
  const stones = useMemo(
    () =>
      Array.from({ length: Math.ceil((panorama.width * 1.25) / 70) }, (_, index) => {
        const at = index * 70 + ((index * 37) % 30);
        return index % 3 === 0 ? (
          <Path key={index} d={`M${at - 8} 300q2-12 6-4q2-14 5-1q3-10 5 5Z`} fill="#7d8f4a" />
        ) : (
          <Ellipse
            key={index}
            cx={at}
            cy={296 - (index % 2) * 3}
            rx={6 + (index % 4) * 2}
            ry={3 + (index % 3)}
            fill={index % 2 ? "#a08a66" : "#8c7a5c"}
          />
        );
      }),
    [panorama.width],
  );

  const toggle = (text: string) => {
    if (note !== text) seerahSound.effect("chime");
    setOpened(note === text ? null : { pan, text });
  };

  return (
    <View className="flex-1" onLayout={(event) => setSize(event.nativeEvent.layout)}>
      {size.width > 0 && (
        <GestureDetector gesture={gesture}>
          <View
            // Physical left-to-right: the strips are placed and slid in pixels, which RTL would mirror.
            style={{ flex: 1, overflow: "hidden", direction: "ltr" }}
            accessible
            accessibilityRole="image"
            accessibilityLabel="مشهد الرحلة"
          >
            <ClockContext.Provider value={clock}>
              <NightContext.Provider value={false}>
                <Svg width={size.width} height={size.height} viewBox={`0 0 ${viewWidth} ${HEIGHT}`} style={{ position: "absolute" }}>
                  <Defs>
                    <LinearGradient id="panorama-sky" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor="#bfdcea" />
                      <Stop offset="1" stopColor="#f6e7c4" />
                    </LinearGradient>
                  </Defs>
                  <Rect width={viewWidth} height={HEIGHT} fill="url(#panorama-sky)" />
                  <Circle cx={viewWidth - 70} cy={62} r={22} fill="#fbe7a8" />
                </Svg>

                <Strip factor={0.12} from={0} to={clouds * 420 + 260} camera={camera} half={half} k={k}>
                  {Array.from({ length: clouds }, (_, index) => (
                    <G key={index} transform={`translate(${index * 420 + 120} ${50 + (index % 3) * 22}) scale(${0.8 + (index % 2) * 0.4})`}>
                      {PARTS.cloud.draw({ part: "cloud", x: 0 })}
                    </G>
                  ))}
                </Strip>
                <Strip factor={0.35} from={-200} to={panorama.width + 400} camera={camera} half={half} k={k}>
                  <Path d={hills.far} fill="#8c7258" opacity={0.7} />
                </Strip>
                <Strip factor={0.5} from={-200} to={panorama.width + 400} camera={camera} half={half} k={k}>
                  <Path d={hills.mid} fill="#b39672" opacity={0.75} />
                </Strip>
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 216 * k,
                    width: size.width,
                    height: (HEIGHT - 216) * k,
                    backgroundColor: "#d9c08f",
                  }}
                />

                {bands.map((band) => (
                  <Strip key={band.band} factor={band.p} from={band.from} to={band.to} camera={camera} half={half} k={k}>
                    {band.items.map((item, index) => (
                      <Item key={`${item.part}-${index}`} item={item} x={item.x * band.p} />
                    ))}
                  </Strip>
                ))}

                <Party part={panorama.traveller ?? "party"} at={party} camera={camera} half={half} k={k} />

                <Strip factor={1.25} from={-40} to={panorama.width * 1.25 + 60} camera={camera} half={half} k={k}>
                  {stones}
                </Strip>

                {panorama.moods?.map((mood) => (
                  <Mood key={mood.from} mood={mood} camera={camera} width={size.width} height={size.height} />
                ))}

                {/* The notes' dots ride above everything, each with the strip of its part. */}
                {bands.map((band) => {
                  const noted = band.items.filter((item) => item.note);
                  if (!noted.length) return null;
                  return (
                    <Strip
                      key={`notes-${band.band}`}
                      factor={band.p}
                      from={band.from}
                      to={band.to}
                      camera={camera}
                      half={half}
                      k={k}
                      overlay={noted.map((item, index) => {
                        const y = item.y ?? 250;
                        const top = y + (-PARTS[item.part].height - 8) * sizeAt(y) * (item.size ?? 1);
                        return (
                          <Marker
                            key={index}
                            left={(item.x * band.p - band.from) * k}
                            top={top * k}
                            pulse={pulse}
                            active={note === item.note}
                            onPress={() => toggle(item.note!)}
                          />
                        );
                      })}
                    />
                  );
                })}
              </NightContext.Provider>
            </ClockContext.Provider>
          </View>
        </GestureDetector>
      )}

      {interaction?.kind === "erase-tracks" && <EraseTracks key={pan} interaction={interaction} />}
      {(interaction?.kind === "choose-route" || interaction?.kind === "choice") && <Choice key={pan} interaction={interaction} />}

      {note ? (
        <Animated.View key={note} entering={FadeIn} exiting={FadeOut} className="absolute inset-x-3 bottom-3">
          <Pressable accessibilityRole="button" onPress={() => setOpened(null)} className="rounded-2xl bg-white/95 px-4 py-3">
            <Text className="font-sans text-sm leading-7 text-emerald-night">{note}</Text>
          </Pressable>
        </Animated.View>
      ) : !interaction && bands.some((band) => band.items.some((item) => item.note)) ? (
        <View className="absolute bottom-3 start-3 rounded-full bg-black/35 px-3 py-1" pointerEvents="none">
          <Text className="font-sans text-xs text-white">اسحب لتتجوّل، والمس النقاط المضيئة</Text>
        </View>
      ) : null}
    </View>
  );
}
