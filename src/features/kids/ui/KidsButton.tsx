import * as Haptics from "expo-haptics";
import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { KIDS, TONES, type KidsTone } from "./kidsStyles";

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { padV: number; padH: number; font: number; icon: number }> = {
  sm: { padV: 8, padH: 16, font: 15, icon: 17 },
  md: { padV: 11, padH: 22, font: 18, icon: 20 },
  lg: { padV: 15, padH: 30, font: 22, icon: 26 },
};

interface KidsButtonProps {
  children?: ReactNode;
  tone?: KidsTone;
  size?: Size;
  icon?: LucideIcon;
  /** Fills the icon too (the website's `fill-current` on play icons). */
  iconFilled?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  /** Placement in the parent (mt-4, self-stretch…), on an outer wrapper. */
  className?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** A second, smaller line under the label (the learn screen's reciter names). */
  caption?: string;
}

/** The website's kidsButton(): chunky and tactile, pressed down into its own bottom shadow. */
export function KidsButton({
  children,
  tone = "emerald",
  size = "md",
  icon: Icon,
  iconFilled,
  onPress,
  disabled,
  className,
  style,
  accessibilityLabel,
  caption,
}: KidsButtonProps) {
  const t = TONES[tone];
  const s = SIZES[size];
  return (
    <View className={className} style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          onPress?.();
        }}
        style={{ opacity: disabled ? 0.5 : 1 }}
      >
        {({ pressed }) => (
          <View
            style={{
              backgroundColor: t.bg,
              borderRadius: 999,
              paddingVertical: s.padV,
              paddingHorizontal: s.padH,
              borderBottomWidth: pressed ? 1 : 6,
              borderBottomColor: t.shadow,
              marginTop: pressed ? 5 : 0,
              borderWidth: tone === "white" ? 2 : 0,
              borderColor: tone === "white" ? KIDS.whiteRing : undefined,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View className="flex-row items-center justify-center gap-2">
              {Icon && <Icon size={s.icon} color={t.fg} fill={iconFilled ? t.fg : "none"} />}
              {children !== undefined && (
                <Text className="font-kids-bold text-center" style={{ color: t.fg, fontSize: s.font, lineHeight: s.font * 1.45 }}>
                  {children}
                </Text>
              )}
            </View>
            {caption ? (
              <Text className="font-kids text-center" style={{ color: t.fg, fontSize: 12, opacity: 0.85 }}>
                {caption}
              </Text>
            ) : null}
          </View>
        )}
      </Pressable>
    </View>
  );
}
