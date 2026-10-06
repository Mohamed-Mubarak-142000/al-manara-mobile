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
import { OfflineBanner } from "@/components/OfflineBanner";
import { ReadingStreakTracker } from "@/features/streak/streakStore";
import { BackgroundReminders } from "@/features/notifications/BackgroundReminders";
import { useNotificationLinks } from "@/features/notifications/useNotificationLinks";
import { onboarding } from "@/features/onboarding/onboardingStore";
import { usePushRegistration } from "@/features/notifications/usePushRegistration";
import { useAdhanSchedule } from "@/features/prayer/useAdhanSchedule";
import { APP_FONTS } from "@/theme/fonts";
import { trackScreen, withTelemetry } from "@/lib/telemetry";
import { applySavedTextScale } from "@/theme/textScale";
import { useWidgetSync } from "@/widgets/useWidgetSync";
import { useThemeColor } from "@/theme/useThemeColor";

SplashScreen.preventAutoHideAsync();
applySavedTextScale();

export { ErrorFallback as ErrorBoundary } from "@/components/ErrorFallback";

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
      SplashScreen.hideAsync();
      return;
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
        <Stack.Screen name="reset-password" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="share-ayah" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="repeat" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="adhan-voice" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="share-card" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      </Stack>
      <ReadingStreakTracker />
      <GlobalMiniPlayer />
      <OfflineBanner />
      <AdhkarToaster />
    </ThemeProvider>
  );
}

export default withTelemetry(RootLayout);
