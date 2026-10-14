import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

interface CardProps {
  children: ReactNode;
  className?: string;
  onPress?: () => void;
}

/** A white rounded panel set apart by a hairline border and the faintest shadow. Pressable when given onPress. */
export function Card({ children, className, onPress }: CardProps) {
  const box = `rounded-3xl border border-border bg-surface p-4 shadow-card ${className ?? ""}`;
  if (!onPress) return <View className={box}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <View className={box}>{children}</View>
    </Pressable>
  );
}
