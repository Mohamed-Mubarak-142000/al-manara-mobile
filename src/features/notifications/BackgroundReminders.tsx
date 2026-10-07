import * as Notifications from "expo-notifications";
import Storage from "expo-sqlite/kv-store";
import { useEffect } from "react";
import { AppState, processColor } from "react-native";

import { background } from "../../../modules/almanara-background";
import { TOAST_ADHKAR } from "@/core/adhkar/toastAdhkar";
import { restoreAdhkarReminders } from "@/features/adhkar/adhkarReminders";
import { useThemeColor } from "@/theme/useThemeColor";

import { refreshBackgroundStatus, reportReminderError } from "./backgroundReminderStatus";

const PENDING_OVERLAY = "al-manara:overlay-permission-pending:v1";

export function overlayConfig(colors: Record<string, string>) {
  const nativeColors = Object.fromEntries(Object.entries(colors).map(([name, color]) => [name, processColor(color)]));
  return JSON.stringify({ entries: TOAST_ADHKAR, colors: nativeColors });
}

/** Only an explicit enable action may resume after the permission settings screen. */
export async function enableOverlay(config: string) {
  if (!background) throw new Error("تذكير فوق التطبيقات يحتاج نسخة أندرويد الجديدة، ولا يعمل في Expo Go.");
  await Notifications.setNotificationChannelAsync("dhikr-service-v1", {
    name: "ذكر كل ١٠ دقائق",
    importance: Notifications.AndroidImportance.LOW,
    sound: null,
  });
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error("اسمح بالإشعارات لإظهار زر إيقاف التذكير.");
  if (!background.getStatus().overlayAllowed) {
    Storage.setItemSync(PENDING_OVERLAY, "on");
    await background.openOverlaySettings();
    return;
  }
  await background.setOverlay(true, config);
  Storage.removeItemSync(PENDING_OVERLAY);
  refreshBackgroundStatus();
}

export async function disableOverlay() {
  Storage.removeItemSync(PENDING_OVERLAY);
  await background?.setOverlay(false, "{}");
  refreshBackgroundStatus();
}

export function useOverlayConfig() {
  const surface = useThemeColor("surface");
  const fg = useThemeColor("fg");
  const muted = useThemeColor("fg-muted");
  const primary = useThemeColor("primary");
  const border = useThemeColor("border");
  return overlayConfig({ surface, fg, muted, primary, border });
}

/** Native preferences are authoritative, including the notification's stop action. */
export function BackgroundReminders() {
  const config = useOverlayConfig();
  useEffect(() => {
    let busy = false;
    let configSent = false;
    async function reconcile() {
      if (busy || AppState.currentState !== "active") return;
      busy = true;
      try {
        if (background) {
          // The config (all the toast adhkar) only changes with this effect; the 5 s check below just
          // picks up a stop from the notification.
          if (!configSent) {
            await background.updateOverlay(config);
            configSent = true;
          }
          const current = background.getStatus();
          const pending = Storage.getItemSync(PENDING_OVERLAY) === "on";
          if (current.overlayAllowed && (current.overlayEnabled || pending) && !current.overlayRunning) {
            const permission = await Notifications.getPermissionsAsync();
            if (permission.granted) {
              await background.setOverlay(true, config);
              Storage.removeItemSync(PENDING_OVERLAY);
            }
          }
        }
        refreshBackgroundStatus();
      } catch (error) {
        reportReminderError(error);
      } finally {
        busy = false;
      }
    }
    const restore = () => restoreAdhkarReminders().catch(reportReminderError);
    void reconcile();
    void restore();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void reconcile();
        void restore();
      }
    });
    const timer = setInterval(() => {
      void reconcile();
    }, 5_000);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [config]);
  return null;
}
