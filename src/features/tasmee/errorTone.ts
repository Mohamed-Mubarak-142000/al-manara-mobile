import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { Vibration } from "react-native";

/**
 * The website's errorTone.ts: two short falling notes (587 then 392 Hz, rendered once into
 * assets/audio/tasmee-error.wav) and the same [120, 60, 120] buzz. Its own small player, so it never
 * touches the recitation player's queue.
 */
let player: AudioPlayer | null = null;

export function playErrorTone() {
  try {
    player ??= createAudioPlayer(require("@/assets/audio/tasmee-error.wav"));
    void player.seekTo(0);
    player.play();
  } catch {
    // Sound is a nicety: the dialog still shows.
  }
  Vibration.vibrate([0, 120, 60, 120]);
}
