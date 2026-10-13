import { useSyncExternalStore } from "react";

import { pickLine, type CompanionLineKind } from "@/core/kids/companionLines";

import type { CompanionMood } from "./Companion";

/**
 * The website's CompanionProvider: what the floating companion says and how it looks. A small module store
 * (the kids area has one companion), so any game can make it react without a provider around it.
 */

interface Reaction {
  line: string | null;
  mood: CompanionMood;
}

const MOOD_FOR: Partial<Record<CompanionLineKind, CompanionMood>> = {
  correct: "happy",
  finish: "cheer",
  daily: "cheer",
  chest: "cheer",
  almost: "thinking",
  listening: "thinking",
};

let reaction: Reaction = { line: null, mood: "idle" };
let counter = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function set(next: Reaction) {
  reaction = next;
  listeners.forEach((notify) => notify());
}

/** Makes the companion say something for a few seconds, then go back to idle. */
function react(kind: CompanionLineKind, mood?: CompanionMood) {
  counter += 1;
  set({ line: pickLine(kind, counter + Date.now() / 1000), mood: mood ?? MOOD_FOR[kind] ?? "happy" });
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => set({ line: null, mood: "idle" }), 3200);
}

/** Sets a lasting mood (e.g. "thinking" while listening) without a line; pass "idle" to clear. */
function setMood(mood: CompanionMood) {
  if (timer) clearTimeout(timer);
  set({ line: null, mood });
}

export const companion = { react, setMood };

export function useCompanion() {
  const current = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => reaction,
  );
  return { ...current, react, setMood };
}
