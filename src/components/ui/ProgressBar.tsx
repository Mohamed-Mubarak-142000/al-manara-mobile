import { useState } from "react";
import { Pressable, View } from "react-native";

interface ProgressBarProps {
  value: number;
  /** Called with 0…1 when the bar is tapped; omit for a read-only bar. */
  onSeek?: (fraction: number) => void;
  tone?: "light" | "dark";
}

/** A thin rounded bar; tap anywhere on it to seek. */
export function ProgressBar({ value, onSeek, tone = "dark" }: ProgressBarProps) {
  const [width, setWidth] = useState(0);
  const clamped = Math.min(1, Math.max(0, value));

  return (
    <Pressable
      disabled={!onSeek}
      accessibilityRole="adjustable"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      // RTL: the bar fills from the right, so measure from the right edge.
      onPress={(event) => width > 0 && onSeek?.(1 - event.nativeEvent.locationX / width)}
      hitSlop={{ top: 14, bottom: 14 }}
      className="justify-center py-2"
    >
      <View className={`h-1.5 overflow-hidden rounded-full ${tone === "light" ? "bg-white/15" : "bg-border"}`}>
        <View className="h-full rounded-full bg-gold" style={{ width: `${clamped * 100}%` }} />
      </View>
    </Pressable>
  );
}
