// App entry: Expo Router, plus the Android home-screen widget handler, which Android runs headless
// (without the app's UI) and so must be registered here rather than inside a screen.
// The crash log goes first so it records errors thrown while the rest of the app loads.
import "@/lib/crashLog";
// Before anything reads storage: a build that bumps DATA_VERSION starts from a clean slate.
import "@/lib/dataReset";
import "expo-router/entry";

import { Platform } from "react-native";
import { registerWidgetTaskHandler } from "react-native-android-widget";

import { widgetTaskHandler } from "@/widgets/taskHandler";

if (Platform.OS === "android") registerWidgetTaskHandler(widgetTaskHandler);
