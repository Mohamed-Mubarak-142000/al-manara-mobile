import { isOAuthRedirect } from "@/features/account/oauthRedirect";
import { SITE_HOST, websitePathToAppRoute } from "@/features/links/websiteLinks";
import { readLastRead } from "@/widgets/storage";

/** almanara://continue (launcher shortcut): the mushaf at the last-read page, or its start. */
function continueReadingRoute(): string {
  const page = readLastRead()?.page;
  return page ? `/mushaf?page=${page}` : "/mushaf";
}

/**
 * Links into the app. A link to the website (Android App Links) is translated to the app's route for
 * the same page; the app's own scheme links (almanara://…, notifications, widgets) pass through.
 *
 * Google's redirect (almanara://auth/callback?code=…) while the app is running is not a navigation:
 * on Android it reaches the router as well as the browser sheet, and pushing a screen would pull the
 * user out of where they signed in (the login modal, onboarding). The code is exchanged here (once,
 * shared with signInWithGoogle) and nothing moves. A cold start still opens /auth/callback, which
 * finishes the sign-in and routes on.
 */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string | null {
  try {
    if (isOAuthRedirect(path)) {
      if (initial) return path;
      // Loaded on demand: this file is also imported where the Supabase client isn't wanted.
      void import("@/features/account/authFlows").then(({ completeOAuthRedirect }) => completeOAuthRedirect(path));
      return null;
    }
    if (/^(almanara:\/\/|\/)continue\/?(\?|$)/.test(path)) return continueReadingRoute();
    const url = new URL(path, "almanara://app");
    if (url.hostname === SITE_HOST || url.hostname === `www.${SITE_HOST}`) return websitePathToAppRoute(url.pathname, url.searchParams);
    return path;
  } catch {
    return "/";
  }
}
