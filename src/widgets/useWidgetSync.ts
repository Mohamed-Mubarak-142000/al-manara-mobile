import { useEffect } from "react";

import { locationKey } from "@/core/prayer/location";
import { useReaderState } from "@/features/mushaf/readerPrefs";
import { useUserLocation } from "@/features/prayer/locationStore";

import { WIDGETS, refreshWidgets } from "./taskHandler";

/** Keeps placed home-screen widgets in step with the app. Debounced: page swipes save a position each time. */
export function useWidgetSync() {
  const { lastRead } = useReaderState();
  const location = useUserLocation();
  const readingKey = lastRead ? `${lastRead.page}:${lastRead.surah}:${lastRead.ayah}` : "";
  const placeKey = locationKey(location);

  useEffect(() => {
    const id = setTimeout(() => refreshWidgets([WIDGETS.reading]), 2000);
    return () => clearTimeout(id);
  }, [readingKey]);

  useEffect(() => {
    refreshWidgets([WIDGETS.prayer]);
  }, [placeKey]);
}
