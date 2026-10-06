import * as WebBrowser from "expo-web-browser";
import { Share } from "react-native";

export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

/** A page of the website, in an in-app browser. Does nothing when the build has no site URL. */
export function openSitePage(path: string) {
  if (SITE_URL) void WebBrowser.openBrowserAsync(`${SITE_URL}${path}`, { toolbarColor: "#012a22" });
}

export function shareApp() {
  void Share.share({
    message: `المنارة: القرآن والأذكار ومواقيت الصلاة في تطبيق واحد
${SITE_URL}`,
  });
}
