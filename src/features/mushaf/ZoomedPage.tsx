import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";

/**
 * The printed page at a zoom: drawn at width × zoom by height × zoom (its own layout scales with the
 * frame it's given, so nothing reflows) and panned both ways when larger than the screen; centred
 * when smaller.
 */
export function ZoomedPage({
  width,
  height,
  zoom,
  background,
  children,
}: {
  width: number;
  height: number;
  zoom: number;
  background: string;
  /** The page, laid out for the zoomed frame. */
  children: (frame: { width: number; height: number }) => ReactNode;
}) {
  const frame = { width: Math.round(width * zoom), height: Math.round(height * zoom) };
  if (zoom <= 1) {
    return (
      <View style={{ width, height, alignItems: "center", justifyContent: "center", backgroundColor: background }}>{children(frame)}</View>
    );
  }
  return (
    <ScrollView style={{ width, height, backgroundColor: background }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
        {children(frame)}
      </ScrollView>
    </ScrollView>
  );
}
