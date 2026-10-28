import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";

import type { Ambience } from "@/core/seerah/seerahContent";

import { seerahSoundsOn } from "./seerahStore";

/*
 * The website's seerahSound: the same sounds, rendered into small WAV files by
 * scripts/build-seerah-sfx.mjs since the app has no WebAudio. Ambience loops fade in and out with
 * where the story is; effects play once. Off until the reader turns sound on in the chapter's header;
 * the chapter screen silences everything when it closes or the app goes to the background.
 */

const AMBIENCE: Record<Ambience, number> = {
  wind: require("@/assets/audio/seerah-wind.wav"),
  crickets: require("@/assets/audio/seerah-crickets.wav"),
  waves: require("@/assets/audio/seerah-waves.wav"),
  crowd: require("@/assets/audio/seerah-crowd.wav"),
  birds: require("@/assets/audio/seerah-birds.wav"),
};

const LEVELS: Record<Ambience, number> = { wind: 0.45, crickets: 0.35, waves: 0.55, crowd: 0.3, birds: 0.35 };

type Effect = "pass" | "chime" | "wrong" | "swish" | "bells" | "rumble" | "gust" | "fanfare";

const EFFECTS: Record<Effect, number> = {
  pass: require("@/assets/audio/seerah-pass.wav"),
  chime: require("@/assets/audio/seerah-chime.wav"),
  wrong: require("@/assets/audio/seerah-wrong.wav"),
  swish: require("@/assets/audio/seerah-swish.wav"),
  bells: require("@/assets/audio/seerah-bells.wav"),
  rumble: require("@/assets/audio/seerah-rumble.wav"),
  gust: require("@/assets/audio/seerah-gust.wav"),
  fanfare: require("@/assets/audio/seerah-fanfare.wav"),
};

const loops = new Map<Ambience, AudioPlayer>();
const effects = new Map<Effect, AudioPlayer>();
const targets = new Map<Ambience, number>();
let fader: ReturnType<typeof setInterval> | null = null;

/** Moves every loop's volume a step toward its target; pauses a loop once it is silent. */
function step() {
  let moving = false;
  for (const [name, player] of loops) {
    const target = targets.get(name) ?? 0;
    const next = player.volume + Math.sign(target - player.volume) * Math.min(0.04, Math.abs(target - player.volume));
    if (next !== player.volume) {
      player.volume = next;
      moving = true;
    }
    if (target === 0 && next === 0 && player.playing) player.pause();
  }
  if (!moving && fader) {
    clearInterval(fader);
    fader = null;
  }
}

function safely(action: () => void) {
  try {
    action();
  } catch {
    // Sounds are a nicety only.
  }
}

export const seerahSound = {
  /** Which loops the place calls for; the rest fade away. */
  setAmbience(next: Ambience[]) {
    const on = seerahSoundsOn();
    safely(() => {
      for (const name of Object.keys(AMBIENCE) as Ambience[]) {
        const target = on && next.includes(name) ? LEVELS[name] : 0;
        targets.set(name, target);
        if (target === 0) continue;
        let player = loops.get(name);
        if (!player) {
          player = createAudioPlayer(AMBIENCE[name]);
          player.loop = true;
          player.volume = 0;
          loops.set(name, player);
        }
        if (!player.playing) player.play();
      }
      if (!fader) fader = setInterval(step, 60);
    });
  },

  /** Everything off at once: leaving the chapter, the app going to the background. */
  silence() {
    safely(() => {
      for (const [name, player] of loops) {
        targets.set(name, 0);
        player.volume = 0;
        player.pause();
      }
      if (fader) {
        clearInterval(fader);
        fader = null;
      }
    });
  },

  effect(name: Effect) {
    if (!seerahSoundsOn()) return;
    safely(() => {
      let player = effects.get(name);
      if (!player) {
        player = createAudioPlayer(EFFECTS[name]);
        player.volume = 0.8;
        effects.set(name, player);
      }
      void player.seekTo(0);
      player.play();
    });
  },

  /** A light tap and a breath of air as the story moves on a beat. */
  beat() {
    Haptics.selectionAsync().catch(() => {});
    seerahSound.effect("pass");
  },

  /** The end of a chapter. */
  finish() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    seerahSound.effect("chime");
  },
};
