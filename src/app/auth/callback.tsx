import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { completeOAuthRedirect } from "@/features/account/authFlows";
import { onboarding } from "@/features/onboarding/onboardingStore";
import { restoreAfterAuthRedirect } from "@/lib/useRouteMemory";
import { useThemeColor } from "@/theme/useThemeColor";

/**
 * Where Google sends the user back (almanara://auth/callback). While the app runs, +native-intent
 * handles the redirect without navigating, so this screen only opens on a cold start (Android ended
 * the app while the sign-in sheet was open). It finishes the sign-in with the code (the PKCE verifier
 * is still on the device), then goes where the user was: onboarding if it isn't done, otherwise Home
 * with the screen they started from on top.
 */
export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const primary = useThemeColor("primary");

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams();
    if (params.code) query.set("code", params.code);
    if (params.error_description) query.set("error_description", params.error_description);
    void completeOAuthRedirect(`almanara://auth/callback?${query.toString()}`).finally(() => {
      if (cancelled) return;
      if (!onboarding.isDone()) {
        router.replace("/onboarding");
        return;
      }
      // Home sits under this screen (the root layout's initialRouteName); otherwise make it.
      if (router.canGoBack()) router.back();
      else router.replace("/");
      restoreAfterAuthRedirect(true);
    });
    return () => {
      cancelled = true;
    };
  }, [params.code, params.error_description]);

  return (
    <View className="flex-1 items-center justify-center gap-3 bg-bg">
      <ActivityIndicator color={primary} size="large" />
      <Text className="font-sans text-sm text-fg-muted">جارٍ إكمال الدخول…</Text>
    </View>
  );
}
