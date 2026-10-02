import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { AppState } from "react-native";

import { locationKey } from "@/core/prayer/location";

import { rescheduleAdhan } from "./adhanScheduler";
import { useAdhanSettings } from "./adhanSettings";
import { useUserLocation } from "./locationStore";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
});

/** Keeps the prayer notifications rolling forward. Mounted once, in the root layout. */
export function useAdhanSchedule() {
  const location = useUserLocation();
  const settings = useAdhanSettings();
  const key = `${locationKey(location)}|${JSON.stringify(settings)}`;

  useEffect(() => {
    rescheduleAdhan(location).catch(() => {});
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") rescheduleAdhan(location).catch(() => {});
    });
    return () => subscription.remove();
    // `key` captures every input of the schedule.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
