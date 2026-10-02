// App entry: Expo Router, plus the Android home-screen widget handler, which Android runs headless
// (without the app's UI) and so must be registered here rather than inside a screen.
import "expo-router/entry";

import { Platform } from "react-native";
import { registerWidgetTaskHandler } from "react-native-android-widget";

import { widgetTaskHandler } from "@/widgets/taskHandler";

if (Platform.OS === "android") registerWidgetTaskHandler(widgetTaskHandler);
