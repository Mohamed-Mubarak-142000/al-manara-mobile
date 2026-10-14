import { Image } from "expo-image";
import { Text, type StyleProp, type ImageStyle } from "react-native";

import { KIDS_ART_MAP } from "./kidsArtMap";

/** The 3D picture for an emoji, or undefined when there is none (the emoji is shown as text instead). */
export function kidsArtFor(emoji: string) {
  return KIDS_ART_MAP[emoji.replaceAll("️", "")];
}

interface KidsArtProps {
  /** The emoji as the data has it ("🌳"); drawn as its Fluent 3D picture. */
  emoji: string;
  size: number;
  style?: StyleProp<ImageStyle>;
}

/**
 * The kids section's icons: one 3D picture style everywhere (the same Fluent art as Home's sections), so
 * nothing depends on the phone's own emoji font. Falls back to the emoji when no picture exists.
 */
export function KidsArt({ emoji, size, style }: KidsArtProps) {
  const source = kidsArtFor(emoji);
  if (!source) {
    return (
      <Text style={{ fontSize: Math.round(size * 0.8), lineHeight: size }} accessible={false}>
        {emoji}
      </Text>
    );
  }
  return <Image source={source} style={[{ width: size, height: size }, style]} contentFit="contain" accessible={false} />;
}
