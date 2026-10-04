import { ExtensionStorage } from "@bacons/apple-targets";
import { Platform } from "react-native";

import { prayerWidgetData, readingWidgetData } from "./widgetData";

/** The App Group shared with the iOS widget target (targets/widget, app.json entitlements). */
const storage = new ExtensionStorage("group.com.almanara.app");

/**
 * Writes what the iOS widgets show into the App Group and asks WidgetKit to redraw. The Swift side
 * (targets/widget/AlManaraWidgets.swift) works out the next prayer from today's times.
 */
export async function refreshIosWidgets(which: "prayer" | "reading" | "all" = "all") {
  if (Platform.OS !== "ios") return;
  if (which !== "reading") {
    const prayer = await prayerWidgetData();
    if (prayer.times) {
      const { fajr, dhuhr, asr, maghrib, isha } = prayer.times;
      storage.set("prayer", { label: prayer.label, fajr, dhuhr, asr, maghrib, isha });
    }
  }
  if (which !== "prayer") {
    const reading = readingWidgetData();
    if (reading.surahName) storage.set("reading", { surah: reading.surahName, ayah: String(reading.ayah), page: String(reading.page) });
  }
  ExtensionStorage.reloadWidget();
}
