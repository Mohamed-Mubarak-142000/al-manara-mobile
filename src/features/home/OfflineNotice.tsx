import { router, useIsFocused } from "expo-router";
import { WifiOff } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { useIsOffline } from "@/lib/network";
import { useThemeColor } from "@/theme/useThemeColor";

/**
 * The only place the app talks about the connection: a small sheet on Home, once per time the device
 * goes offline. It closes by itself when the connection returns; other screens just show their own
 * neutral error with a retry button.
 */
export function OfflineNotice() {
  const offline = useIsOffline();
  const focused = useIsFocused();
  const accent = useThemeColor("accent-strong");
  // Dismissed for this outage; reset when the connection comes back so the next outage shows it again.
  const [dismissed, setDismissed] = useState(false);
  // Adjusted while rendering (React's "storing information from previous renders"), not in an effect.
  if (!offline && dismissed) setDismissed(false);

  const visible = offline && focused && !dismissed;
  const close = () => setDismissed(true);

  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      title="لا يوجد اتصال بالإنترنت"
      icon={WifiOff}
      scroll={false}
      secondary={{
        label: "المحفوظات",
        onPress: () => {
          close();
          router.push("/downloads");
        },
      }}
      primary={{ label: "حسنًا", onPress: close }}
    >
      <View accessibilityRole="alert" className="flex-row items-center gap-4">
        <View className="size-14 items-center justify-center rounded-full bg-accent-soft">
          <WifiOff size={26} color={accent} />
        </View>
        <Text className="flex-1 font-sans text-sm leading-6 text-fg-muted">
          يمكنك متابعة القراءة والاستماع لما نزّلته، وسنحدّث الباقي تلقائيًا عند عودة الاتصال.
        </Text>
      </View>
    </BottomSheet>
  );
}
