import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

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
      {children ? <View className="flex-row items-center gap-3">{children}</View> : null}
    </View>
  );
}

/** A small text action in the bar ("من جديد", "مساعدة"). */
export function BarAction({ icon: Icon, label, onPress, color = KIDS.muted }: { icon: LucideIcon; label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} className="flex-row items-center gap-1">
      <Icon size={16} color={color} />
      <KidsText size={14} bold style={{ color }}>
        {label}
      </KidsText>
    </Pressable>
  );
}

/** A game's start card: the big icon tile, the name, how to play, and what to press. */
export function GameIntro({ icon: Icon, tone, title, description, children }: { icon: LucideIcon; tone: KidsTone; title: string; description: string; children: ReactNode }) {
  const t = TONES[tone];
  return (
    <KidsPanel className="items-center">
      <View style={{ width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: t.bg, borderBottomWidth: 7, borderBottomColor: t.shadow }}>
        <Icon size={40} color={KIDS.white} />
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
