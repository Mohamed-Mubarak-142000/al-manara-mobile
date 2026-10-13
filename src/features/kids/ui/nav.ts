import { router, type Href } from "expo-router";

/** Kids paths are built from ids (`/kids/learn/112`); one cast here instead of at every link. */
export function kidsHref(path: string): Href {
  return path as Href;
}

/** Opens a kids page; the journey map (the root of the kids stack) is gone back to rather than stacked again. */
export function go(path: string) {
  if (path === "/kids") router.dismissTo(kidsHref(path));
  else router.push(kidsHref(path));
}

/**
 * The bottom tabs: the journey map is the root of the kids stack, so going "home" goes back to it, and
 * another tab opens on top of it (back from any tab returns to the map, like the website's history).
 */
export function goTab(path: string, pathname: string) {
  if (pathname === path) return;
  if (path === "/kids") {
    router.dismissTo(kidsHref("/kids"));
    return;
  }
  if (pathname !== "/kids") router.dismissTo(kidsHref("/kids"));
  router.push(kidsHref(path));
}
