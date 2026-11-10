import { Bell, Headphones, LogIn, MapPin, Mic, Wifi, WifiOff, type LucideIcon } from "lucide-react-native";
import { Text, View } from "react-native";

import { useThemeColor, type ThemeColor } from "@/theme/useThemeColor";

import type { GuideBadge } from "./types";

const BADGES: Record<GuideBadge, { label: string; icon: LucideIcon; tone: ThemeColor }> = {
  offline: { label: "شغّال من غير نت", icon: WifiOff, tone: "primary" },
  background: { label: "شغّال في الخلفية", icon: Headphones, tone: "primary" },
  internet: { label: "محتاج نت", icon: Wifi, tone: "accent-strong" },
  login: { label: "محتاج تسجيل دخول", icon: LogIn, tone: "accent-strong" },
  location: { label: "بيستخدم موقعك", icon: MapPin, tone: "accent-strong" },
  notifications: { label: "بيستخدم الإشعارات", icon: Bell, tone: "accent-strong" },
  microphone: { label: "بيستخدم الميكروفون", icon: Mic, tone: "accent-strong" },
};

function Badge({ badge }: { badge: GuideBadge }) {
  const { label, icon: Icon, tone } = BADGES[badge];
  const color = useThemeColor(tone);
  const soft = tone === "primary" ? "bg-primary-soft" : "bg-accent-soft";
  return (
    <View className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${soft}`}>
      <Icon size={14} color={color} />
      <Text className="font-sans-bold text-xs" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

export function GuideBadges({ badges }: { badges: readonly GuideBadge[] }) {
  if (badges.length === 0) return null;
  return (
    <View className="flex-row flex-wrap gap-2">
      {badges.map((badge) => (
        <Badge key={badge} badge={badge} />
      ))}
    </View>
  );
}
