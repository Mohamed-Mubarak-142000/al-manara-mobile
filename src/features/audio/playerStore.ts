import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from "expo-audio";
import { useSyncExternalStore } from "react";

import { localUriFor } from "@/features/downloads/downloadStore";

export interface Track {
  /** Stable id; downloads are keyed by it too. */
  id: string;
  title: string;
  artist: string;
  url: string;
  artworkUrl?: string;
  /** Radio and other streams: no duration, no seeking. */
  live?: boolean;
}

export type RepeatMode = "off" | "one" | "all";

export interface PlayerState {
  queue: Track[];
  index: number;
  playing: boolean;
  buffering: boolean;
  currentTime: number;
  duration: number;
  rate: number;
  repeat: RepeatMode;
  /** Epoch ms when the sleep timer pauses playback, or null. */
  sleepAt: number | null;
  /** The sleep timer length the user picked, for cycling through the choices. */
  sleepMinutes: number | null;
  error: boolean;
}

const INITIAL: PlayerState = {
  queue: [],
  index: 0,
  playing: false,
  buffering: false,
  currentTime: 0,
  duration: 0,
  rate: 1,
  repeat: "off",
  sleepAt: null,
  sleepMinutes: null,
  error: false,
};

let state = INITIAL;
const listeners = new Set<() => void>();
let player: AudioPlayer | null = null;
let sleepTimer: ReturnType<typeof setTimeout> | null = null;

function set(patch: Partial<PlayerState>) {
  state = { ...state, ...patch };
  listeners.forEach((notify) => notify());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The one app-wide player. It outlives every screen (createAudioPlayer, not the hook) so audio keeps
 * going while the user browses, locks the phone, or leaves the app.
 */
function getPlayer(): AudioPlayer {
  if (player) return player;
  setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" }).catch(() => {});
  player = createAudioPlayer(null, { updateInterval: 500 });
  player.addListener("playbackStatusUpdate", onStatus);
  return player;
}

function onStatus(status: AudioStatus) {
  if (status.didJustFinish) {
    advance(true);
    return;
  }
  set({
    playing: status.playing,
    buffering: status.isBuffering,
    currentTime: status.currentTime,
    duration: Number.isFinite(status.duration) ? status.duration : 0,
  });
}

function load(index: number, autoplay = true) {
  const track = state.queue[index];
  if (!track) return;
  const audio = getPlayer();
  set({ index, currentTime: 0, duration: 0, error: false, buffering: true });
  try {
    audio.replace({ uri: localUriFor(track.id) ?? track.url });
    audio.setPlaybackRate(track.live ? 1 : state.rate);
    audio.setActiveForLockScreen(
      true,
      { title: track.title, artist: track.artist, albumTitle: "المنارة", artworkUrl: track.artworkUrl },
      { showSeekForward: !track.live, showSeekBackward: !track.live, isLiveStream: track.live },
    );
    if (autoplay) audio.play();
  } catch {
    set({ error: true, buffering: false });
  }
}

function advance(finished: boolean) {
  const { repeat, index, queue } = state;
  if (finished && repeat === "one") {
    player?.seekTo(0);
    player?.play();
    return;
  }
  if (index + 1 < queue.length) load(index + 1);
  else if (repeat === "all" && queue.length) load(0);
  else set({ playing: false, currentTime: 0 });
}

export const audio = {
  /** Replaces the queue and starts playing `startIndex`. */
  playQueue(queue: Track[], startIndex = 0) {
    set({ queue });
    load(startIndex);
  },
  playTrack(track: Track) {
    audio.playQueue([track], 0);
  },
  toggle() {
    const p = getPlayer();
    if (state.playing) p.pause();
    else p.play();
  },
  next() {
    advance(false);
  },
  previous() {
    // Like every music app: a restart first, the previous track only near the start.
    if (state.currentTime > 4 || state.index === 0) player?.seekTo(0);
    else load(state.index - 1);
  },
  seekTo(seconds: number) {
    player?.seekTo(Math.max(0, seconds));
  },
  skip(seconds: number) {
    audio.seekTo(state.currentTime + seconds);
  },
  setRate(rate: number) {
    player?.setPlaybackRate(rate);
    set({ rate });
  },
  cycleRepeat() {
    set({ repeat: state.repeat === "off" ? "all" : state.repeat === "all" ? "one" : "off" });
  },
  setSleepTimer(minutes: number | null) {
    if (sleepTimer) clearTimeout(sleepTimer);
    sleepTimer = null;
    if (minutes === null) {
      set({ sleepAt: null, sleepMinutes: null });
      return;
    }
    sleepTimer = setTimeout(
      () => {
        player?.pause();
        set({ sleepAt: null, sleepMinutes: null });
      },
      minutes * 60 * 1000,
    );
    set({ sleepAt: Date.now() + minutes * 60 * 1000, sleepMinutes: minutes });
  },
  stop() {
    player?.pause();
    player?.clearLockScreenControls();
    audio.setSleepTimer(null);
    set({ ...INITIAL, rate: state.rate, repeat: state.repeat });
  },
};

export function usePlayer(): PlayerState {
  return useSyncExternalStore(subscribe, () => state);
}

export function currentTrack(s: PlayerState): Track | null {
  return s.queue[s.index] ?? null;
}
