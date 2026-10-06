import { ActivityIndicator, Text, View } from "react-native";

import { useIsOffline } from "@/lib/network";
import { useThemeColor } from "@/theme/useThemeColor";

import { Button } from "./Button";

interface StateMessageProps {
  loading?: boolean;
  message?: string;
  /** Shows "إعادة المحاولة". */
  onRetry?: () => void;
  /** A different call to action (e.g. sign in), shown instead of / beside retry. */
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Loading spinner, or a message with a retry button. When a retry is offered and the device is offline,
 * it says so, so a failed load reads as "check your connection" rather than a broken page.
 */
export function StateMessage({ loading, message, onRetry, actionLabel, onAction }: StateMessageProps) {
  const accent = useThemeColor("accent");
  const offline = useIsOffline();
  return (
    <View className="items-center gap-4 px-6 py-16">
      {loading ? (
        <ActivityIndicator color={accent} size="large" accessibilityLabel="جارٍ التحميل" />
      ) : (
        <View className="items-center gap-1.5">
          <Text accessibilityLiveRegion="polite" className="text-center font-sans text-base leading-7 text-fg-muted">
            {message}
          </Text>
          {onRetry && offline && (
            <Text className="text-center font-sans text-sm text-fg-muted">لا يوجد اتصال بالإنترنت، تحقّق من الاتصال ثم أعد المحاولة.</Text>
          )}
        </View>
      )}
      {!loading && (onRetry || onAction) && (
        <View className="flex-row flex-wrap justify-center gap-3">
          {onAction && actionLabel && (
            <Button size="sm" onPress={onAction}>
              {actionLabel}
            </Button>
          )}
          {onRetry && (
            <Button variant="outline" size="sm" onPress={onRetry}>
              إعادة المحاولة
            </Button>
          )}
        </View>
      )}
    </View>
  );
}
