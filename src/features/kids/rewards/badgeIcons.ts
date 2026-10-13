import { Award, BookOpenCheck, Flame, Headphones, Map as MapIcon, Mic, Palette, Sparkles, Star, Trophy, type LucideIcon } from "lucide-react-native";

import type { BadgeIcon } from "@/core/kids/badges";

/** The website's badge icons (core/kids/badges.ts names them; the app draws them). */
export const BADGE_ICONS: Record<BadgeIcon, LucideIcon> = {
  award: Award,
  "book-open-check": BookOpenCheck,
  flame: Flame,
  headphones: Headphones,
  map: MapIcon,
  mic: Mic,
  palette: Palette,
  sparkles: Sparkles,
  star: Star,
  trophy: Trophy,
};
