import { Platform } from "react-native";
import { requestWidgetUpdate, type WidgetTaskHandlerProps } from "react-native-android-widget";

import { getPrayerWindow } from "@/core/prayer/prayerTimesApi";

import { background } from "../../modules/almanara-background";
import { readJson, writeJson } from "./storage";
import { TASBIH_ACTIONS, applyTasbih, currentDhikr, isComplete, normalizeTasbih, type TasbihAction, type TasbihState } from "./tasbih";
import { prayerWidgetData, readingWidgetData } from "./widgetData";
import { ContinueReadingWidget, NextPrayerWidget, TasbihWidget } from "./widgets";

export const WIDGETS = { prayer: "NextPrayer", reading: "ContinueReading", tasbih: "Tasbih" } as const;

const TASBIH_KEY = "al-manara:widget-tasbih:v1";

async function renderPrayer() {
  const data = await prayerWidgetData();
  const now = new Date();
  // Android redraws every 30 minutes at best; also wake at the next prayer (best-effort, inexact) so
  // the widget moves on when it begins, even with the adhan off. Each render re-arms the next one.
  if (data.times) background?.scheduleWidgetRefresh?.(getPrayerWindow(data.times, now).next.at.getTime() + 5_000).catch(() => {});
  return <NextPrayerWidget data={data} now={now} />;
}

function renderTasbih(state: TasbihState) {
  const dhikr = currentDhikr(state, new Date());
  return (
    <TasbihWidget
      data={{ text: dhikr.text, source: dhikr.source, count: state.count, target: state.target, complete: isComplete(state) }}
    />
  );
}

async function render(name: string) {
  if (name === WIDGETS.prayer) return renderPrayer();
  if (name === WIDGETS.tasbih) return renderTasbih(normalizeTasbih(readJson<TasbihState>(TASBIH_KEY)));
  return <ContinueReadingWidget data={readingWidgetData()} />;
}

/** Called by Android (headless) when a widget is added, resized, tapped or due for its periodic refresh. */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === "WIDGET_DELETED") return;
  if (props.widgetAction === "WIDGET_CLICK") {
    const action = props.clickAction as TasbihAction | undefined;
    if (props.widgetInfo.widgetName !== WIDGETS.tasbih || !action || !TASBIH_ACTIONS.includes(action)) return;
    const next = applyTasbih(normalizeTasbih(readJson<TasbihState>(TASBIH_KEY)), action, new Date());
    writeJson(TASBIH_KEY, next);
    props.renderWidget(renderTasbih(next));
    return;
  }
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
