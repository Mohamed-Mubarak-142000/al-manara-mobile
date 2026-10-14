import { createAudioPlayer, type AudioPlayer } from "expo-audio";

import { getPlayerState } from "@/features/audio/playerStore";

/**
 * The tasbih's bead click (assets/audio/tasbih-click.wav, scripts/build-tasbih-click.mjs). A few players
 * take turns, so quick taps each get their own click instead of cutting the last one short.
 */
const POOL = 3;
const players: AudioPlayer[] = [];
let turn = 0;

export function playTasbihClick() {
  // Never over a recitation or the radio: the click would interrupt what the person is listening to.
  if (getPlayerState().playing) return;
  try {
    if (players.length < POOL) {
      const player = createAudioPlayer(require("@/assets/audio/tasbih-click.wav"));
      player.volume = 0.9;
      players.push(player);
    }
    const player = players[turn % players.length]!;
    turn += 1;
    void player.seekTo(0);
    player.play();
  } catch {
    // The click is a nicety; the count never depends on it.
  }
}
