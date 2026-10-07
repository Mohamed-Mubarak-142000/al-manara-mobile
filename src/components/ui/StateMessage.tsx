import { ActivityIndicator, Text, View } from "react-native";

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
 * Loading spinner, or a message with a retry button. It never talks about the connection: being
 * offline is announced once, on Home only (features/home/OfflineNotice.tsx).
 */
export function StateMessage({ loading, message, onRetry, actionLabel, onAction }: StateMessageProps) {
  const accent = useThemeColor("accent");
  return (
    <View className="items-center gap-4 px-6 py-16">
      {loading ? (
        <ActivityIndicator color={accent} size="large" accessibilityLabel="جارٍ التحميل" />
      ) : (
        <Text accessibilityLiveRegion="polite" className="text-center font-sans text-base leading-7 text-fg-muted">
          {message}
        </Text>
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
