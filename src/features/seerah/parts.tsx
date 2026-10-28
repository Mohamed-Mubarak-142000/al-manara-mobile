import { createContext, useContext, type ComponentType, type ReactNode } from "react";
import Animated, { useAnimatedProps, type SharedValue } from "react-native-reanimated";
import { Circle, Ellipse, G, Path, Rect, type GProps } from "react-native-svg";

import type { ScenePart, SceneItem } from "@/core/seerah/seerahContent";

/*
 * The website's SeerahScenes parts, drawn with react-native-svg: the Kaaba, houses, palms, camels,
 * armies, the sea... Each is drawn around its foot at (0, 0), about 30 units tall at scale 1.
 *
 * Motion comes from one clock (seconds, on the UI thread) that every moving part reads, so a whole
 * panorama costs one animation, not a hundred. People stand still here, unlike on the website: a
 * crowd of swaying figures is more than a low-end phone should draw every frame.
 *
 * People are drawn by the rule in src/core/seerah/CONTENT.md: never the Prophet ﷺ, a prophet, his
 * household, the Mothers of the Believers, the ten promised Paradise, or a companion a beat names.
 */

// The native group takes its transform as `matrix` (a, b, c, d, e, f); G's public props leave it out.
export const AnimatedG = Animated.createAnimatedComponent(G as unknown as ComponentType<GProps & { matrix?: number[] }>);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const INK = "#3b2a1e";
const NIGHT_INK = "#06120e";
const MUD = "#b98d5a";
const MUD_DARK = "#8a6339";
const WOOD = "#6b4a26";
const LEAF = "#2f6b45";
const GOLD = "#cda23e";
const GOLD_SOFT = "#e8d7a6";

/** The panorama's clock in seconds; parts animate off it. */
export const ClockContext = createContext<SharedValue<number> | null>(null);
/** Night darkens the people drawn as silhouettes. */
export const NightContext = createContext(false);

function useClock(): SharedValue<number> {
  const clock = useContext(ClockContext);
  if (!clock) throw new Error("Seerah parts need a ClockContext");
  return clock;
}

/** The same randomness every time: a small seeded generator instead of Math.random. */
function seeded(seed: number) {
  let state = Math.max(1, Math.floor(seed * 9973) % 2147483647);
  return () => ((state = (state * 16807) % 2147483647) - 1) / 2147483646;
}

// ---------------------------------------------------------------------------------------------
// Motion, all from the clock.

/** Turns back and forth about (ox, oy). */
function Sway({
  children,
  degrees = 1.5,
  seconds = 6,
  ox = 0,
  oy = 0,
}: {
  children: ReactNode;
  degrees?: number;
  seconds?: number;
  ox?: number;
  oy?: number;
}) {
  const clock = useClock();
  const animatedProps = useAnimatedProps(() => {
    const angle = (Math.sin((2 * Math.PI * clock.get()) / seconds) * degrees * Math.PI) / 180;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return { matrix: [c, s, -s, c, ox - c * ox + s * oy, oy - s * ox - c * oy] };
  });
  return <AnimatedG animatedProps={animatedProps}>{children}</AnimatedG>;
}

/** Rises and settles. */
function Bob({ children, by = 1.5, seconds = 2.4 }: { children: ReactNode; by?: number; seconds?: number }) {
  const clock = useClock();
  const animatedProps = useAnimatedProps(() => ({ matrix: [1, 0, 0, 1, 0, -Math.abs(Math.sin((Math.PI * clock.get()) / seconds)) * by] }));
  return <AnimatedG animatedProps={animatedProps}>{children}</AnimatedG>;
}

/** Drifts by `dx` and back. */
function Drift({ children, dx, seconds }: { children: ReactNode; dx: number; seconds: number }) {
  const clock = useClock();
  const animatedProps = useAnimatedProps(() => ({
    matrix: [1, 0, 0, 1, ((1 - Math.cos((2 * Math.PI * clock.get()) / seconds)) / 2) * dx, 0],
  }));
  return <AnimatedG animatedProps={animatedProps}>{children}</AnimatedG>;
}

/** Slides by `dx, dy` over `seconds`, then starts again: wind, falling arrows. */
function Slide({
  children,
  dx,
  dy = 0,
  seconds,
  delay = 0,
}: {
  children: ReactNode;
  dx: number;
  dy?: number;
  seconds: number;
  delay?: number;
}) {
  const clock = useClock();
  const animatedProps = useAnimatedProps(() => {
    const t = ((((clock.get() + delay) % seconds) + seconds) % seconds) / seconds;
    return { matrix: [1, 0, 0, 1, t * dx, t * dy], opacity: Math.sin(Math.PI * t) };
  });
  return <AnimatedG animatedProps={animatedProps}>{children}</AnimatedG>;
}

/** Breathes between two opacities. */
function Pulse({ children, from = 0.5, to = 1, seconds = 3 }: { children: ReactNode; from?: number; to?: number; seconds?: number }) {
  const clock = useClock();
  const animatedProps = useAnimatedProps(() => ({
    opacity: from + ((to - from) * (1 + Math.sin((2 * Math.PI * clock.get()) / seconds))) / 2,
  }));
  return <AnimatedG animatedProps={animatedProps}>{children}</AnimatedG>;
}

// ---------------------------------------------------------------------------------------------
// People

const ROBES = ["#efe6d2", "#c9a878", "#8a6339", "#5e6e5a", "#a35d3d", "#e2d6bc"];
const WRAPS = ["#3b2a1e", "#efe6d2", "#7a5a3a"];
const SKINS = ["#d9a77a", "#c48b5c", "#a8744a", "#8a5a3a"];
const HEADCLOTHS = ["#efe6d2", "#7a2e2e", "#c9a878", "#5e6e5a", "#3b2a1e"];

/** A silhouette: a wrapped head and a robe, no face, for groups that stand for named companions. */
function Figure({ x = 0, height = 26, carry, seed = 1 }: { x?: number; height?: number; carry?: boolean; seed?: number }) {
  const night = useContext(NightContext);
  const k = height / 26;
  const robe = night ? NIGHT_INK : ROBES[seed % ROBES.length]!;
  const wrap = night ? NIGHT_INK : WRAPS[seed % WRAPS.length]!;
  return (
    <G transform={`translate(${x} 0) scale(${k})`}>
      <Path d="M-4.5 -19h9l2.5 19h-14Z" fill={robe} />
      <Circle cx={0} cy={-23} r={3.6} fill={wrap} />
      {carry && <Ellipse cx={0} cy={-29} rx={6} ry={2.6} fill={MUD_DARK} />}
    </G>
  );
}

type Pose = "stand" | "wave" | "point" | "carry" | "sit";

/** A character with a face of a few strokes under a headcloth, for those the rule allows. */
function Person({
  x = 0,
  seed = 1,
  pose = "stand",
  beard = true,
  flip = false,
}: {
  x?: number;
  seed?: number;
  pose?: Pose;
  beard?: boolean;
  flip?: boolean;
}) {
  const skin = SKINS[seed % SKINS.length]!;
  const cloth = HEADCLOTHS[(seed * 3) % HEADCLOTHS.length]!;
  const robe = ROBES[(seed * 5) % ROBES.length]!;
  const sitting = pose === "sit";
  const headY = sitting ? -21 : -27;
  const sleeve = "#0000004d";
  return (
    <G transform={`translate(${x} 0) scale(${flip ? -1 : 1} 1)`}>
      {sitting && <Ellipse cx={0} cy={-5} rx={11} ry={4} fill={robe} />}
      <Path d={sitting ? "M-6 -16h12l4 10h-20Z" : "M-6 -22q6-2 12 0l3 22h-18Z"} fill={robe} stroke="#00000026" strokeWidth={0.6} />
      {!sitting && <Path d="M2 -21l2 21h5l-3-22Z" fill="#00000016" />}
      {!sitting && seed % 3 === 0 && <Path d="M-6.4 -12h13" stroke="#5a3a1a" strokeWidth={1.4} />}
      {pose === "stand" && <Path d="M-5 -19l-3 11M5 -19l3 11" stroke={sleeve} strokeWidth={2.8} strokeLinecap="round" />}
      {pose === "point" && <Path d="M-5 -19l-3 11M5 -19l11 -3" stroke={sleeve} strokeWidth={2.8} strokeLinecap="round" />}
      {pose === "wave" && <Path d="M-5 -19l-3 11M5 -19l6 -10" stroke={sleeve} strokeWidth={2.8} strokeLinecap="round" />}
      {pose === "carry" && (
        <G>
          <Path d="M-5 -19l-2 -10M5 -19l2 -10" stroke={sleeve} strokeWidth={2.8} strokeLinecap="round" />
          <Rect x={-7} y={-37} width={14} height={5} rx={1} fill={MUD} stroke={MUD_DARK} strokeWidth={0.6} />
        </G>
      )}
      {sitting && <Path d="M-5 -14l-5 6M5 -14l5 6" stroke={sleeve} strokeWidth={2.8} strokeLinecap="round" />}
      {!sitting && <Path d="M-6 0h4M2 0h4" stroke="#3d2a18" strokeWidth={1.4} strokeLinecap="round" />}
      <Circle cx={0} cy={headY} r={4.6} fill={skin} />
      <Circle cx={-1.7} cy={headY - 0.3} r={0.6} fill="#2b1d14" />
      <Circle cx={1.7} cy={headY - 0.3} r={0.6} fill="#2b1d14" />
      <Path d={`M-2.6 ${headY - 1.8}h1.8M0.8 ${headY - 1.8}h1.8`} stroke="#2b1d14" strokeWidth={0.5} strokeLinecap="round" />
      {beard ? (
        <Path d={`M-3.8 ${headY + 1.2}q3.8 6 7.6 0q-0.8 4-3.8 4.2q-3-0.2-3.8-4.2Z`} fill="#2b1d14" />
      ) : (
        <Path d={`M-1 ${headY + 2}q1 0.8 2 0`} stroke="#7a3b2a" strokeWidth={0.6} strokeLinecap="round" fill="none" />
      )}
      <Path d={`M-5.4 ${headY + 1}q0-8 5.4-8q5.4 0 5.4 8l1 5h-2.2l-0.6-4.4q-3.6-4-7.2 0l-0.6 4.4h-2.2Z`} fill={cloth} />
      <Path d={`M-4.8 ${headY - 3}q4.8-1.4 9.6 0`} stroke="#2b1d14" strokeWidth={1.1} fill="none" />
    </G>
  );
}

function Crowd({ count = 7 }: { count?: number | undefined }) {
  const next = seeded(count + 9);
  return (
    <G>
      {Array.from({ length: count }, (_, index) => (
        <Figure key={index} x={(index - (count - 1) / 2) * 9 + (next() - 0.5) * 4} height={22 + next() * 6} seed={index + 1} />
      ))}
    </G>
  );
}

function Rows({ count = 3 }: { count?: number | undefined }) {
  return (
    <G>
      {Array.from({ length: count }, (_, row) => (
        <G key={row} transform={`translate(${row * 6} ${-row * 9}) scale(${1 - row * 0.12})`}>
          {Array.from({ length: 9 }, (_, index) => (
            <Figure key={index} x={(index - 4) * 9} height={22} seed={row * 9 + index} />
          ))}
        </G>
      ))}
    </G>
  );
}

function People({ count = 5, pose = "stand" }: { count?: number | undefined; pose?: Pose }) {
  return (
    <G>
      {Array.from({ length: count }, (_, index) => (
        <Person
          key={index}
          x={(index - (count - 1) / 2) * 13}
          seed={index + 2}
          pose={pose}
          beard={index % 3 !== 2}
          flip={index % 2 === 1}
        />
      ))}
    </G>
  );
}

function Wavers({ count = 6 }: { count?: number | undefined }) {
  return (
    <G>
      {Array.from({ length: count }, (_, index) => (
        <Person
          key={index}
          x={(index - (count - 1) / 2) * 13}
          seed={index + 7}
          pose={index % 2 ? "wave" : "stand"}
          beard={index % 3 !== 1}
        />
      ))}
    </G>
  );
}

function Council() {
  return (
    <G>
      {[-30, -15, 15, 30].map((x, index) => (
        <Person key={x} x={x} seed={index + 21} pose="sit" flip={x > 0} />
      ))}
      <Person x={0} seed={25} pose="point" />
    </G>
  );
}

function Searchers() {
  return (
    <G>
      <Person x={-14} seed={31} pose="point" />
      <Person x={2} seed={32} />
      <Person x={16} seed={33} pose="point" flip />
    </G>
  );
}

function Diggers() {
  return (
    <G>
      {[-60, -25, 15, 50].map((x, index) => (
        <Person key={x} x={x} pose={index % 2 === 0 ? "carry" : "stand"} seed={index + 3} flip={index % 2 === 1} />
      ))}
    </G>
  );
}

function BrickCarriers() {
  return (
    <G>
      {[-36, -12, 12, 36].map((x, index) => (
        <Person key={x} x={x} seed={index + 71} pose={index % 2 ? "carry" : "stand"} flip={index % 2 === 0} />
      ))}
      <Path d="M-60 0h16v-8h-16ZM44 0h16v-10H44Z" fill={MUD} stroke={MUD_DARK} strokeWidth={0.8} />
    </G>
  );
}

function ClothStone() {
  return (
    <G>
      <Bob by={6} seconds={3}>
        <Path d="M-30 -22q30 10 60 0" stroke="#efe6d2" strokeWidth={5} fill="none" strokeLinecap="round" />
        <Ellipse cx={0} cy={-19} rx={6} ry={4} fill="#111" />
      </Bob>
      {[-34, -14, 14, 34].map((x, index) => (
        <Person key={x} x={x} seed={index + 11} flip={x > 0} />
      ))}
    </G>
  );
}

function Banner({ color = "#ffffff" }: { color?: string }) {
  return (
    <G>
      <Path d="M0 0V-40" stroke={WOOD} strokeWidth={2} />
      <Sway degrees={8} seconds={2} ox={0} oy={-34}>
        <Path d="M0 -40h18l-4 6 4 6H0Z" fill={color} />
      </Sway>
    </G>
  );
}

function Army({ count = 2 }: { count?: number | undefined }) {
  return (
    <G>
      {Array.from({ length: count }, (_, row) => (
        <G key={row} transform={`translate(${row * 8} ${-row * 6}) scale(${0.7 - row * 0.1})`}>
          {Array.from({ length: 12 }, (_, index) => (
            <Figure key={index} x={(index - 6) * 8} height={22} seed={row * 12 + index} />
          ))}
        </G>
      ))}
      <G transform="translate(-40 -2)">
        <Banner />
      </G>
    </G>
  );
}

function Soldiers({ count = 2 }: { count?: number | undefined }) {
  return (
    <G>
      {Array.from({ length: count }, (_, row) => (
        <G key={row} transform={`translate(${row * 10} ${-row * 7}) scale(${0.85 - row * 0.12})`}>
          {Array.from({ length: 8 }, (_, index) => (
            <G key={index} transform={`translate(${(index - 3.5) * 12} 0)`}>
              <Path d="M7 -38V2" stroke={WOOD} strokeWidth={1.2} />
              <Path d="M7 -38l-1.6 4h3.2Z" fill="#9aa0a8" />
              <Person seed={row * 8 + index + 90} flip={index % 2 === 0} />
            </G>
          ))}
        </G>
      ))}
      <G transform="translate(-52 -6)">
        <Banner />
      </G>
      <G transform="translate(40 -10) scale(0.9)">
        <Banner color="#1f1f1f" />
      </G>
    </G>
  );
}

function Pilgrims({ count = 7 }: { count?: number | undefined }) {
  return (
    <G>
      {Array.from({ length: count }, (_, index) => (
        <G key={index} transform={`translate(${(index - (count - 1) / 2) * 12} ${(index % 2) * 3})`}>
          <Path d="M-6 -22q6-2 12 0l3 22h-18Z" fill="#f6f1e4" stroke="#00000020" strokeWidth={0.6} />
          <Path d="M-6 -20l12 6" stroke="#e2d9c4" strokeWidth={2} />
          <Circle cx={0} cy={-27} r={4.6} fill={SKINS[index % SKINS.length]} />
          <Circle cx={-1.7} cy={-27.3} r={0.6} fill="#2b1d14" />
          <Circle cx={1.7} cy={-27.3} r={0.6} fill="#2b1d14" />
          {index % 3 !== 2 && <Path d="M-3.8 -25.8q3.8 6 7.6 0q-0.8 4-3.8 4.2q-3-0.2-3.8-4.2Z" fill="#2b1d14" />}
          <Path d="M-4.4 -30.5q4.4-4 8.8 0" stroke="#2b1d14" strokeWidth={1.6} fill="none" />
        </G>
      ))}
    </G>
  );
}

function Lookout() {
  return (
    <G>
      <Path d="M-14 0V-64h28V0Z" fill="#7d7468" />
      <Path d="M-17 -64h34v-4h-34Z" fill="#6a6257" />
      <Path d="M-4 0v-12h8V0Z" fill="#3d2a18" />
      <G transform="translate(0 -68)">
        <Person seed={41} pose="wave" />
      </G>
    </G>
  );
}

// ---------------------------------------------------------------------------------------------
// Buildings and places

function House({ lit = false, floors = 1 }: { lit?: boolean; floors?: number }) {
  const night = useContext(NightContext);
  const height = 24 * floors;
  return (
    <G>
      <Path d={`M-18 0V${-height}h36V0Z`} fill={night ? "#5e4630" : MUD} />
      <Path d={`M8 0V${-height}h10V0Z`} fill="#00000014" />
      <Path d={`M-14 ${-height + 9}h7M-12 ${-height + 15}h5M4 -8h6`} stroke="#00000018" strokeWidth={1} strokeLinecap="round" />
      <Path d={`M-20 ${-height}h40v-3h-40Z`} fill={MUD_DARK} />
      {[-14, -6, 2, 10].map((x) => (
        <Rect key={x} x={x} y={-height + 1} width={2.4} height={2.4} fill={WOOD} />
      ))}
      {floors > 1 && <Path d="M-18 -24h36" stroke={MUD_DARK} strokeWidth={1.5} />}
      <Path d="M-6.5 0v-13a6.5 6.5 0 0 1 13 0V0Z" fill={WOOD} />
      <Path d="M-5 0v-12a5 5 0 0 1 10 0V0Z" fill={lit ? GOLD_SOFT : "#3d2a18"} />
      <Rect x={8} y={-height + 7} width={5} height={5} rx={0.6} fill={lit || night ? GOLD : "#3d2a18"} />
      {lit && (
        <Pulse from={0.25} to={0.5}>
          <Ellipse cx={0} cy={-4} rx={16} ry={8} fill={GOLD} opacity={0.4} />
        </Pulse>
      )}
    </G>
  );
}

function Kaaba() {
  return (
    <G>
      <Ellipse cx={0} cy={1} rx={50} ry={7} fill={GOLD} opacity={0.15} />
      <Path d="M-30 0V-44l24-6 30 6V0l-30 4Z" fill="#141414" />
      <Path d="M-6 -50l30 6V0l-30 4Z" fill="#202020" />
      <Path d="M-30 -34l24-5 30 5v6l-30-5-24 5Z" fill={GOLD} />
      <Path d="M2 -16h14v15l-14 2Z" fill="#9c7a26" />
      <Path d="M4 -14h10v12l-10 1Z" fill="#c9a24a" />
    </G>
  );
}

function KaabaBuilding() {
  return (
    <G>
      <Path d="M-30 0V-26l24-5 30 5V0l-30 4Z" fill="#6f6658" />
      <Path d="M-30 -6l24-5 30 5M-30 -12l24-5 30 5M-30 -18l24-5 30 5" stroke="#5a5246" strokeWidth={1} fill="none" />
      <Path d="M-34 0V-44M28 0V-44M-34 -40h62M-34 -22h62" stroke={WOOD} strokeWidth={2} />
    </G>
  );
}

function Mosque() {
  return (
    <G>
      <Path d="M-50 0V-26h100V0Z" fill={MUD} />
      <Path d="M-55 -26h110l-4-6h-102Z" fill={MUD_DARK} />
      {[-36, -18, 0, 18, 36].map((x) => (
        <Rect key={x} x={x - 2} y={-22} width={4} height={22} fill={WOOD} />
      ))}
    </G>
  );
}

function Fort() {
  return (
    <G>
      <Path d="M-34 0V-40h68V0Z" fill="#8c7b62" />
      <Path d="M-34 -45h8v5h-8ZM-17 -45h8v5h-8ZM0 -45h8v5H0ZM17 -45h8v5h-8Z" fill="#7a6a52" />
      <Path d="M-6 0v-14a6 6 0 0 1 12 0V0Z" fill="#3d2a18" />
      <Rect x={-24} y={-30} width={4} height={7} fill="#3d2a18" />
      <Rect x={20} y={-30} width={4} height={7} fill="#3d2a18" />
    </G>
  );
}

function Court() {
  return (
    <G>
      <Path d="M-60 0V-48h120V0Z" fill="#a7805a" />
      <Path d="M-66 -48h132l-10-14H-56Z" fill="#7a5233" />
      {[-46, -24, 24, 46].map((x) => (
        <Rect key={x} x={x - 3} y={-46} width={6} height={46} fill="#e9dcc0" />
      ))}
      <Path d="M-12 0v-22h24V0Z" fill="#7a2e2e" />
      <Path d="M-14 -22h28v-6h-28Z" fill={GOLD} />
    </G>
  );
}

function Tent({ blown = false }: { blown?: boolean }) {
  const body = (
    <G>
      <Path d="M-24 0 -16 -18h32L24 0Z" fill="#2b2420" />
      <Path d="M-16 -18 0 -24l16 6Z" fill="#3a302a" />
      <Path d="M-4 0v-12h8V0Z" fill="#7a5a3a" />
    </G>
  );
  return blown ? (
    <Sway degrees={6} seconds={1.6} ox={0} oy={0}>
      {body}
    </Sway>
  ) : (
    body
  );
}

function Arish() {
  return (
    <G>
      <Path d="M-22 0V-22M22 0V-22" stroke={WOOD} strokeWidth={3} />
      <Path d="M-28 -22q28-12 56 0" stroke={LEAF} strokeWidth={6} fill="none" strokeLinecap="round" />
      <Path d="M-26 -20q26-8 52 0" stroke="#3f7d53" strokeWidth={4} fill="none" />
    </G>
  );
}

function Well() {
  return (
    <G>
      <Ellipse cx={0} cy={-2} rx={14} ry={5} fill="#7a6a52" />
      <Path d="M-14 -2v-8h28v8" fill="#8c7b62" />
      <Path d="M-12 -10V-26M12 -10V-26M-14 -26h28" stroke={WOOD} strokeWidth={2.5} />
      <Path d="M0 -26v10" stroke="#3d2a18" strokeWidth={1} />
    </G>
  );
}

function Graves() {
  return (
    <G>
      {[-30, -10, 10, 30].map((x, index) => (
        <G key={x} transform={`translate(${x} ${index % 2 ? -4 : 0})`}>
          <Ellipse cx={0} cy={0} rx={9} ry={3} fill="#8a6a45" />
          <Rect x={-1.5} y={-8} width={3} height={8} fill="#6f6658" />
        </G>
      ))}
    </G>
  );
}

function Trench() {
  return (
    <G>
      <Path d="M-200 -6c60-6 120 4 200-2s140 6 200 0v14c-60 4-120-6-200 2s-140-4-200 0Z" fill="#120c06" />
      {[-160, -100, -40, 20, 80, 140].map((x) => (
        <Path key={x} d={`M${x - 20} 12q20-14 40 0Z`} fill="#5a432a" />
      ))}
    </G>
  );
}

function Rock() {
  return (
    <G>
      <Path d="M-22 0q-6-22 10-30t30 6q8 18-4 24Z" fill="#6f6658" />
      <Path d="M-4 -26l4 10-6 6 6 10" stroke="#3d362e" strokeWidth={1.5} fill="none" />
      <Pulse from={0} to={1} seconds={1.4}>
        <Circle cx={2} cy={-34} r={1.6} fill={GOLD_SOFT} />
        <Circle cx={-6} cy={-30} r={1.2} fill={GOLD_SOFT} />
      </Pulse>
    </G>
  );
}

// ---------------------------------------------------------------------------------------------
// Land

function MountNour() {
  return (
    <G>
      <Path d="M-110 0 -40 -90l14 10 28 50 60 30Z" fill="#2b2a24" />
      <Path d="m-40 -90 14 10 28 50-22-18Z" fill="#3a382f" />
      <Pulse from={0.5} to={1} seconds={4}>
        <Ellipse cx={-28} cy={-74} rx={5} ry={3.4} fill={GOLD} />
        <Circle cx={-28} cy={-74} r={16} fill={GOLD} opacity={0.18} />
      </Pulse>
    </G>
  );
}

function MountThawr() {
  return (
    <G>
      <Path d="M-120 0 -50 -70l40 14 50-30 80 86Z" fill="#3a2f26" />
      <Path d="M-14 -40q8-10 18 0v6h-18Z" fill="#0b0805" />
    </G>
  );
}

function Uhud() {
  return <Path d="M-200 0 -160 -40l40 14 30-40 50 26 40-36 60 34 40-16 50 30 50-10V0Z" fill="#8a4b32" />;
}

function Rumat() {
  return (
    <G>
      <Path d="M-40 0c8-20 26-26 40-26s32 8 40 26Z" fill="#b98a55" />
      <G transform="translate(4 -26)">
        <Banner color={LEAF} />
      </G>
    </G>
  );
}

function Palm() {
  return (
    <G>
      <Path d="M0 0c2-26 0-46-3-64" stroke={WOOD} strokeWidth={4.5} fill="none" />
      {[-8, -16, -24, -32, -40, -48, -56].map((y) => (
        <Path key={y} d={`M-2.6 ${y}h4.6`} stroke="#4e3519" strokeWidth={1} />
      ))}
      <Sway degrees={3} seconds={5} ox={-3} oy={-64}>
        {[-70, -35, 0, 35, 70, 115, 150].map((angle, index) => {
          const radians = ((angle - 90) * Math.PI) / 180;
          return (
            <Path
              key={angle}
              d={`M-3 -64q${20 * Math.cos(radians)} ${-6 + 14 * Math.sin(radians)} ${30 * Math.cos(radians)} ${20 + 16 * Math.sin(radians)}`}
              stroke={index % 2 ? LEAF : "#3f7d53"}
              strokeWidth={4}
              strokeLinecap="round"
              fill="none"
            />
          );
        })}
        <Circle cx={-6} cy={-58} r={2.6} fill="#a8541f" />
        <Circle cx={1} cy={-57} r={2.4} fill="#c06a2a" />
      </Sway>
    </G>
  );
}

function Acacia() {
  return (
    <G>
      <Path
        d="M0 0c-4-24 4-40-2-56M-2 -40c-12-8-22-10-34-16M0 -46c12-6 22-8 34-16"
        stroke={WOOD}
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
      />
      <Sway degrees={1} seconds={7} ox={0} oy={-56}>
        <Ellipse cx={0} cy={-64} rx={64} ry={13} fill="#4f7a3a" />
        <Ellipse cx={-20} cy={-69} rx={30} ry={8} fill="#5d8a45" />
        <Ellipse cx={24} cy={-68} rx={28} ry={7} fill="#5d8a45" />
      </Sway>
    </G>
  );
}

function Bush() {
  return (
    <G>
      <Ellipse cx={-6} cy={-6} rx={10} ry={7} fill="#6b7d3e" />
      <Ellipse cx={7} cy={-7} rx={9} ry={7} fill="#7d8f4a" />
    </G>
  );
}

function Harrah() {
  const next = seeded(83);
  return (
    <G>
      {Array.from({ length: 22 }, (_, index) => (
        <Ellipse
          key={index}
          cx={(next() - 0.5) * 220}
          cy={-next() * 10}
          rx={4 + next() * 9}
          ry={2 + next() * 4}
          fill={index % 3 ? "#3a3530" : "#2b2622"}
        />
      ))}
    </G>
  );
}

function Coast() {
  return (
    <G>
      <Rect x={-320} y={-16} width={640} height={16} fill="#2a7f9e" />
      <Path
        d="M-300 -10q20-4 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0"
        stroke="#cfe8ef"
        strokeOpacity={0.5}
        strokeWidth={1.5}
        fill="none"
      />
    </G>
  );
}

function Skyline() {
  return (
    <G fill="#c2a172">
      {[-180, -140, -105, -60, -20, 30, 70, 110, 150, 185].map((x, index) => (
        <Rect key={x} x={x} y={-18 - (index % 3) * 6} width={26 + (index % 2) * 10} height={18 + (index % 3) * 6} />
      ))}
    </G>
  );
}

function PalmRow() {
  return (
    <G>
      {[-170, -130, -90, -40, 40, 90, 130, 170].map((x) => (
        <G key={x}>
          <Rect x={x - 1} y={-14} width={2} height={14} fill="#5a3f22" />
          <Ellipse cx={x} cy={-16} rx={12} ry={5} fill="#3f6b4a" />
        </G>
      ))}
    </G>
  );
}

function Cliffs() {
  return (
    <G fill="#7a6048">
      <Path d="M-220 0V-110l60 30 40 80Z" />
      <Path d="M220 0V-120l-70 40-40 80Z" />
    </G>
  );
}

function Dunes() {
  return (
    <G>
      <Path d="M-220 0q110-30 220 0t220 0Z" fill="#e8cf99" />
      <Path d="M-200 0q90-18 180 0" fill="#ddc088" />
    </G>
  );
}

// ---------------------------------------------------------------------------------------------
// Animals and things that move

function Camel({ load = false }: { load?: boolean }) {
  const coat = "#b98546";
  const shade = "#9a6a35";
  return (
    <Bob by={1.2} seconds={1}>
      {[-13, -6, 9, 15].map((x, index) => (
        <Path
          key={x}
          d={`M${x} -17l1 9-1 8`}
          stroke={index % 2 ? shade : coat}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
      <Path d="M-20 -18q-2-8 6-10q6-12 14-11q8 1 10 11q8 1 9 8q1 6-6 7h-28q-5 0-5-5Z" fill={coat} />
      <Path d="M-20 -18q-3 4-2 9" stroke={shade} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Path d="M16 -20q8-2 10-10q1-6 5-8" stroke={coat} strokeWidth={5} strokeLinecap="round" fill="none" />
      <Path d="M29 -40q6-1 9 2q1 2-2 3q-4 1-8-1Z" fill={coat} />
      <Circle cx={33} cy={-38.6} r={0.6} fill="#2b1d14" />
      {load && (
        <G>
          <Path d="M-10 -36q10-6 20 0v8h-20Z" fill="#7a2e2e" />
          <Path d="M-11 -28h22" stroke={GOLD} strokeWidth={1.4} />
        </G>
      )}
    </Bob>
  );
}

function CamelKneeling() {
  return (
    <G>
      <Pulse from={0.15} to={0.4}>
        <Ellipse cx={0} cy={-2} rx={34} ry={6} fill={GOLD} />
      </Pulse>
      <Ellipse cx={0} cy={-8} rx={20} ry={8} fill="#a8763f" />
      <Path d="M-8 -14q8-14 16 0Z" fill="#a8763f" />
      <Path d="M17 -10q8-4 8-18" stroke="#a8763f" strokeWidth={5} strokeLinecap="round" fill="none" />
      <Ellipse cx={28} cy={-30} rx={5} ry={3} fill="#a8763f" />
      <Path d="M-10 -16h20v5h-20Z" fill="#7a2e2e" />
    </G>
  );
}

function Caravan() {
  return (
    <G>
      {[-44, 0, 44].map((x) => (
        <G key={x} transform={`translate(${x} 0)`}>
          <Camel load />
        </G>
      ))}
    </G>
  );
}

function Party() {
  return (
    <G>
      <G transform="translate(48 0)">
        <Camel load />
        <G transform="translate(-1 -28)">
          <Person seed={61} pose="sit" />
        </G>
      </G>
      {[0, -48].map((x) => (
        <G key={x} transform={`translate(${x} 0)`}>
          <Camel load />
          <Pulse from={0.45} to={0.85} seconds={3}>
            <Circle cx={0} cy={-42} r={8} fill={GOLD_SOFT} />
            <Circle cx={0} cy={-42} r={16} fill={GOLD} opacity={0.2} />
          </Pulse>
        </G>
      ))}
    </G>
  );
}

function Mule() {
  return (
    <G>
      {[-12, -7, 7, 12].map((x) => (
        <Path key={x} d={`M${x} -14v14`} stroke="#d8d4cb" strokeWidth={3} strokeLinecap="round" />
      ))}
      <Ellipse cx={0} cy={-18} rx={16} ry={7} fill="#efece4" />
      <Path d="M13 -20q6-2 8-12" stroke="#efece4" strokeWidth={5} strokeLinecap="round" fill="none" />
      <Path d="M20 -34l3-6 1 7Z" fill="#efece4" />
      <Pulse from={0.3} to={0.7}>
        <Circle cx={0} cy={-44} r={10} fill={GOLD_SOFT} opacity={0.6} />
      </Pulse>
    </G>
  );
}

function Suraqa() {
  return (
    <G>
      <Bob by={3} seconds={2.4}>
        <Ellipse cx={0} cy={-12} rx={17} ry={7} fill="#6b3f22" />
        <Path d="M14 -14q7-3 9-14" stroke="#6b3f22" strokeWidth={5} strokeLinecap="round" fill="none" />
        <Path d="M21 -30l5-2-1 6Z" fill="#6b3f22" />
        <G transform="translate(-2 -16)">
          <Person seed={51} pose="sit" />
        </G>
      </Bob>
      <Path d="M-30 0q30-12 60 0Z" fill="#d9b874" />
      <Dust />
    </G>
  );
}

function Elephant() {
  return (
    <Drift dx={-10} seconds={6}>
      {[-16, -6, 8, 18].map((x) => (
        <Rect key={x} x={x - 3.5} y={-18} width={7} height={18} rx={2} fill="#7d7a76" />
      ))}
      <Ellipse cx={0} cy={-26} rx={26} ry={16} fill="#8a8781" />
      <Ellipse cx={24} cy={-32} rx={11} ry={10} fill="#8a8781" />
      <Path d="M33 -30q6 10 2 22" stroke="#8a8781" strokeWidth={5} strokeLinecap="round" fill="none" />
      <Ellipse cx={20} cy={-34} rx={6} ry={8} fill="#76736e" />
      <Circle cx={28} cy={-35} r={1} fill="#2b1d14" />
      <Path d="M-8 -42h20v6h-20Z" fill="#7a2e2e" />
    </Drift>
  );
}

function Sheep({ count = 5 }: { count?: number | undefined }) {
  const next = seeded(count * 7);
  return (
    <G>
      {Array.from({ length: count }, (_, index) => {
        const x = (index - (count - 1) / 2) * 13 + (next() - 0.5) * 6;
        const y = (next() - 0.5) * 6;
        return (
          <G key={index} transform={`translate(${x} ${y})`}>
            <Path d="M-4 0v-4M4 0v-4" stroke="#3d2a18" strokeWidth={1.5} />
            <Ellipse cx={0} cy={-7} rx={7} ry={4.5} fill="#f1ebdd" />
            <Ellipse cx={7} cy={-9} rx={2.6} ry={2} fill="#3d2a18" />
          </G>
        );
      })}
    </G>
  );
}

function Ship() {
  return (
    <Bob by={3} seconds={4}>
      <Path d="M-40 0h80l-12 14h-56Z" fill={WOOD} />
      <Path d="M0 0V-70l32 64Z" fill="#fbf8f1" />
      <Path d="M0 0V-62l-26 56Z" fill="#efe6d2" />
    </Bob>
  );
}

function Birds({ count = 3 }: { count?: number | undefined }) {
  return (
    <Drift dx={50} seconds={18}>
      {Array.from({ length: count }, (_, index) => (
        <Path key={index} d={`M${index * 14} ${index % 2 ? -6 : 0}q4-4 8 0q4-4 8 0`} stroke={INK} strokeWidth={1.5} fill="none" />
      ))}
    </Drift>
  );
}

function Dust() {
  return (
    <Slide dx={40} seconds={4}>
      <Ellipse cx={0} cy={-8} rx={30} ry={9} fill="#e6d3a8" />
      <Ellipse cx={22} cy={-14} rx={18} ry={7} fill="#efe0bd" />
    </Slide>
  );
}

function Wind() {
  return (
    <G>
      {[0, 30, 60].map((y, index) => (
        <Slide key={y} dx={480} seconds={2.4 + index * 0.6} delay={index * 0.5}>
          <Path d={`M-200 ${-y}q40-10 80 0t80 0`} stroke="#ffffff" strokeOpacity={0.35} strokeWidth={2} fill="none" />
        </Slide>
      ))}
    </G>
  );
}

function Arrows() {
  return (
    <G>
      {[0, 1, 2, 3, 4].map((index) => (
        <Slide key={index} dx={30} dy={50} seconds={1.2} delay={index * 0.25}>
          <Path d={`M${index * 22 - 40} -90l14 22`} stroke="#2b2420" strokeWidth={1.6} />
        </Slide>
      ))}
    </G>
  );
}

function Cloud() {
  return (
    <Drift dx={8} seconds={8}>
      <Ellipse cx={0} cy={0} rx={40} ry={13} fill="#f4efe6" opacity={0.9} />
      <Ellipse cx={-18} cy={-8} rx={20} ry={10} fill="#f8f4ec" />
      <Ellipse cx={16} cy={-9} rx={22} ry={11} fill="#f8f4ec" />
    </Drift>
  );
}

function Streak() {
  return (
    <Pulse from={0.4} to={0.95} seconds={4}>
      <Path d="M0 0C10 -60 -10 -120 0 -190" stroke={GOLD_SOFT} strokeWidth={3} strokeLinecap="round" fill="none" />
      <Circle cx={0} cy={-190} r={14} fill={GOLD_SOFT} opacity={0.35} />
    </Pulse>
  );
}

function Footprints() {
  return (
    <G opacity={0.6}>
      {Array.from({ length: 7 }, (_, index) => (
        <Ellipse key={index} cx={index * 12} cy={index % 2 ? -3 : 0} rx={2.4} ry={1.4} fill="#8a6a45" opacity={1 - index * 0.12} />
      ))}
    </G>
  );
}

// ---------------------------------------------------------------------------------------------
// Light and objects

/** A soft light: revelation, or his presence where he is never drawn. Its gradient is in the panorama's Defs. */
function Light() {
  const clock = useClock();
  const animatedProps = useAnimatedProps(() => ({ r: 26 * (1 + 0.08 * Math.sin((2 * Math.PI * clock.get()) / 4)) }));
  return <AnimatedCircle cx={0} cy={-20} fill="url(#seerah-light)" animatedProps={animatedProps} />;
}

function Lantern() {
  return (
    <G>
      <Path d="M0 -30v-10" stroke="#3d2a18" strokeWidth={1} />
      <Path d="M-4 -30h8l2 10h-12Z" fill="#7a5a3a" />
      <Pulse from={0.6} to={1} seconds={1.6}>
        <Ellipse cx={0} cy={-25} rx={3} ry={4} fill={GOLD_SOFT} />
        <Circle cx={0} cy={-25} r={10} fill={GOLD} opacity={0.25} />
      </Pulse>
    </G>
  );
}

function Fire() {
  return (
    <G>
      <Path d="M-8 0h16M-6 -2l12 2" stroke={WOOD} strokeWidth={2.5} />
      <Pulse from={0.7} to={1} seconds={0.9}>
        <Path d="M0 -2c-6-4-6-10 0-16 6 6 6 12 0 16Z" fill="#f0a040" />
      </Pulse>
      <Circle cx={0} cy={-8} r={14} fill="#f0a040" opacity={0.18} />
    </G>
  );
}

function Idols({ falling = false }: { falling?: boolean }) {
  return (
    <G>
      {[-60, -40, -22, 22, 40, 60].map((x, index) =>
        falling && index % 2 === 0 ? (
          <Rect key={x} x={x - 8} y={-6} width={16} height={6} rx={2} fill="#6f6658" />
        ) : (
          <Rect key={x} x={x - 3} y={-14 - (index % 3) * 3} width={6} height={14 + (index % 3) * 3} rx={2} fill="#6f6658" />
        ),
      )}
    </G>
  );
}

function Scroll() {
  return (
    <G>
      <Path d="M-40 0V-70h80V0Z" fill="#f3e6c6" />
      <Rect x={-46} y={-76} width={92} height={9} rx={4.5} fill="#d9c08f" />
      <Rect x={-46} y={-3} width={92} height={9} rx={4.5} fill="#d9c08f" />
      {[-60, -50, -40, -30].map((y, index) => (
        <Path key={y} d={`M${-30 + (index % 2) * 6} ${y}h${60 - (index % 2) * 6}`} stroke="#b39a6a" strokeWidth={2} strokeLinecap="round" />
      ))}
      <Circle cx={0} cy={-15} r={8} fill="#c9ccd1" />
    </G>
  );
}

/** The ring's seal: three lines, as the hadith names them; their words are in the tap note. */
function Seal() {
  return (
    <G>
      <Circle cx={0} cy={-34} r={34} fill="#c9ccd1" />
      <Circle cx={0} cy={-34} r={28} fill="none" stroke="#8d939b" strokeWidth={2} />
      {[-48, -34, -20].map((y) => (
        <Path key={y} d={`M-14 ${y}h28`} stroke="#4b5058" strokeWidth={3} strokeLinecap="round" />
      ))}
    </G>
  );
}

// ---------------------------------------------------------------------------------------------
// The registry: how to draw each part, how tall it stands (for its tap marker), and how wide a
// shadow it casts.

export const PARTS: Record<ScenePart, { draw: (item: SceneItem) => ReactNode; height: number; shadow?: number }> = {
  house: { draw: () => <House />, height: 28, shadow: 22 },
  "house-2": { draw: () => <House floors={2} />, height: 52, shadow: 22 },
  "house-lit": { draw: () => <House lit />, height: 28, shadow: 22 },
  kaaba: { draw: () => <Kaaba />, height: 52, shadow: 40 },
  "kaaba-building": { draw: () => <KaabaBuilding />, height: 46, shadow: 36 },
  mosque: { draw: () => <Mosque />, height: 32, shadow: 56 },
  fort: { draw: () => <Fort />, height: 46, shadow: 38 },
  court: { draw: () => <Court />, height: 62, shadow: 64 },
  tent: { draw: () => <Tent />, height: 24, shadow: 26 },
  "tent-blown": { draw: () => <Tent blown />, height: 24, shadow: 26 },
  arish: { draw: () => <Arish />, height: 30, shadow: 28 },
  well: { draw: () => <Well />, height: 28, shadow: 16 },
  graves: { draw: () => <Graves />, height: 12 },
  trench: { draw: () => <Trench />, height: 10 },
  rock: { draw: () => <Rock />, height: 32, shadow: 24 },
  "mount-nour": { draw: () => <MountNour />, height: 92 },
  "mount-thawr": { draw: () => <MountThawr />, height: 60 },
  uhud: { draw: () => <Uhud />, height: 60 },
  rumat: { draw: () => <Rumat />, height: 64 },
  palm: { draw: () => <Palm />, height: 80, shadow: 10 },
  acacia: { draw: () => <Acacia />, height: 78, shadow: 34 },
  bush: { draw: () => <Bush />, height: 14, shadow: 14 },
  camel: { draw: () => <Camel />, height: 42, shadow: 22 },
  "camel-kneeling": { draw: () => <CamelKneeling />, height: 34, shadow: 26 },
  caravan: { draw: () => <Caravan />, height: 42, shadow: 70 },
  mule: { draw: () => <Mule />, height: 54, shadow: 18 },
  sheep: { draw: (item) => <Sheep count={item.count} />, height: 14, shadow: 34 },
  ship: { draw: () => <Ship />, height: 70 },
  birds: { draw: (item) => <Birds count={item.count} />, height: 8 },
  dust: { draw: () => <Dust />, height: 20 },
  wind: { draw: () => <Wind />, height: 60 },
  arrows: { draw: () => <Arrows />, height: 90 },
  cloud: { draw: () => <Cloud />, height: 20 },
  streak: { draw: () => <Streak />, height: 200 },
  footprints: { draw: () => <Footprints />, height: 6 },
  crowd: { draw: (item) => <Crowd count={item.count} />, height: 30, shadow: 40 },
  rows: { draw: (item) => <Rows count={item.count} />, height: 44, shadow: 48 },
  army: { draw: (item) => <Army count={item.count} />, height: 44, shadow: 60 },
  diggers: { draw: () => <Diggers />, height: 34, shadow: 60 },
  walker: { draw: () => <Figure height={26} carry seed={4} />, height: 32, shadow: 8 },
  "cloth-stone": { draw: () => <ClothStone />, height: 34, shadow: 40 },
  light: { draw: () => <Light />, height: 46 },
  lantern: { draw: () => <Lantern />, height: 42, shadow: 4 },
  fire: { draw: () => <Fire />, height: 22, shadow: 10 },
  banner: { draw: () => <Banner />, height: 42, shadow: 6 },
  idols: { draw: () => <Idols />, height: 22, shadow: 60 },
  "idols-falling": { draw: () => <Idols falling />, height: 18, shadow: 60 },
  scroll: { draw: () => <Scroll />, height: 78, shadow: 40 },
  seal: { draw: () => <Seal />, height: 70, shadow: 30 },
  people: { draw: (item) => <People count={item.count} />, height: 34, shadow: 40 },
  wavers: { draw: (item) => <Wavers count={item.count} />, height: 36, shadow: 46 },
  council: { draw: () => <Council />, height: 34, shadow: 40 },
  searchers: { draw: () => <Searchers />, height: 34, shadow: 26 },
  lookout: { draw: () => <Lookout />, height: 102, shadow: 18 },
  suraqa: { draw: () => <Suraqa />, height: 44, shadow: 30 },
  party: { draw: () => <Party />, height: 58, shadow: 80 },
  "brick-carriers": { draw: () => <BrickCarriers />, height: 40, shadow: 56 },
  harrah: { draw: () => <Harrah />, height: 14 },
  coast: { draw: () => <Coast />, height: 16 },
  skyline: { draw: () => <Skyline />, height: 30 },
  "palm-row": { draw: () => <PalmRow />, height: 22 },
  cliffs: { draw: () => <Cliffs />, height: 110 },
  dunes: { draw: () => <Dunes />, height: 12 },
  soldiers: { draw: (item) => <Soldiers count={item.count} />, height: 44, shadow: 60 },
  pilgrims: { draw: (item) => <Pilgrims count={item.count} />, height: 34, shadow: 50 },
  elephant: { draw: () => <Elephant />, height: 48, shadow: 30 },
};
