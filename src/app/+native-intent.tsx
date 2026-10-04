import { SITE_HOST, websitePathToAppRoute } from "@/features/links/websiteLinks";

/**
 * Links into the app. A link to the website (Android App Links) is translated to the app's route for
 * the same page; the app's own scheme links (almanara://…, notifications, widgets) pass through.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const url = new URL(path, "almanara://app");
    if (url.hostname === SITE_HOST || url.hostname === `www.${SITE_HOST}`) return websitePathToAppRoute(url.pathname, url.searchParams);
    return path;
  } catch {
    return "/";
  }
}
