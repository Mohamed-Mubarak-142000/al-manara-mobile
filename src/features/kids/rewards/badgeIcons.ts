import type { BadgeDefinition, BadgeIcon } from "@/core/kids/badges";
import { JOURNEY_REGIONS } from "@/core/kids/journey";

/** The badges (core/kids/badges.ts names their icons) as 3D pictures (KidsArt), matching the chests and shop. */
const BADGE_ART: Record<BadgeIcon, string> = {
  award: "🏅",
  "book-open-check": "📖",
  flame: "☀️",
  headphones: "🎧",
  map: "🗺️",
  mic: "🎤",
  palette: "🎨",
  sparkles: "✨",
  star: "⭐",
  trophy: "🏆",
};

/**
 * A badge's picture and its label without the emoji. Region badges carry the region's emoji in their label
 * ("🌱 …"); that emoji becomes the picture instead of a generic map, and the label keeps just the name.
 */
export function badgeArt(badge: BadgeDefinition): { emoji: string; label: string } {
  const region = badge.id.startsWith("region-") ? JOURNEY_REGIONS.find((entry) => `region-${entry.id}` === badge.id) : undefined;
  if (region) return { emoji: region.emoji, label: region.name };
  return { emoji: BADGE_ART[badge.icon], label: badge.label };
}
