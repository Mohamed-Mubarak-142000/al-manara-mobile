import { duaAudioUrl, type Dua } from "@/core/adhkar/duasData";
import { currentTrack, usePlayerValue, type Track } from "@/features/audio/playerStore";

/** Split cards of one source entry share its recording, so the track is keyed by the entry. */
export function dhikrTrack(dua: Dua): Track {
  return { id: `dhikr-${dua.id.split("-")[1]}`, title: dua.title, artist: "حصن المسلم", url: duaAudioUrl(dua) };
}

export type ListenState = "loading" | "playing" | "paused" | null;

/** One track's state in the shared player; just this value, so progress ticks don't re-render the caller. */
export function useListenState(trackId: string): ListenState {
  return usePlayerValue((state) =>
    currentTrack(state)?.id !== trackId ? null : state.playing ? "playing" : state.buffering ? "loading" : "paused",
  );
}
