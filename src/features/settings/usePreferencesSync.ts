import { useEffect } from "react";
import { AppState } from "react-native";

import { useAccount } from "@/features/account/accountStore";

import { loadPreferences, savePreferences } from "./preferences";

/**
 * Root layout: brings the account's settings to this device on sign-in, and sends this device's
 * settings up whenever the app goes to the background (changes made anywhere in the app, without
 * every store having to know about the account).
 */
export function usePreferencesSync() {
  const account = useAccount();
  const userId = account.status === "signed-in" ? account.userId : null;

  useEffect(() => {
    if (userId) void loadPreferences(userId);
  }, [userId]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "background") savePreferences();
    });
    return () => subscription.remove();
  }, []);
}
