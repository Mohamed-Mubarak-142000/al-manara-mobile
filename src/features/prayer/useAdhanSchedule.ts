import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { AppState } from "react-native";

import { locationKey } from "@/core/prayer/location";
import { audio } from "@/features/audio/playerStore";

import { rescheduleAdhan } from "./adhanScheduler";
import { readAdhanVoice } from "./adhanSound";
import { useAdhanSettings } from "./adhanSettings";
import { useUserLocation } from "./locationStore";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
});

function playAdhanFor(notification: Notifications.Notification) {
  const data = notification.request.content.data;
  const voice = readAdhanVoice();
  if (data?.kind === "adhan" && data.play === true && voice) audio.playTrack(voice);
}

/**
 * Keeps the prayer notifications rolling forward, and raises the chosen muezzin's adhan at prayer
 * time: as the notification arrives with the app open, or when it is tapped. Mounted once, in the root layout.
 */
export function useAdhanSchedule() {
  useEffect(() => {
    // Cold start from a tap: only a notification from the last few minutes, never a stale one.
    const last = Notifications.getLastNotificationResponse();
    if (last && Date.now() - last.notification.date < 10 * 60_000) playAdhanFor(last.notification);
    const received = Notifications.addNotificationReceivedListener(playAdhanFor);
    const tapped = Notifications.addNotificationResponseReceivedListener((response) => playAdhanFor(response.notification));
    return () => {
      received.remove();
      tapped.remove();
    };
  }, []);

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
