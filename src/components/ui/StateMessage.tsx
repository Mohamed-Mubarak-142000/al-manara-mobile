import { ActivityIndicator, Text, View } from "react-native";

import { useThemeColor } from "@/theme/useThemeColor";

import { Button } from "./Button";

/** Loading spinner, or an error line with a retry button. */
export function StateMessage({ loading, message, onRetry }: { loading?: boolean; message?: string; onRetry?: () => void }) {
  const accent = useThemeColor("accent");
  return (
    <View className="items-center gap-4 py-16">
      {loading ? <ActivityIndicator color={accent} size="large" /> : <Text className="font-sans text-base text-fg-muted">{message}</Text>}
      {!loading && onRetry && (
        <Button variant="outline" size="sm" onPress={onRetry}>
          إعادة المحاولة
        </Button>
      )}
    </View>
  );
}
