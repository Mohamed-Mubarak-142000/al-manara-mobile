import * as Notifications from "expo-notifications";
import { router, useGlobalSearchParams, usePathname, useSegments, type Href } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState, Linking } from "react-native";

import { setCrashRoute } from "@/lib/crashLog";
import {
  buildHref,
  decideRestore,
  flushRoute,
  isUserLaunchUrl,
  markRestored,
  readLastRestoreAt,
  readSavedRoute,
  saveRoute,
  shouldSave,
  touchRoute,
} from "@/lib/navRestore";

/** Remembers the current route (for restore after process death, and for crash reports). */
export function useRouteMemory() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const segments = useSegments();
  const href = buildHref(pathname, params, segments);
  const saved = useRef<string | null>(null);

  useEffect(() => {
    setCrashRoute(href);
    if (!shouldSave(href)) return;
    saved.current = href;
    saveRoute(href);
  }, [href]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      // The clock for "recent" starts when the user leaves, not when they opened the screen.
      if (state !== "active" && saved.current) touchRoute(saved.current);
      else flushRoute();
    });
    return () => subscription.remove();
  }, []);
}

// Read at import, before this launch's first save (Home) can overwrite it.
const coldStartRoute = readSavedRoute();
let attempted = false;

/**
 * Once per cold start: if nothing else opened the app, returns to the screen the user left within the
 * last 30 minutes, pushed on top of Home so back still lands there. Resolves after navigating (or not).
 */
export async function restoreLastRoute(onboardingDone: boolean): Promise<void> {
  if (attempted) return;
  attempted = true;
  try {
    let launchedByLink = false;
    try {
      launchedByLink = isUserLaunchUrl(await Linking.getInitialURL()) || !!Notifications.getLastNotificationResponse();
    } catch {
      launchedByLink = true; // Unsure: leave the app where it opened.
    }
    const target = decideRestore({ saved: coldStartRoute, now: Date.now(), launchedByLink, onboardingDone, lastRestoreAt: readLastRestoreAt() });
    if (!target) return;
    markRestored();
    router.push(target as Href);
  } catch {
    // Home is a fine place to be.
  }
}

/**
 * A cold start from Google's redirect (Android ended the app while the sign-in sheet was open): the
 * launch link was ours, not the user's, so the screen they started from is reopened after all.
 */
export function restoreAfterAuthRedirect(onboardingDone: boolean) {
  const target = decideRestore({ saved: coldStartRoute, now: Date.now(), launchedByLink: false, onboardingDone, lastRestoreAt: readLastRestoreAt() });
  if (!target) return;
  markRestored();
  router.push(target as Href);
}
