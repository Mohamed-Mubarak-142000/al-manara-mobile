import { useCSSVariable } from "uniwind";

export type ThemeColor =
  | "bg"
  | "surface"
  | "surface-alt"
  | "fg"
  | "fg-muted"
  | "border"
  | "primary"
  | "primary-strong"
  | "primary-soft"
  | "on-primary"
  | "accent"
  | "accent-strong"
  | "accent-soft"
  | "hero"
  | "hero-fg"
  | "gold"
  | "gold-soft"
  | "danger"
  | "emerald-deep"
  | "emerald-night"
  | "tile-ink"
  | `tile-${"blue" | "teal" | "clay" | "purple" | "green" | "gold" | "rose" | "sky"}`;

/** A design-system color for props that take a value rather than a className (icons, navigators, SVG). */
export function useThemeColor(name: ThemeColor): string {
  return String(useCSSVariable(`--color-${name}`) ?? "#000000");
}

/** `#rrggbb` at the given opacity (0–1); any other format comes back transparent rather than wrong. */
export function withAlpha(color: string, alpha: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return "transparent";
  return (
    color +
    Math.round(Math.max(0, Math.min(1, alpha)) * 255)
      .toString(16)
      .padStart(2, "0")
  );
}
