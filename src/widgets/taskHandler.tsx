import { Platform } from "react-native";
import { requestWidgetUpdate, type WidgetTaskHandlerProps } from "react-native-android-widget";

import { prayerWidgetData, readingWidgetData } from "./widgetData";
import { ContinueReadingWidget, NextPrayerWidget } from "./widgets";

export const WIDGETS = { prayer: "NextPrayer", reading: "ContinueReading" } as const;

async function render(name: string) {
  if (name === WIDGETS.prayer) return <NextPrayerWidget data={await prayerWidgetData()} now={new Date()} />;
  return <ContinueReadingWidget data={readingWidgetData()} />;
}

/** Called by Android (headless) when a widget is added, resized or due for its periodic refresh. */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === "WIDGET_DELETED" || props.widgetAction === "WIDGET_CLICK") return;
  props.renderWidget(await render(props.widgetInfo.widgetName));
}

/** Pushes fresh content to placed widgets after the app changes it (reading position, location). */
export function refreshWidgets(which: (typeof WIDGETS)[keyof typeof WIDGETS][] = Object.values(WIDGETS)) {
  if (Platform.OS !== "android") return;
  for (const widgetName of which) {
    requestWidgetUpdate({ widgetName, renderWidget: () => render(widgetName) }).catch(() => {
      // No widget of this kind on the home screen.
    });
  }
}
