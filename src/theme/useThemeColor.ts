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
  | "gold-soft";

/** A design-system color for props that take a value rather than a className (icons, navigators, SVG). */
export function useThemeColor(name: ThemeColor): string {
  return String(useCSSVariable(`--color-${name}`) ?? "#000000");
}
