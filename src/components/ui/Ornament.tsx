import { View } from "react-native";

/** The website's gold divider: two hairlines meeting at a small eight-point star. */
export function Divider({ tone = "gold" }: { tone?: "gold" | "light" }) {
  const line = tone === "light" ? "bg-white/20" : "bg-gold/40";
  const star = tone === "light" ? "border-gold-soft/70" : "border-gold";
  return (
    <View className="flex-row items-center gap-3" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View className={`h-px flex-1 ${line}`} />
      <View className="size-3 items-center justify-center">
        <View className={`absolute size-2.5 border ${star}`} />
        <View className={`absolute size-2.5 rotate-45 border ${star}`} />
      </View>
      <View className={`h-px flex-1 ${line}`} />
    </View>
  );
}
