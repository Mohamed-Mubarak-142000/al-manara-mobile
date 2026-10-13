import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from "expo-audio";
import { useSyncExternalStore } from "react";

import { audio as appAudio, getPlayerState } from "@/features/audio/playerStore";

/**
 * The kids pages' own player: one ayah or one surah at a time, with an "ended" callback (the website's
 * audio.play(track, { onEnded })), which the learn screen's repeat → next-ayah chain needs. Like the
 * website's `kids-` tracks it stops when the page that started it goes away, so it never needs the
 * mini player; starting it pauses whatever the app-wide player was playing.
 */

export interface KidsAudioState {
  /** Id of the clip loaded now (the website's track ids: kids-muallim-<n>, kids-teach-<surah>…). */
  id: string | null;
  playing: boolean;
  loading: boolean;
  error: string | null;
}

let state: KidsAudioState = { id: null, playing: false, loading: false, error: null };
const listeners = new Set<() => void>();
let player: AudioPlayer | null = null;
let onEnded: (() => void) | null = null;

function set(patch: Partial<KidsAudioState>) {
  const next = { ...state, ...patch };
  if (next.id === state.id && next.playing === state.playing && next.loading === state.loading && next.error === state.error) return;
  state = next;
  listeners.forEach((notify) => notify());
}

function onStatus(status: AudioStatus) {
  if (status.didJustFinish) {
    const ended = onEnded;
    onEnded = null;
    set({ playing: false, loading: false });
    ended?.();
    return;
  }
  if (status.error) {
    set({ playing: false, loading: false, error: "تعذّر تشغيل التلاوة الآن، تأكد من الاتصال وحاول مرة أخرى." });
    return;
  }
  set({ playing: status.playing, loading: !status.playing && status.isBuffering });
}

function getPlayer(): AudioPlayer {
  if (player) return player;
  setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" }).catch(() => {});
  player = createAudioPlayer(null, { updateInterval: 300 });
  player.addListener("playbackStatusUpdate", onStatus);
  return player;
}

export const kidsAudio = {
  play(id: string, url: string, options?: { onEnded?: () => void }) {
    if (getPlayerState().playing) appAudio.toggle();
    const p = getPlayer();
    onEnded = options?.onEnded ?? null;
    set({ id, playing: false, loading: true, error: null });
    try {
      p.replace({ uri: url });
      p.play();
    } catch {
      set({ loading: false, error: "تعذّر تشغيل التلاوة الآن، تأكد من الاتصال وحاول مرة أخرى." });
    }
  },
  toggle() {
    const p = player;
    if (!p || !state.id) return;
    if (state.playing) p.pause();
    else {
      if (getPlayerState().playing) appAudio.toggle();
      p.play();
    }
  },
  pause() {
    player?.pause();
  },
  stop() {
    onEnded = null;
    player?.pause();
    set({ id: null, playing: false, loading: false, error: null });
  },
  isCurrent(id: string): boolean {
    return state.id === id;
  },
  getState(): KidsAudioState {
    return state;
  },
};

export function useKidsAudio(): KidsAudioState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}
