import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { KidsArt } from "../ui/KidsArt";
import { KidsPanel, KidsText } from "../ui/KidsPanel";
import { KIDS, PANEL_SHADOW, TONES, type KidsTone } from "../ui/kidsStyles";

/** The games' top pill: the title on one side, the score or a restart on the other. */
export function GameBar({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          borderRadius: 30,
          backgroundColor: "rgba(255,255,255,0.95)",
          paddingHorizontal: 18,
          paddingVertical: 10,
          borderWidth: 4,
          borderColor: "rgba(255,255,255,0.6)",
        },
        PANEL_SHADOW,
      ]}
    >
      <KidsText size={18} bold style={{ flexShrink: 1 }}>
        {title}
      </KidsText>
      {children ? <View className="flex-row items-center gap-2">{children}</View> : null}
    </View>
  );
}

/** A small action in the bar ("من جديد", "مساعدة"): a soft pill at least 44dp tall so small fingers can hit it. */
export function BarAction({
  icon: Icon,
  label,
  onPress,
  color = KIDS.muted,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: pressed ? KIDS.soft : KIDS.softer,
      })}
    >
      <Icon size={18} color={color} />
      <KidsText size={15} bold style={{ color }}>
        {label}
      </KidsText>
    </Pressable>
  );
}

/** A secondary choice under a game's start button ("اختر سورة أخرى"): a full 44dp pill, not a thin underlined link. */
export function GameLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        justifyContent: "center",
        paddingHorizontal: 20,
        borderRadius: 999,
        backgroundColor: pressed ? KIDS.soft : KIDS.softer,
      })}
    >
      <KidsText size={16} bold tone="muted">
        {label}
      </KidsText>
    </Pressable>
  );
}

/**
 * A game's start card: the big picture tile, the name, how to play, and what to press. `art` is the same emoji
 * the games menu tile uses, so a game looks the same from the menu to its first screen.
 */
export function GameIntro({
  art,
  tone,
  title,
  description,
  children,
}: {
  art: string;
  tone: KidsTone;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const t = TONES[tone];
  return (
    <KidsPanel className="items-center">
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 24,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: t.bg,
          borderBottomWidth: 7,
          borderBottomColor: t.shadow,
        }}
      >
        <KidsArt emoji={art} size={50} />
      </View>
      <KidsText size={26} bold center className="mt-5">
        {title}
      </KidsText>
      <KidsText size={17} tone="muted" center className="mt-2">
        {description}
      </KidsText>
      <View className="mt-6 items-center gap-3">{children}</View>
    </KidsPanel>
  );
}
