import { useEffect } from "react";
import { AppState } from "react-native";

import { locationKey } from "@/core/prayer/location";
import { useReaderState } from "@/features/mushaf/readerPrefs";
import { useUserLocation } from "@/features/prayer/locationStore";
import { usePrayerCalcSettings } from "@/features/prayer/prayerCalcSettings";

import { refreshIosWidgets } from "./iosWidgets";
import { WIDGETS, refreshWidgets } from "./taskHandler";

/**
 * Keeps placed home-screen widgets (Android and iOS) in step with the app. Debounced: page swipes
 * save a position each time. The prayer widget also refreshes whenever the app comes to the
 * foreground, so a new day's times reach the iOS widget.
 */
export function useWidgetSync() {
  const { lastRead } = useReaderState();
  const location = useUserLocation();
  const readingKey = lastRead ? `${lastRead.page}:${lastRead.surah}:${lastRead.ayah}` : "";
  const calc = usePrayerCalcSettings();
  const placeKey = `${locationKey(location)}|${JSON.stringify(calc)}`;

  useEffect(() => {
    const id = setTimeout(() => {
      refreshWidgets([WIDGETS.reading]);
      refreshIosWidgets("reading").catch(() => {});
    }, 2000);
    return () => clearTimeout(id);
  }, [readingKey]);

  useEffect(() => {
    refreshWidgets([WIDGETS.prayer]);
    refreshIosWidgets("prayer").catch(() => {});
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshIosWidgets("prayer").catch(() => {});
    });
    return () => subscription.remove();
  }, [placeKey]);
}
