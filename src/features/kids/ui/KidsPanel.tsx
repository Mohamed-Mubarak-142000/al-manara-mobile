import type { ReactNode } from "react";
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { KIDS, PANEL_SHADOW } from "./kidsStyles";

/** The website's kidsPanel: a big rounded white card with a soft ring over the garden. */
export function KidsPanel({ children, className, style }: { children: ReactNode; className?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      className={className}
      style={[
        {
          backgroundColor: "rgba(255,255,255,0.95)",
          borderRadius: 36,
          padding: 20,
          borderWidth: 4,
          borderColor: "rgba(255,255,255,0.6)",
        },
        PANEL_SHADOW,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * The kids' content inside the app's shared BottomSheet. The sheet follows the app theme (dark at night),
 * while the kids palette is always daytime; a white card of its own keeps the garden-coloured rows readable
 * in both themes.
 */
export function KidsSheetCard({ children }: { children: ReactNode }) {
  return (
    <View style={{ borderRadius: 24, backgroundColor: KIDS.white, padding: 8, borderWidth: 2, borderColor: KIDS.whiteRing }}>
      {children}
    </View>
  );
}

type Tone = "deep" | "muted" | "white";
const COLOR: Record<Tone, string> = { deep: KIDS.deep, muted: KIDS.muted, white: KIDS.white };

/** Kids text in Baloo Bhaijaan: `bold` is the website's font-extrabold. */
export function KidsText({
  children,
  size = 16,
  bold,
  tone = "deep",
  center,
  className,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  size?: number;
  bold?: boolean;
  tone?: Tone;
  center?: boolean;
  className?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      className={`${bold ? "font-kids-bold" : "font-kids"} ${className ?? ""}`}
      style={[{ color: COLOR[tone], fontSize: size, lineHeight: Math.round(size * 1.5), textAlign: center ? "center" : undefined }, style]}
    >
      {children}
    </Text>
  );
}

/** The page title panel most kids pages open with (a centered heading and a line under it). */
export function KidsTitlePanel({
  title,
  subtitle,
  icon,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <KidsPanel className={className}>
      {icon ? <View className="items-center">{icon}</View> : null}
      <KidsText size={28} bold center className={icon ? "mt-2" : undefined}>
        {title}
      </KidsText>
      {subtitle ? (
        <KidsText size={17} tone="muted" center className="mt-1">
          {subtitle}
        </KidsText>
      ) : null}
    </KidsPanel>
  );
}

/** Quran text inside the kids pages (the website's quran-text class). */
export function QuranText({
  children,
  size = 30,
  color = KIDS.ink,
  center = true,
  style,
}: {
  children: ReactNode;
  size?: number;
  color?: string;
  center?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      className="font-quran"
      style={[
        { fontSize: size, lineHeight: Math.round(size * 1.9), color, textAlign: center ? "center" : "right", writingDirection: "rtl" },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
