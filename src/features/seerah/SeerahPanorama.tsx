import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  runOnJS,
  useAnimatedProps,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";

import type { Interaction, Panorama, SceneItem, ScenePart } from "@/core/seerah/seerahContent";

import { AnimatedG, ClockContext, NightContext, PARTS } from "./parts";
import { seerahSound } from "./sound";

/*
 * The website's SeerahPanorama: a chapter told across one long landscape. The camera travels to
 * where each beat looks; near things slide past faster than far ones; the reader can drag to look
 * around; the travellers walk on as the story goes; the parts with a note pulse and can be tapped.
 * Everything that moves is computed on the UI thread from two values: the camera and a clock.
 */

const HEIGHT = 300;
const AnimatedRect = Animated.createAnimatedComponent(Rect);

const depthOf = (y: number) => Math.min(1, Math.max(0, (y - 200) / 90));
const parallaxOf = (y: number) => 0.55 + depthOf(y) * 0.45;
const sizeAt = (y: number) => 0.55 + depthOf(y) * 0.8;

/** Where something at map x stands on screen, given the camera: the parallax that gives depth. */
function useAt(
  x: SharedValue<number> | number,
  p: number,
  camera: SharedValue<number>,
  half: number,
  y: number,
  scale: number,
  flip = false,
) {
  return useAnimatedProps(() => {
    const at = typeof x === "number" ? x : x.get();
    return { matrix: [flip ? -scale : scale, 0, 0, scale, half + (at - camera.get()) * p, y] };
  });
}

function Item({ item, camera, half }: { item: SceneItem; camera: SharedValue<number>; half: number }) {
  const y = item.y ?? 250;
  const scale = sizeAt(y) * (item.size ?? 1);
  const animatedProps = useAt(item.x, parallaxOf(y), camera, half, y, scale, item.flip);
  const shadow = PARTS[item.part].shadow;
  return (
    <AnimatedG animatedProps={animatedProps}>
      {shadow ? <Ellipse cx={0} cy={1} rx={shadow} ry={3.2} fill="#000" opacity={0.13} /> : null}
      {PARTS[item.part].draw(item)}
    </AnimatedG>
  );
}

/** A note's pulsing dot above its part, unscaled so it stays easy to tap. */
function Marker({
  item,
  camera,
  clock,
  half,
  active,
  onPress,
}: {
  item: SceneItem;
  camera: SharedValue<number>;
  clock: SharedValue<number>;
  half: number;
  active: boolean;
  onPress: () => void;
}) {
  const y = item.y ?? 250;
  const top = y + (-PARTS[item.part].height - 8) * sizeAt(y) * (item.size ?? 1);
  const animatedProps = useAt(item.x, parallaxOf(y), camera, half, top, 1);
  const ring = useAnimatedProps(() => {
    const t = (clock.get() % 1.6) / 1.6;
    return { r: 5 + t * 7, opacity: 0.9 * (1 - t) };
  });
  return (
    <AnimatedG animatedProps={animatedProps} onPress={onPress}>
      <Circle cx={0} cy={0} r={18} fill="#000" fillOpacity={0.001} />
      <AnimatedCircleRing animatedProps={ring} />
      <Circle cx={0} cy={0} r={4.5} fill={active ? "#ffffff" : "#cda23e"} stroke="#ffffff" strokeWidth={1.5} />
    </AnimatedG>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
function AnimatedCircleRing({ animatedProps }: { animatedProps: ReturnType<typeof useAnimatedProps> }) {
  return <AnimatedCircle cx={0} cy={0} fill="none" stroke="#cda23e" strokeWidth={2} animatedProps={animatedProps} />;
}

/** The travellers, walking to where the beat puts them. */
function Party({ part, at, camera, half }: { part: ScenePart; at: number | undefined; camera: SharedValue<number>; half: number }) {
  const reduce = useReducedMotion();
  const position = useSharedValue(at ?? 0);
  const shown = useSharedValue(at === undefined ? 0 : 1);
  const y = 262;
  const scale = sizeAt(y);
  const p = parallaxOf(y);

  useEffect(() => {
    shown.set(withTiming(at === undefined ? 0 : 1, { duration: 600 }));
    if (at !== undefined) position.set(reduce ? at : withTiming(at, { duration: 2400, easing: Easing.inOut(Easing.quad) }));
  }, [at, position, shown, reduce]);

  const animatedProps = useAnimatedProps(() => ({
    matrix: [scale, 0, 0, scale, half + (position.get() - camera.get()) * p, y],
    opacity: shown.get(),
  }));
  const shadow = PARTS[part].shadow;
  return (
    <AnimatedG animatedProps={animatedProps}>
      {shadow ? <Ellipse cx={0} cy={1} rx={shadow} ry={3.2} fill="#000" opacity={0.13} /> : null}
      {PARTS[part].draw({ part, x: 0 })}
    </AnimatedG>
  );
}

/** A layer that drifts at its own share of the camera's speed: far hills slowly, the stones at our feet fast. */
function Layer({
  factor,
  camera,
  half,
  children,
}: {
  factor: number;
  camera: SharedValue<number>;
  half: number;
  children: React.ReactNode;
}) {
  const animatedProps = useAnimatedProps(() => ({ matrix: [1, 0, 0, 1, half - camera.get() * factor, 0] }));
  return <AnimatedG animatedProps={animatedProps}>{children}</AnimatedG>;
}

const MOODS = {
  night: { color: "#011a15", level: 0.62, stars: true },
  dawn: { color: "#5b4a7a", level: 0.22, stars: false },
  dusk: { color: "#7a3b2a", level: 0.28, stars: false },
} as const;

/** A stretch under another sky than day, full within it and fading 150 units either side. */
function Mood({
  mood,
  camera,
  viewWidth,
}: {
  mood: NonNullable<Panorama["moods"]>[number];
  camera: SharedValue<number>;
  viewWidth: number;
}) {
  const { color, level, stars } = MOODS[mood.sky];
  const amount = useDerivedValue(() => {
    const c = camera.get();
    if (c <= mood.from - 150 || c >= mood.to + 150) return 0;
    if (c < mood.from) return (level * (c - (mood.from - 150))) / 150;
    if (c > mood.to) return (level * (mood.to + 150 - c)) / 150;
    return level;
  });
  const shade = useAnimatedProps(() => ({ opacity: amount.get() }));
  const sky = useAnimatedProps(() => ({ opacity: amount.get() / level }));
  return (
    <G>
      <AnimatedRect width={viewWidth} height={HEIGHT} fill={color} animatedProps={shade} />
      {stars && (
        <AnimatedG animatedProps={sky}>
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
        </AnimatedG>
      )}
    </G>
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
  const [size, setSize] = useState({ width: 0, height: 0 });
  const viewWidth = size.height ? (HEIGHT * size.width) / size.height : 400;
  const half = viewWidth / 2;
  const target = useSharedValue(pan);
  const drag = useSharedValue(0);
  const dragFrom = useSharedValue(0);
  const camera = useDerivedValue(() => target.get() + drag.get());
  const clock = useSharedValue(0);
  // A note belongs to the beat it was opened on; moving on closes it.
  const [opened, setOpened] = useState<{ pan: number; text: string } | null>(null);
  const note = opened?.pan === pan ? opened.text : null;

  useEffect(() => {
    if (reduce) return;
    clock.set(withRepeat(withTiming(600, { duration: 600_000, easing: Easing.linear }), -1, false));
  }, [clock, reduce]);

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
      // Dragging right looks left, as with a photo.
      drag.set(Math.max(limit.min, Math.min(limit.max, dragFrom.get() - event.translationX * scale)));
    });

  const sorted = useMemo(() => [...panorama.items].sort((a, b) => (a.y ?? 250) - (b.y ?? 250)), [panorama.items]);
  const noted = sorted.filter((item) => item.note);
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

  return (
    <View className="flex-1" onLayout={(event) => setSize(event.nativeEvent.layout)}>
      {size.width > 0 && (
        <GestureDetector gesture={gesture}>
          <View className="flex-1" accessible accessibilityRole="image" accessibilityLabel="مشهد الرحلة">
            <ClockContext.Provider value={clock}>
              <NightContext.Provider value={false}>
                <Svg width={size.width} height={size.height} viewBox={`0 0 ${viewWidth} ${HEIGHT}`}>
                  <Defs>
                    <LinearGradient id="panorama-sky" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor="#bfdcea" />
                      <Stop offset="1" stopColor="#f6e7c4" />
                    </LinearGradient>
                    <RadialGradient id="seerah-light">
                      <Stop offset="0" stopColor="#fff6d8" stopOpacity={0.95} />
                      <Stop offset="1" stopColor="#cda23e" stopOpacity={0} />
                    </RadialGradient>
                  </Defs>
                  <Rect width={viewWidth} height={HEIGHT} fill="url(#panorama-sky)" />
                  <Circle cx={viewWidth - 70} cy={62} r={22} fill="#fbe7a8" />
                  <Layer factor={0.12} camera={camera} half={half}>
                    {Array.from({ length: Math.ceil(panorama.width / 500) }, (_, index) => (
                      <G
                        key={index}
                        transform={`translate(${index * 420 + 120} ${50 + (index % 3) * 22}) scale(${0.8 + (index % 2) * 0.4})`}
                      >
                        {PARTS.cloud.draw({ part: "cloud", x: 0 })}
                      </G>
                    ))}
                  </Layer>
                  <Layer factor={0.35} camera={camera} half={half}>
                    <Path d={hills.far} fill="#8c7258" opacity={0.7} />
                  </Layer>
                  <Layer factor={0.5} camera={camera} half={half}>
                    <Path d={hills.mid} fill="#b39672" opacity={0.75} />
                  </Layer>
                  <Rect x={0} y={216} width={viewWidth} height={HEIGHT - 216} fill="#d9c08f" />
                  {sorted.map((item, index) => (
                    <Item key={`${item.part}-${index}`} item={item} camera={camera} half={half} />
                  ))}
                  <Party part={panorama.traveller ?? "party"} at={party} camera={camera} half={half} />
                  <Layer factor={1.25} camera={camera} half={half}>
                    {Array.from({ length: Math.ceil((panorama.width * 1.25) / 70) }, (_, index) => {
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
                    })}
                  </Layer>
                  {panorama.moods?.map((mood) => (
                    <Mood key={mood.from} mood={mood} camera={camera} viewWidth={viewWidth} />
                  ))}
                  {noted.map((item, index) => (
                    <Marker
                      key={`note-${index}`}
                      item={item}
                      camera={camera}
                      clock={clock}
                      half={half}
                      active={note === item.note}
                      onPress={() => {
                        if (note !== item.note) seerahSound.effect("chime");
                        setOpened(note === item.note ? null : { pan, text: item.note! });
                      }}
                    />
                  ))}
                </Svg>
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
      ) : !interaction && noted.length > 0 ? (
        <View className="absolute bottom-3 start-3 rounded-full bg-black/35 px-3 py-1" pointerEvents="none">
          <Text className="font-sans text-xs text-white">اسحب لتتجوّل، والمس النقاط المضيئة</Text>
        </View>
      ) : null}
    </View>
  );
}
