import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from "expo-audio";
import { useSyncExternalStore } from "react";

import { getRadioMediaUrl } from "@/core/sounds/soundsApi";
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
  /**
   * Backup streams, tried in order when `url` stalls or fails (the website's radioFailover).
   * The player comes back to `url` on the next play.
   */
  fallbackUrls?: string[];
}

/** Prefix for an Egyptian Quran Radio library clip, resolved to its HLS playlist when played. */
export const RADIO_REF = "radio-ref:";

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
  /** Index into [url, ...fallbackUrls] of the stream playing now; > 0 means a backup. */
  streamIndex: number;
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
  streamIndex: 0,
};

/** The website's radioFailover STALL_MS: a stream silent this long is given up on. */
const STALL_MS = 12_000;
/** Once every stream has failed, start over after this long (RETRY_MS). */
const RETRY_MS = 20_000;
let stallTimer: ReturnType<typeof setTimeout> | null = null;
/** What the armed watchdog will do; also run at once when the stream reports an error. */
let onStall: (() => void) | null = null;
/** Bumped on every load, so a late resolve or timer from a previous track is ignored. */
let generation = 0;

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

function clearStall() {
  if (stallTimer) clearTimeout(stallTimer);
  stallTimer = null;
  onStall = null;
}

function onStatus(status: AudioStatus) {
  if (status.didJustFinish) {
    advance(true);
    return;
  }
  if (status.playing) clearStall();
  // A stream that fails outright (404, blocked, gone) moves to the backup now, not after the full wait.
  else if (status.error && onStall) {
    const giveUp = onStall;
    clearStall();
    giveUp();
    return;
  }
  set({
    playing: status.playing,
    buffering: status.isBuffering,
    currentTime: status.currentTime,
    duration: Number.isFinite(status.duration) ? status.duration : 0,
  });
}

async function resolveUrl(track: Track, streamIndex: number): Promise<string | null> {
  const url = streamIndex === 0 ? track.url : track.fallbackUrls?.[streamIndex - 1];
  if (!url) return null;
  if (streamIndex === 0) {
    const local = localUriFor(track.id);
    if (local) return local;
  }
  return url.startsWith(RADIO_REF) ? getRadioMediaUrl(url.slice(RADIO_REF.length)) : url;
}

/** Arms the stall watchdog: a stream that hasn't started playing in time moves to the next backup. */
function watchStall(index: number, streamIndex: number, current: number) {
  clearStall();
  const track = state.queue[index];
  if (!track?.fallbackUrls?.length) return;
  const giveUp = () => {
    if (current !== generation || state.playing) return;
    const next = streamIndex + 1;
    if (next <= track.fallbackUrls!.length) void load(index, true, next);
    else {
      player?.pause();
      set({ error: true, buffering: false });
      stallTimer = setTimeout(() => current === generation && void load(index, true, 0), RETRY_MS);
    }
  };
  onStall = giveUp;
  stallTimer = setTimeout(giveUp, STALL_MS);
}

async function load(index: number, autoplay = true, streamIndex = 0) {
  const track = state.queue[index];
  if (!track) return;
  const current = ++generation;
  const audio = getPlayer();
  set({ index, currentTime: 0, duration: 0, error: false, buffering: true, streamIndex });
  try {
    const uri = await resolveUrl(track, streamIndex);
    if (current !== generation) return;
    if (!uri) {
      set({ error: true, buffering: false });
      return;
    }
    audio.replace({ uri });
    audio.setPlaybackRate(track.live ? 1 : state.rate);
    audio.setActiveForLockScreen(
      true,
      { title: track.title, artist: track.artist, albumTitle: "المنارة", artworkUrl: track.artworkUrl },
      { showSeekForward: !track.live, showSeekBackward: !track.live, isLiveStream: track.live },
    );
    if (autoplay) audio.play();
    watchStall(index, streamIndex, current);
  } catch {
    if (current === generation) set({ error: true, buffering: false });
  }
}

function advance(finished: boolean) {
  const { repeat, index, queue } = state;
  if (finished && repeat === "one") {
    player?.seekTo(0);
    player?.play();
    return;
  }
  if (index + 1 < queue.length) void load(index + 1);
  else if (repeat === "all" && queue.length) void load(0);
  else set({ playing: false, currentTime: 0 });
}

export const audio = {
  /** Replaces the queue and starts playing `startIndex`. */
  playQueue(queue: Track[], startIndex = 0) {
    set({ queue });
    void load(startIndex);
  },
  playTrack(track: Track) {
    audio.playQueue([track], 0);
  },
  toggle() {
    const p = getPlayer();
    if (state.playing) {
      // A deliberate pause ends any failover in progress, like the website's onPause.
      generation += 1;
      clearStall();
      p.pause();
    } else if (state.error) void load(state.index);
    else p.play();
  },
  next() {
    advance(false);
  },
  previous() {
    // Like every music app: a restart first, the previous track only near the start.
    if (state.currentTime > 4 || state.index === 0) player?.seekTo(0);
    else void load(state.index - 1);
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
    generation += 1;
    clearStall();
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
