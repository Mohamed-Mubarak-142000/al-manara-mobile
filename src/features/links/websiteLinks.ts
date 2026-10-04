import { getSurah } from "@/features/mushaf/mushaf";

/** The website's host: its links open the matching screen when the app is installed (Android App Links). */
export const SITE_HOST = "eslami-platform.vercel.app";

const SOUND_PAGES = new Set(["ibtihalat", "tawasheeh", "duas", "adhan"]);

/**
 * Turns a website path into the app's route for the same content. Pure (tested): the website and the
 * app name a few screens differently (/prayer-times → /prayer, /dashboard → /journey…). Unknown paths
 * open the home screen rather than "not found".
 */
export function websitePathToAppRoute(pathname: string, search: URLSearchParams): string {
  const parts = pathname.split("/").filter(Boolean);
  const [first, second, third] = parts;
  if (!first) return "/";

  switch (first) {
    case "quran": {
      if (!second) return "/quran";
      const page = Number(search.get("page")) || getSurah(Number(second))?.startPage;
      return page ? `/mushaf?page=${page}` : "/quran";
    }
    case "prayer-times":
      return "/prayer";
    case "dashboard":
      return "/journey";
    case "certificates":
      return !second || second === "mine" ? "/certificates" : `/certificate/${encodeURIComponent(second)}`;
    case "hadith":
      if (second === "category" && third) return `/hadith/category/${encodeURIComponent(third)}`;
      return second ? `/hadith/${encodeURIComponent(second)}` : "/hadith";
    case "listen":
    case "stories":
    case "exams":
      return second ? `/${first}/${encodeURIComponent(second)}` : `/${first}`;
    case "radio":
    case "calendar":
    case "adhkar":
    case "khatma":
    case "plan":
    case "tasmee":
    case "account":
    case "login":
    case "register":
      return `/${first}`;
    default:
      return SOUND_PAGES.has(first) ? `/sounds/${first}` : "/";
  }
}
