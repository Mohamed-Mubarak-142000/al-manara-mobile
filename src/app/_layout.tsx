import "@/global.css";

import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme } from "react-native";

import { useLastReadSync } from "@/features/account/useLastReadSync";
import { AdhkarToaster } from "@/features/adhkar/AdhkarToaster";
import { GlobalMiniPlayer } from "@/features/audio/MiniPlayer";
import { ReadingStreakTracker } from "@/features/streak/streakStore";
import { BackgroundReminders } from "@/features/notifications/BackgroundReminders";
import { useNotificationLinks } from "@/features/notifications/useNotificationLinks";
import { onboarding } from "@/features/onboarding/onboardingStore";
import { usePushRegistration } from "@/features/notifications/usePushRegistration";
import { useAdhanSchedule } from "@/features/prayer/useAdhanSchedule";
import { APP_FONTS } from "@/theme/fonts";
import { trackScreen, withTelemetry } from "@/lib/telemetry";
import { startOutbox } from "@/lib/outbox";
import { restoreLastRoute, useRouteMemory } from "@/lib/useRouteMemory";
// Registers the outbox handlers before anything is flushed.
import "@/features/khatma/sync";
import "@/features/plan/sync";
import { applySavedTextScale } from "@/theme/textScale";
import { useWidgetSync } from "@/widgets/useWidgetSync";
import { useThemeColor } from "@/theme/useThemeColor";

SplashScreen.preventAutoHideAsync();
applySavedTextScale();
// Khatma/plan changes made offline are queued and sent when the connection returns.
startOutbox();

export { ErrorFallback as ErrorBoundary } from "@/components/ErrorFallback";

/** A deep link straight to a screen (almanara://login…) still has Home under it to go back to. */
export const unstable_settings = { initialRouteName: "(tabs)" };

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(APP_FONTS);
  useAdhanSchedule();
  useLastReadSync();
  usePushRegistration();
  useWidgetSync();
  const pathname = usePathname();
  useEffect(() => {
    trackScreen(pathname);
  }, [pathname]);
  useRouteMemory();
  useNotificationLinks(fontsLoaded || !!fontError);
  const scheme = useColorScheme();
  const bg = useThemeColor("bg");
  const surface = useThemeColor("surface");
  const fg = useThemeColor("fg");
  const border = useThemeColor("border");
  const primary = useThemeColor("primary");

  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    // First launch: the three setup steps before anything else. The splash stays up until the
    // onboarding screen has replaced Home, so Home never flashes first.
    if (onboarding.isDone()) {
      // After Android ended the process in the background, reopen the screen the user left (on top of
      // Home) before the splash goes, so Home doesn't flash first.
      void restoreLastRoute(true).finally(() => setTimeout(() => SplashScreen.hideAsync(), 50));
      // Never keep the splash up longer than this, whatever happens above.
      const fallback = setTimeout(() => SplashScreen.hideAsync(), 1500);
      return () => clearTimeout(fallback);
    }
    router.replace("/onboarding");
    const id = setTimeout(() => SplashScreen.hideAsync(), 250);
    return () => clearTimeout(id);
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, background: bg, card: surface, text: fg, border, primary } };

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="auto" />
      <BackgroundReminders />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: "fade" }} />
        <Stack.Screen name="player" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="login" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="register" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="verify" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="forgot-password" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        {/* No swipe-down: leaving goes through the screen's own back, which closes the whole flow. */}
        <Stack.Screen name="reset-password" options={{ presentation: "modal", animation: "slide_from_bottom", gestureEnabled: false }} />
        <Stack.Screen name="share-ayah" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="repeat" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="adhan-voice" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="share-card" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      </Stack>
      <ReadingStreakTracker />
      <GlobalMiniPlayer />
      <AdhkarToaster />
    </ThemeProvider>
  );
}

export default withTelemetry(RootLayout);
