import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";

import { useAccount } from "@/features/account/accountStore";
import { supabase } from "@/lib/supabase";

let registeredToken: string | null = null;

/** The EAS project id; push tokens need it, and it only exists once the project is linked (`eas init`). */
function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/**
 * Registers this device for the website's reminder pushes once the user is signed in and has already
 * allowed notifications (we never ask here; the adhan and adhkar switches ask in context).
 */
export function usePushRegistration() {
  const account = useAccount();
  const userId = account.status === "signed-in" ? account.userId : null;

  useEffect(() => {
    if (!supabase || !userId || !Device.isDevice || !projectId()) return;
    const client = supabase;
    let cancelled = false;
    (async () => {
      const permission = await Notifications.getPermissionsAsync();
      if (!permission.granted || cancelled) return;
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("reminders", {
          name: "تذكيرات المنارة",
          description: "الجمعة والكهف والصيام والمواسم",
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
      const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
      if (cancelled) return;
      const { error } = await client
        .from("push_tokens")
        .upsert(
          { token, user_id: userId, platform: Platform.OS === "ios" ? "ios" : "android", updated_at: new Date().toISOString() },
          { onConflict: "token" },
        );
      if (!error) registeredToken = token;
    })().catch(() => {
      // Pushes are optional; the app works the same without them.
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);
}

/** Called before sign-out, so the next person on this device doesn't get this account's pushes. */
export async function unregisterPushToken() {
  if (!supabase || !registeredToken) return;
  await supabase.from("push_tokens").delete().eq("token", registeredToken);
  registeredToken = null;
}
