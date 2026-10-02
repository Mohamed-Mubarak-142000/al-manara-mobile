import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

interface CardProps {
  children: ReactNode;
  className?: string;
  onPress?: () => void;
}

/** The site's white rounded panel with the soft shadow. Pressable when given onPress. */
export function Card({ children, className, onPress }: CardProps) {
  const box = `rounded-3xl border border-border bg-surface p-4 shadow-soft ${className ?? ""}`;
  if (!onPress) return <View className={box}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <View className={box}>{children}</View>
    </Pressable>
  );
}
