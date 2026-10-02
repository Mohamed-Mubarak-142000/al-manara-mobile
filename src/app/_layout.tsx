import "@/global.css";

import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme } from "react-native";

import { useAdhanSchedule } from "@/features/prayer/useAdhanSchedule";
import { APP_FONTS } from "@/theme/fonts";
import { useThemeColor } from "@/theme/useThemeColor";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(APP_FONTS);
  useAdhanSchedule();
  const scheme = useColorScheme();
  const bg = useThemeColor("bg");
  const surface = useThemeColor("surface");
  const fg = useThemeColor("fg");
  const border = useThemeColor("border");
  const primary = useThemeColor("primary");

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, background: bg, card: surface, text: fg, border, primary } };

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="player" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      </Stack>
    </ThemeProvider>
  );
}
