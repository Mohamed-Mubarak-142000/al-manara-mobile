import { Check, CloudOff } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { useSyncStatus } from "@/lib/outbox";
import { useThemeColor } from "@/theme/useThemeColor";

const SYNCED_FOR_MS = 3000;

/**
 * For the khatma and plan heroes: "بانتظار المزامنة" while steps saved on this device haven't reached the
 * account, then "تمت المزامنة" for a moment once they have.
 */
export function SyncBadge() {
  const heroFg = useThemeColor("hero-fg");
  const { pending } = useSyncStatus();
  const [previous, setPrevious] = useState(pending);
  const [synced, setSynced] = useState(false);
  if (pending !== previous) {
    setPrevious(pending);
    setSynced(previous > 0 && pending === 0);
  }

  useEffect(() => {
    if (!synced) return;
    const timer = setTimeout(() => setSynced(false), SYNCED_FOR_MS);
    return () => clearTimeout(timer);
  }, [synced]);

  if (pending === 0 && !synced) return null;
  const Icon = pending > 0 ? CloudOff : Check;
  return (
    <View accessibilityLiveRegion="polite" className="mt-3 flex-row items-center gap-1.5 self-start rounded-full bg-white/10 px-3 py-1">
      <Icon size={14} color={heroFg} />
      <Text className="font-sans text-xs text-white/80">{pending > 0 ? "بانتظار المزامنة" : "تمت المزامنة"}</Text>
    </View>
  );
}
