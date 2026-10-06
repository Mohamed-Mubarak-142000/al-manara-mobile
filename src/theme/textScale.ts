import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";
import { Uniwind } from "uniwind";

/**
 * App-wide text size (the mushaf has its own size control). Tailwind's text-* utilities read
 * --text-* variables, which Uniwind resolves at runtime, so rewriting those variables resizes every
 * text-xs…text-4xl in the app at once. The system font size setting still applies on top.
 */

export const TEXT_SCALES = [
  { value: 1, label: "عادي" },
  { value: 1.15, label: "كبير" },
  { value: 1.3, label: "أكبر" },
] as const;

/** Tailwind v4's sizes in px (rem × 16) with their line heights. */
const SIZES: Record<string, [size: number, lineHeight: number]> = {
  xs: [12, 16],
  sm: [14, 20],
  base: [16, 24],
  lg: [18, 28],
  xl: [20, 28],
  "2xl": [24, 32],
  "3xl": [30, 36],
  "4xl": [36, 40],
};

const KEY = "al-manara:text-scale:v1";
let scale: number | null = null;
const listeners = new Set<() => void>();

function read(): number {
  if (scale !== null) return scale;
  try {
    scale = Number(Storage.getItemSync(KEY)) || 1;
  } catch {
    scale = 1;
  }
  return scale;
}

function apply(value: number) {
  const variables: Record<string, number> = {};
  for (const [name, [size, lineHeight]] of Object.entries(SIZES)) {
    variables[`--text-${name}`] = Math.round(size * value);
    variables[`--text-${name}--line-height`] = Math.round(lineHeight * value);
  }
  for (const theme of ["light", "dark"] as const) Uniwind.updateCSSVariables(theme, variables);
}

/** Called once at startup so a saved size applies from the first screen. */
export function applySavedTextScale() {
  const value = read();
  if (value !== 1) apply(value);
}

export function setTextScale(value: number) {
  scale = value;
  try {
    Storage.setItemSync(KEY, String(value));
  } catch {
    // Applies for this session only.
  }
  apply(value);
  listeners.forEach((notify) => notify());
}

export function useTextScale(): number {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, read);
}

/** A size and line height in px, grown by the app text scale. */
export function scaledText(fontSize: number, lineHeight: number, scale: number): { fontSize: number; lineHeight: number } {
  return { fontSize: Math.round(fontSize * scale), lineHeight: Math.round(lineHeight * scale) };
}

/**
 * For text set in px instead of a text-* utility (Quran and dhikr lines, display titles). Arbitrary
 * classes like text-[22px] leading-[44px] are fixed, so they ignore the text size setting and a fixed
 * line height clips the taller glyphs once the font grows. Pass the result as `style`.
 */
export function useScaledText(fontSize: number, lineHeight: number): { fontSize: number; lineHeight: number } {
  return scaledText(fontSize, lineHeight, useTextScale());
}
