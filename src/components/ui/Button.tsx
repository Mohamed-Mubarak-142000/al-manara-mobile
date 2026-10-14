import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, Text, View, type ImageSourcePropType, type PressableProps } from "react-native";

import { useTextScale } from "@/theme/textScale";
import { useThemeColor, type ThemeColor } from "@/theme/useThemeColor";

/** The website's buttonClass() variants (src/components/ui/button.ts), as a native component. */
export type ButtonVariant = "primary" | "secondary" | "gold" | "outline" | "ghost" | "light";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, { box: string; text: string; icon: ThemeColor | "white" }> = {
  primary: { box: "bg-primary", text: "text-on-primary", icon: "on-primary" },
  // The filled button's partner: same colour, outlined (إعادة تعيين beside تطبيق).
  secondary: { box: "border-[1.5px] border-primary bg-surface", text: "text-primary", icon: "primary" },
  gold: { box: "bg-gold shadow-gold", text: "text-emerald-night", icon: "hero" },
  outline: { box: "border border-border bg-surface", text: "text-fg", icon: "fg" },
  ghost: { box: "bg-transparent", text: "text-fg", icon: "fg" },
  light: { box: "border border-white/30 bg-white/10", text: "text-white", icon: "white" },
};

/** `px` sets the label in pixels where Tailwind has no step; it is grown by the text size setting. */
const SIZES: Record<ButtonSize, { box: string; text: string; icon: number; px?: number }> = {
  sm: { box: "h-9 px-3.5 gap-1.5", text: "text-sm", icon: 16 },
  md: { box: "h-11 px-5 gap-2", text: "", icon: 18, px: 15 },
  lg: { box: "h-13 px-7 gap-2.5", text: "text-base", icon: 20 },
};

interface ButtonProps extends Omit<PressableProps, "children" | "style"> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  /** A small full-colour picture (a section's 3D art) in place of `icon`. */
  image?: ImageSourcePropType;
  /**
   * Placement in the parent (flex-1, mt-4, self-start...), applied to an outer wrapper. On the inner box,
   * flex-1 sets a zero flex-basis inside the Pressable and the button collapsed to nothing.
   */
  className?: string;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  icon: Icon,
  image,
  className,
  onPress,
  disabled,
  ...rest
}: ButtonProps) {
  const v = VARIANTS[variant];
  const s = SIZES[size];
  const themed = useThemeColor(v.icon === "white" ? "hero-fg" : v.icon);
  const iconColor = v.icon === "white" ? "#ffffff" : themed;
  const textScale = useTextScale();

  return (
    <View className={className}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={(event) => {
          Haptics.selectionAsync().catch(() => {});
          onPress?.(event);
        }}
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }], opacity: disabled ? 0.5 : pressed ? 0.9 : 1 })}
        {...rest}
      >
        <View className={`flex-row items-center justify-center rounded-xl ${v.box} ${s.box}`}>
          {image ? (
            <Image source={image} style={{ width: s.icon + 6, height: s.icon + 6 }} contentFit="contain" accessible={false} />
          ) : (
            Icon && <Icon size={s.icon} color={iconColor} />
          )}
          <Text className={`font-sans-bold ${v.text} ${s.text}`} style={s.px ? { fontSize: Math.round(s.px * textScale) } : undefined}>
            {children}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
