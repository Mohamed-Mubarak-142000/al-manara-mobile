import { memo, type ReactNode } from "react";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";

import { getRewardItem } from "@/core/kids/catalog";
import { GARDEN_DECOR_SLOTS, GARDEN_STAGES } from "@/core/kids/garden";

/**
 * The website's GardenScene: the same 400 × 262 SVG garden, each finished stage drawn in and the ones still to
 * come as faint silhouettes, with the bought decorations in their places.
 */

const FLOWERS: [number, number, string][] = [
  [160, 236, "#ff8fb1"],
  [182, 242, "#ffd66b"],
  [236, 240, "#9ad7ff"],
  [258, 234, "#ff8fb1"],
  [280, 242, "#c9a2ff"],
];

const ARTWORK: Record<string, ReactNode> = {
  sprout: (
    <G>
      <Path d="M200 222 Q198 206 200 196" stroke="#3f8f2f" strokeWidth="4" fill="none" strokeLinecap="round" />
      <Path d="M200 204 Q186 194 182 200 Q190 210 200 204 Z" fill="#7bd389" stroke="#3f8f2f" strokeWidth="2" />
      <Path d="M200 198 Q214 186 220 194 Q210 204 200 198 Z" fill="#7bd389" stroke="#3f8f2f" strokeWidth="2" />
    </G>
  ),
  tree: (
    <G>
      <Rect x="84" y="160" width="16" height="56" rx="5" fill="#9a6a3f" stroke="#6b4423" strokeWidth="2" />
      <Circle cx="92" cy="146" r="30" fill="#4fb35a" stroke="#2f7d39" strokeWidth="2" />
      <Circle cx="70" cy="160" r="20" fill="#5cc267" stroke="#2f7d39" strokeWidth="2" />
      <Circle cx="114" cy="160" r="20" fill="#5cc267" stroke="#2f7d39" strokeWidth="2" />
      <Circle cx="82" cy="140" r="4" fill="#4b5d2a" />
      <Circle cx="102" cy="152" r="4" fill="#4b5d2a" />
    </G>
  ),
  flowers: (
    <G>
      {FLOWERS.map(([x, y, color]) => (
        <G key={x}>
          <Path d={`M${x} ${y} L${x} ${y + 14}`} stroke="#3f8f2f" strokeWidth="3" />
          <Circle cx={x} cy={y} r="7" fill={color} stroke="#ffffff" strokeWidth="2" />
          <Circle cx={x} cy={y} r="2.5" fill="#f5a623" />
        </G>
      ))}
    </G>
  ),
  fountain: (
    <G>
      <Ellipse cx="300" cy="214" rx="34" ry="9" fill="#9ad7ff" stroke="#3d8fc4" strokeWidth="2" />
      <Rect x="294" y="186" width="12" height="28" rx="3" fill="#dfe7ef" stroke="#8a9bb0" strokeWidth="2" />
      <Ellipse cx="300" cy="186" rx="18" ry="5" fill="#dfe7ef" stroke="#8a9bb0" strokeWidth="2" />
      <Path d="M300 182 Q290 160 280 184 M300 182 Q310 160 320 184 M300 182 L300 162" stroke="#6cc3f5" strokeWidth="3" fill="none" />
    </G>
  ),
  birds: (
    <G stroke="#3a4a5c" strokeWidth="3" fill="none" strokeLinecap="round">
      <Path d="M230 60 q8 -8 16 0 q8 -8 16 0" />
      <Path d="M270 44 q6 -6 12 0 q6 -6 12 0" />
      <Path d="M300 70 q5 -5 10 0 q5 -5 10 0" />
    </G>
  ),
  library: (
    <G stroke="#7a4e2a" strokeWidth="2" strokeLinejoin="round">
      <Path d="M306 140 L336 118 L366 140 Z" fill="#e8774a" />
      <Rect x="310" y="140" width="52" height="38" fill="#fff4d6" />
      <Rect x="330" y="156" width="12" height="22" fill="#9a6a3f" />
      <Rect x="314" y="146" width="12" height="8" fill="#9ad7ff" />
      <Rect x="346" y="146" width="12" height="8" fill="#9ad7ff" />
    </G>
  ),
  bridge: (
    <G>
      <Path d="M0 252 Q100 240 200 252 T400 250 L400 262 L0 262 Z" fill="#6cc3f5" opacity={0.8} />
      <Path d="M170 252 Q200 228 230 252" stroke="#9a6a3f" strokeWidth="6" fill="none" strokeLinecap="round" />
      <Path d="M176 244 L176 252 M188 236 L188 252 M200 233 L200 252 M212 236 L212 252 M224 244 L224 252" stroke="#9a6a3f" strokeWidth="3" />
    </G>
  ),
  house: (
    <G stroke="#7a4e2a" strokeWidth="2" strokeLinejoin="round">
      <Path d="M14 152 L40 128 L66 152 Z" fill="#e84a67" />
      <Rect x="18" y="152" width="44" height="34" fill="#fff6ec" />
      <Rect x="34" y="166" width="12" height="20" fill="#9a6a3f" />
      <Rect x="22" y="158" width="9" height="9" fill="#ffd66b" />
    </G>
  ),
  mosque: (
    <G stroke="#b07a00" strokeWidth="2" strokeLinejoin="round">
      <Rect x="244" y="104" width="12" height="82" fill="#ffffff" />
      <Path d="M244 104 L250 88 L256 104 Z" fill="#f5c542" />
      <Rect x="160" y="146" width="80" height="40" fill="#ffffff" />
      <Path d="M168 146 Q200 92 232 146 Z" fill="#f5c542" />
      <Path d="M200 98 L200 88" />
      <Path d="M196 88 Q200 82 204 88" fill="none" />
      <Path d="M190 186 L190 166 Q200 156 210 166 L210 186 Z" fill="#12a15b" />
    </G>
  ),
};

export const GardenScene = memo(function GardenScene({ doneStations, ownedItems, width }: { doneStations: number; ownedItems: string[]; width: number }) {
  const decor = ownedItems.filter((id) => getRewardItem(id)?.kind === "garden");
  return (
    <Svg width={width} height={(width * 262) / 400} viewBox="0 0 400 262" accessibilityLabel="حديقتك">
      <Defs>
        <LinearGradient id="garden-sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#a9e1ff" />
          <Stop offset="1" stopColor="#e8f8ff" />
        </LinearGradient>
      </Defs>
      <Rect width="400" height="262" fill="url(#garden-sky)" />
      <Circle cx="350" cy="40" r="22" fill="#ffd66b" />
      <Ellipse cx="80" cy="44" rx="34" ry="12" fill="#ffffff" opacity={0.9} />
      <Ellipse cx="150" cy="30" rx="24" ry="9" fill="#ffffff" opacity={0.8} />
      {decor.includes("rainbow") && (
        <G fill="none" strokeWidth="7" opacity={0.75}>
          <Path d="M110 180 A90 90 0 0 1 290 180" stroke="#e84a67" />
          <Path d="M117 180 A83 83 0 0 1 283 180" stroke="#f5b92e" />
          <Path d="M124 180 A76 76 0 0 1 276 180" stroke="#12a15b" />
          <Path d="M131 180 A69 69 0 0 1 269 180" stroke="#1f9be0" />
        </G>
      )}
      <Path d="M0 196 Q90 150 200 186 T400 176 L400 262 L0 262 Z" fill="#9ddc7a" />
      <Path d="M0 222 Q120 196 240 220 T400 214 L400 262 L0 262 Z" fill="#7cc95c" />
      {GARDEN_STAGES.map((stage) => {
        const art = ARTWORK[stage.id];
        if (!art) return null;
        // A faint silhouette shows what is still to come.
        return (
          <G key={stage.id} opacity={doneStations >= stage.stations ? 1 : 0.22}>
            {art}
          </G>
        );
      })}
      {decor
        .filter((id) => id !== "rainbow")
        .map((id) => {
          const slot = GARDEN_DECOR_SLOTS[id];
          const item = getRewardItem(id);
          if (!slot || !item) return null;
          return (
            <SvgText key={id} x={slot.x} y={slot.y} fontSize={slot.size} textAnchor="middle">
              {item.emoji}
            </SvgText>
          );
        })}
    </Svg>
  );
});
