import { Check, CloudOff } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { useSyncStatus } from "@/lib/outbox";
import { useThemeColor } from "@/theme/useThemeColor";

const SYNCED_FOR_MS = 3000;

/**
 * For the khatma and plan summaries: "بانتظار المزامنة" while steps saved on this device haven't reached the
 * account, then "تمت المزامنة" for a moment once they have.
 */
export function SyncBadge() {
  const primary = useThemeColor("primary");
  const muted = useThemeColor("fg-muted");
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
  const waiting = pending > 0;
  const Icon = waiting ? CloudOff : Check;
  return (
    <View
      accessibilityLiveRegion="polite"
      className={`mt-3 flex-row items-center gap-1.5 self-start rounded-full border px-3 py-1.5 ${waiting ? "border-border bg-surface" : "border-primary bg-primary-soft"}`}
    >
      <Icon size={14} color={waiting ? muted : primary} />
      <Text className={`font-sans-medium text-xs ${waiting ? "text-fg-muted" : "text-primary"}`}>
        {waiting ? "بانتظار المزامنة" : "تمت المزامنة"}
      </Text>
    </View>
  );
}
