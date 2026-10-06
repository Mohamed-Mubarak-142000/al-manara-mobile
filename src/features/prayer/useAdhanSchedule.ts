import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { AppState } from "react-native";

import { calcSettingsKey } from "@/core/prayer/calculation";
import { locationKey } from "@/core/prayer/location";
import { reportReminderError } from "@/features/notifications/backgroundReminderStatus";

import { rescheduleAdhan } from "./adhanScheduler";
import { useAdhanVoice } from "./adhanSound";
import { useAdhanSettings } from "./adhanSettings";
import { usePrayerCalcSettings } from "./prayerCalcSettings";
import { useUserLocation } from "./locationStore";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
});

/** Refresh the persisted system schedule; audio is owned by Android, never notification taps. */
export function useAdhanSchedule() {
  const location = useUserLocation();
  const settings = useAdhanSettings();
  const voice = useAdhanVoice();
  const calc = usePrayerCalcSettings();
  const key = `${locationKey(location)}|${JSON.stringify(settings)}|${calcSettingsKey(calc)}|${voice?.offlineKey ?? voice?.id ?? "default"}`;

  useEffect(() => {
    rescheduleAdhan(location).catch(reportReminderError);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") rescheduleAdhan(location).catch(reportReminderError);
    });
    return () => subscription.remove();
    // `key` captures every input of the schedule.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
