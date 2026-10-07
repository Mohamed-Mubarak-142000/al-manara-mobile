import { router, useIsFocused } from "expo-router";
import { WifiOff } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";

import { Button } from "@/components/ui/Button";
import { useIsOffline } from "@/lib/network";
import { useThemeColor } from "@/theme/useThemeColor";

/**
 * The only place the app talks about the connection: a small popup on Home, once per time the device
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
    <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(200)} className="flex-1 items-center justify-center bg-black/50 px-6">
        <Pressable accessibilityLabel="إغلاق" onPress={close} className="absolute inset-0" />
        <Animated.View
          entering={ZoomIn.duration(260)}
          accessibilityRole="alert"
          className="w-full max-w-sm items-center rounded-[28px] border border-border bg-surface px-6 pb-6 pt-7 shadow-lift"
        >
          <View className="size-16 items-center justify-center rounded-full bg-accent-soft">
            <WifiOff size={28} color={accent} />
          </View>
          <Text className="mt-4 text-center font-display-bold text-xl text-fg">لا يوجد اتصال بالإنترنت</Text>
          <Text className="mt-2 text-center font-sans text-sm leading-6 text-fg-muted">
            يمكنك متابعة القراءة والاستماع لما نزّلته، وسنحدّث الباقي تلقائيًا عند عودة الاتصال.
          </Text>
          <View className="mt-6 w-full flex-row gap-3">
            <Button className="flex-1" onPress={close}>
              حسنًا
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              onPress={() => {
                close();
                router.push("/downloads");
              }}
            >
              المحفوظات
            </Button>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
