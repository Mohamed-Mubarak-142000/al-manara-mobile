import * as Haptics from "expo-haptics";
import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, Text, View, type PressableProps } from "react-native";

import { useThemeColor, type ThemeColor } from "@/theme/useThemeColor";

/** The website's buttonClass() variants (src/components/ui/button.ts), as a native component. */
export type ButtonVariant = "primary" | "gold" | "outline" | "ghost" | "light";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, { box: string; text: string; icon: ThemeColor | "white" }> = {
  primary: { box: "bg-primary shadow-soft", text: "text-on-primary", icon: "on-primary" },
  gold: { box: "bg-gold shadow-gold", text: "text-emerald-night", icon: "hero" },
  outline: { box: "border border-border bg-surface", text: "text-fg", icon: "fg" },
  ghost: { box: "bg-transparent", text: "text-fg", icon: "fg" },
  light: { box: "border border-white/30 bg-white/10", text: "text-white", icon: "white" },
};

const SIZES: Record<ButtonSize, { box: string; text: string; icon: number }> = {
  sm: { box: "h-9 px-3.5 gap-1.5", text: "text-sm", icon: 16 },
  md: { box: "h-11 px-5 gap-2", text: "text-[15px]", icon: 18 },
  lg: { box: "h-13 px-7 gap-2.5", text: "text-base", icon: 20 },
};

interface ButtonProps extends Omit<PressableProps, "children" | "style"> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  className?: string;
}

export function Button({ children, variant = "primary", size = "md", icon: Icon, className, onPress, disabled, ...rest }: ButtonProps) {
  const v = VARIANTS[variant];
  const s = SIZES[size];
  const themed = useThemeColor(v.icon === "white" ? "hero-fg" : v.icon);
  const iconColor = v.icon === "white" ? "#ffffff" : themed;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={(event) => {
        Haptics.selectionAsync().catch(() => {});
        onPress?.(event);
      }}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }], opacity: disabled ? 0.5 : 1 })}
      {...rest}
    >
      <View className={`flex-row items-center justify-center rounded-full ${v.box} ${s.box} ${className ?? ""}`}>
        {Icon && <Icon size={s.icon} color={iconColor} />}
        <Text className={`font-sans-bold ${v.text} ${s.text}`}>{children}</Text>
      </View>
    </Pressable>
  );
}
