import * as Sentry from "@sentry/react-native";
import type { ErrorBoundaryProps } from "expo-router";
import { router } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { recordError } from "@/lib/crashLog";
import { sentryEnabled } from "@/lib/telemetry";

/** Shown instead of a white screen when a screen throws while rendering. */
export function ErrorFallback({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    recordError(error, "boundary");
    if (sentryEnabled) Sentry.captureException(error);
  }, [error]);
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-bg px-8">
      <Text className="text-center font-display-bold text-2xl text-fg">حدث خطأ غير متوقع</Text>
      <Text className="text-center font-sans text-sm leading-6 text-fg-muted">
        نعتذر عن ذلك. جرّب مرة أخرى، أو ارجع إلى الصفحة الرئيسية.
      </Text>
      <View className="mt-2 flex-row gap-3">
        <Button onPress={retry}>إعادة المحاولة</Button>
        <Button variant="outline" onPress={() => router.replace("/")}>
          الرئيسية
        </Button>
      </View>
    </View>
  );
}
