import { useSyncExternalStore } from "react";

/**
 * Where the app-wide mini player sits on each route, and the sizes it is laid out with. The tab bar
 * reports its measured height (it grows with the text size), and the mini player its own, so tab
 * screens can make room for it and stack screens can pad their lists.
 */

export type MiniPlayerPlacement =
  /** Not shown: full player, first run, sign-in and other modals, screens with their own controls. */
  | "hidden"
  /** Just above the tab bar. */
  | "tabs"
  /** At the bottom safe-area inset. */
  | "bottom";

const HIDDEN = new Set([
  "player",
  "onboarding",
  "login",
  "register",
  "verify",
  "forgot-password",
  "reset-password",
  "auth",
  "share-ayah",
  "share-card",
  "repeat",
  "adhan-voice",
  // Has its own big play button and status line.
  "radio",
  // Recitation check records the microphone and stops playback itself.
  "tasmee",
  // Has its own play/pause pill in the page footer (AyahAudioPill).
  "mushaf",
]);

export function miniPlayerPlacement(segments: readonly string[]): MiniPlayerPlacement {
  const first = segments[0];
  if (first === "(tabs)" || first === undefined) return "tabs";
  if (HIDDEN.has(first)) return "hidden";
  return "bottom";
}

interface Layout {
  tabBarHeight: number;
  playerHeight: number;
}

let layout: Layout = { tabBarHeight: 0, playerHeight: 0 };
const listeners = new Set<() => void>();

function update(patch: Partial<Layout>) {
  const next = { ...layout, ...patch };
  if (next.tabBarHeight === layout.tabBarHeight && next.playerHeight === layout.playerHeight) return;
  layout = next;
  listeners.forEach((notify) => notify());
}

export const miniPlayerLayout = {
  setTabBarHeight(height: number) {
    update({ tabBarHeight: Math.round(height) });
  },
  setPlayerHeight(height: number) {
    update({ playerHeight: Math.round(height) });
  },
};

export function useMiniPlayerLayout(): Layout {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => layout,
  );
}
