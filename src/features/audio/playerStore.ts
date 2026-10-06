import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from "expo-audio";
import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";

import { getRadioMediaUrl } from "@/core/sounds/soundsApi";
import { localAyahFor } from "@/features/downloads/ayahPacks";
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

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

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
  /** The track could not be played (every stream failed or stalled); `audio.toggle` retries. */
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
/** Once every live stream has failed, start over after this long (RETRY_MS). Recorded tracks wait for the user. */
const RETRY_MS = 20_000;
/** How often the position is written while playing. */
const SAVE_EVERY_MS = 5_000;
const KEY = "al-manara:player:v1";

/** What survives a restart: the speed and repeat choices, and where the user stopped. */
export interface SavedPlayer {
  rate: number;
  repeat: RepeatMode;
  queue: Track[];
  index: number;
  position: number;
  duration: number;
}

export function nextRate(rate: number): number {
  const at = PLAYBACK_RATES.indexOf(rate as (typeof PLAYBACK_RATES)[number]);
  return PLAYBACK_RATES[(at + 1) % PLAYBACK_RATES.length] ?? 1;
}

export function nextRepeat(mode: RepeatMode): RepeatMode {
  return mode === "off" ? "all" : mode === "all" ? "one" : "off";
}

/** Validates what was saved, so a corrupt or older entry falls back to defaults instead of crashing. */
export function parseSaved(raw: string | null): Partial<PlayerState> {
  if (!raw) return {};
  try {
    const saved = JSON.parse(raw) as Partial<SavedPlayer>;
    const patch: Partial<PlayerState> = {};
    if (typeof saved.rate === "number" && (PLAYBACK_RATES as readonly number[]).includes(saved.rate)) patch.rate = saved.rate;
    if (saved.repeat === "off" || saved.repeat === "one" || saved.repeat === "all") patch.repeat = saved.repeat;
    const queue = Array.isArray(saved.queue) ? saved.queue.filter((t) => t && typeof t.id === "string" && typeof t.url === "string") : [];
    const index = typeof saved.index === "number" ? saved.index : 0;
    if (queue[index]) {
      patch.queue = queue;
      patch.index = index;
      patch.currentTime = queue[index].live ? 0 : Math.max(0, Number(saved.position) || 0);
      patch.duration = queue[index].live ? 0 : Math.max(0, Number(saved.duration) || 0);
    }
    return patch;
  } catch {
    return {};
  }
}

function readSaved(): Partial<PlayerState> {
  try {
    return parseSaved(Storage.getItemSync(KEY));
  } catch {
    return {};
  }
}

let stallTimer: ReturnType<typeof setTimeout> | null = null;
/** What the armed watchdog will do; also run at once when the stream reports an error. */
let onStall: (() => void) | null = null;
/** Bumped on every load, so a late resolve or timer from a previous track is ignored. */
let generation = 0;
/** Whether the current track's source is in the player (false after a restart or stop). */
let sourceLoaded = false;
/** The user wants sound: set by play, cleared by a deliberate pause. A stall only counts while true. */
let wantPlay = false;
/** Where to jump once the new source has loaded (resume after a restart or a retry). */
let pendingSeek: number | null = null;
let lastSaved = 0;

let state: PlayerState = { ...INITIAL, ...readSaved() };
const listeners = new Set<() => void>();
let player: AudioPlayer | null = null;
let sleepTimer: ReturnType<typeof setTimeout> | null = null;

function set(patch: Partial<PlayerState>) {
  state = { ...state, ...patch };
  listeners.forEach((notify) => notify());
}

function save() {
  lastSaved = Date.now();
  const track = state.queue[state.index];
  const saved: SavedPlayer = {
    rate: state.rate,
    repeat: state.repeat,
    queue: track ? state.queue : [],
    index: state.index,
    position: track?.live ? 0 : state.currentTime,
    duration: track?.live ? 0 : state.duration,
  };
  try {
    Storage.setItemSync(KEY, JSON.stringify(saved));
  } catch {
    // This session keeps working; the next launch starts fresh.
  }
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
  // A stream that fails outright (404, blocked, offline) moves on now, not after the full wait.
  else if (status.error && wantPlay) {
    const giveUp = onStall ?? failer(state.index, state.streamIndex, generation);
    clearStall();
    set({ playing: false });
    giveUp();
    return;
  }
  // Stuck buffering mid-track (the connection dropped): the same watchdog as at load.
  else if (status.isBuffering && wantPlay && !stallTimer) watchStall(state.index, state.streamIndex, generation);

  if (pendingSeek !== null && status.isLoaded) {
    const target = pendingSeek;
    pendingSeek = null;
    void player?.seekTo(target);
    set({ playing: status.playing, buffering: status.isBuffering, currentTime: target });
    return;
  }
  set({
    playing: status.playing,
    buffering: status.isBuffering,
    currentTime: pendingSeek ?? status.currentTime,
    duration: Number.isFinite(status.duration) && status.duration > 0 ? status.duration : pendingSeek !== null ? state.duration : 0,
  });
  if (status.playing && Date.now() - lastSaved > SAVE_EVERY_MS) save();
}

async function resolveUrl(track: Track, streamIndex: number): Promise<string | null> {
  const url = streamIndex === 0 ? track.url : track.fallbackUrls?.[streamIndex - 1];
  if (!url) return null;
  if (streamIndex === 0) {
    // A saved recording (by id) or a saved ayah pack (by the ayah's stream) plays from the device.
    const local = localUriFor(track.id) ?? localAyahFor(track);
    if (local) return local;
  }
  return url.startsWith(RADIO_REF) ? getRadioMediaUrl(url.slice(RADIO_REF.length)) : url;
}

/** Gives up on the current stream: the next backup if there is one, otherwise an error the user can retry. */
function failer(index: number, streamIndex: number, current: number) {
  return () => {
    if (current !== generation || state.playing) return;
    const track = state.queue[index];
    if (!track) return;
    const next = streamIndex + 1;
    if (next <= (track.fallbackUrls?.length ?? 0)) {
      void load(index, true, next);
      return;
    }
    player?.pause();
    set({ error: true, buffering: false, playing: false });
    // A live station comes back by itself; a recording waits for the retry button.
    if (track.live) stallTimer = setTimeout(() => current === generation && void load(index, true, 0), RETRY_MS);
    else wantPlay = false;
  };
}

/** Arms the stall watchdog: a stream that hasn't started playing in time is given up on. */
function watchStall(index: number, streamIndex: number, current: number) {
  clearStall();
  const giveUp = failer(index, streamIndex, current);
  onStall = giveUp;
  stallTimer = setTimeout(giveUp, STALL_MS);
}

async function load(index: number, autoplay = true, streamIndex = 0, startAt = 0) {
  const track = state.queue[index];
  if (!track) return;
  const current = ++generation;
  const audio = getPlayer();
  clearStall();
  wantPlay = autoplay;
  pendingSeek = !track.live && startAt > 1 ? startAt : null;
  set({
    index,
    currentTime: pendingSeek ?? 0,
    duration: pendingSeek !== null ? state.duration : 0,
    error: false,
    buffering: autoplay,
    streamIndex,
  });
  save();
  try {
    const uri = await resolveUrl(track, streamIndex);
    if (current !== generation) return;
    if (!uri) {
      failer(index, streamIndex, current)();
      return;
    }
    audio.replace({ uri });
    sourceLoaded = true;
    audio.setPlaybackRate(track.live ? 1 : state.rate);
    audio.setActiveForLockScreen(
      true,
      { title: track.title, artist: track.artist, albumTitle: "المنارة", artworkUrl: track.artworkUrl },
      { showSeekForward: !track.live, showSeekBackward: !track.live, isLiveStream: track.live },
    );
    if (autoplay) {
      audio.play();
      watchStall(index, streamIndex, current);
    }
  } catch {
    // Resolving a radio clip failed (offline): try the backups, then show the error.
    if (current === generation) failer(index, streamIndex, current)();
  }
}

function advance(finished: boolean) {
  const { repeat, index, queue } = state;
  if (finished && repeat === "one") {
    void player?.seekTo(0);
    player?.play();
    return;
  }
  if (index + 1 < queue.length) void load(index + 1);
  else if (repeat === "all" && queue.length) void load(0);
  else {
    wantPlay = false;
    set({ playing: false, currentTime: 0 });
    save();
  }
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
    if (state.playing || (wantPlay && state.buffering)) {
      // A deliberate pause ends any failover in progress, like the website's onPause.
      generation += 1;
      wantPlay = false;
      clearStall();
      getPlayer().pause();
      set({ buffering: false });
      save();
    } else audio.resume();
  },
  /** Plays again: after a failure or a restart it reloads the track where it stopped. */
  resume() {
    if (!state.queue[state.index]) return;
    if (state.error || !sourceLoaded) void load(state.index, true, 0, state.currentTime);
    else {
      wantPlay = true;
      getPlayer().play();
      watchStall(state.index, state.streamIndex, generation);
    }
  },
  next() {
    advance(false);
  },
  previous() {
    // Like every music app: a restart first, the previous track only near the start.
    if (state.currentTime > 4 || state.index === 0) audio.seekTo(0);
    else void load(state.index - 1);
  },
  seekTo(seconds: number) {
    const target = Math.max(0, seconds);
    // Restored but not loaded yet: just move the resume point.
    if (!sourceLoaded) set({ currentTime: target });
    else void player?.seekTo(target);
  },
  skip(seconds: number) {
    audio.seekTo(state.currentTime + seconds);
  },
  setRate(rate: number) {
    if (sourceLoaded && !state.queue[state.index]?.live) player?.setPlaybackRate(rate);
    set({ rate });
    save();
  },
  cycleRepeat() {
    set({ repeat: nextRepeat(state.repeat) });
    save();
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
        wantPlay = false;
        clearStall();
        player?.pause();
        set({ sleepAt: null, sleepMinutes: null });
        save();
      },
      minutes * 60 * 1000,
    );
    set({ sleepAt: Date.now() + minutes * 60 * 1000, sleepMinutes: minutes });
  },
  stop() {
    generation += 1;
    wantPlay = false;
    sourceLoaded = false;
    pendingSeek = null;
    clearStall();
    player?.pause();
    player?.clearLockScreenControls();
    audio.setSleepTimer(null);
    set({ ...INITIAL, rate: state.rate, repeat: state.repeat });
    save();
  },
};

export function usePlayer(): PlayerState {
  return useSyncExternalStore(subscribe, () => state);
}

/** The current state outside React (tests, one-off reads). */
export function getPlayerState(): PlayerState {
  return state;
}

export function currentTrack(s: PlayerState): Track | null {
  return s.queue[s.index] ?? null;
}
