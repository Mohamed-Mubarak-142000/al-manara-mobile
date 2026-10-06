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
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    if (/^(almanara:\/\/|\/)continue\/?(\?|$)/.test(path)) return continueReadingRoute();
    const url = new URL(path, "almanara://app");
    if (url.hostname === SITE_HOST || url.hostname === `www.${SITE_HOST}`) return websitePathToAppRoute(url.pathname, url.searchParams);
    return path;
  } catch {
    return "/";
  }
}
