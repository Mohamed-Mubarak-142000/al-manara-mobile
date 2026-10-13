import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";

/**
 * The website's kids sfx.ts. It synthesizes the notes with WebAudio; the app plays the same notes from tiny
 * WAV files (scripts/build-kids-sfx.mjs) and adds a matching haptic. The sound toggle is the same setting
 * as the website's ("أصوات الألعاب"), remembered on this device.
 */

const STORAGE_KEY = "al-manara:kids-sfx:v1";
const listeners = new Set<() => void>();

function readEnabled(): boolean {
  try {
    return Storage.getItemSync(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

let enabled = readEnabled();

export function setSfxEnabled(next: boolean) {
  enabled = next;
  try {
    Storage.setItemSync(STORAGE_KEY, next ? "on" : "off");
  } catch {
    // This session only.
  }
  listeners.forEach((notify) => notify());
}

export function useSfxEnabled(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => enabled,
  );
}

type Sound = "tap" | "correct" | "wrong" | "flip" | "win";

const SOURCES: Record<Sound, number> = {
  tap: require("@/assets/audio/kids-tap.wav"),
  correct: require("@/assets/audio/kids-correct.wav"),
  wrong: require("@/assets/audio/kids-wrong.wav"),
  flip: require("@/assets/audio/kids-flip.wav"),
  win: require("@/assets/audio/kids-win.wav"),
};

const players = new Map<Sound, AudioPlayer>();

function play(sound: Sound) {
  if (!enabled) return;
  try {
    let player = players.get(sound);
    if (!player) {
      player = createAudioPlayer(SOURCES[sound]);
      player.volume = 0.8;
      players.set(sound, player);
    }
    void player.seekTo(0);
    player.play();
  } catch {
    // Sounds are a nicety only.
  }
}

/** Short, gentle sounds for the kids' games, each with a matching haptic. */
export const sfx = {
  tap: () => {
    Haptics.selectionAsync().catch(() => {});
    play("tap");
  },
  correct: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    play("correct");
  },
  wrong: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    play("wrong");
  },
  flip: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    play("flip");
  },
  win: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    play("win");
  },
};
