import { WifiOff } from "lucide-react-native";
import { Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useIsOffline } from "@/lib/network";
import { useThemeColor } from "@/theme/useThemeColor";

/**
 * A slim pill under the status bar while the device is offline. It floats over the screen and lets
 * touches through, so nothing underneath is blocked; mount it once, after the navigator, in the root layout.
 */
export function OfflineBanner() {
  const offline = useIsOffline();
  const insets = useSafeAreaInsets();
  const accent = useThemeColor("accent-strong");

  // The wrapper stays mounted so the pill can animate out when the connection returns.
  return (
    <View pointerEvents="none" className="absolute inset-x-0 top-0 items-center px-4" style={{ paddingTop: insets.top + 6 }}>
      {offline && (
        <Animated.View
          entering={FadeInUp.duration(250)}
          exiting={FadeOutUp.duration(200)}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          className="flex-row items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-3.5 py-1.5 shadow-soft"
        >
          <WifiOff size={14} color={accent} />
          <Text className="font-sans-bold text-xs text-fg">أنت غير متصل بالإنترنت — المحتوى المحفوظ متاح</Text>
        </Animated.View>
      )}
    </View>
  );
}
