import * as Notifications from "expo-notifications";
import { router, type Href } from "expo-router";
import { useEffect } from "react";

/**
 * Opens the screen a notification points at (data.url), whether the app was running or cold-started by the tap.
 * `ready` holds it back until the navigator is mounted (the root layout renders nothing while fonts load).
 */
export function useNotificationLinks(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    function open(response: Notifications.NotificationResponse | null) {
      const url = response?.notification.request.content.data?.url;
      if (typeof url === "string" && url.startsWith("/")) router.push(url as Href);
    }
    open(Notifications.getLastNotificationResponse());
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, [ready]);
}
