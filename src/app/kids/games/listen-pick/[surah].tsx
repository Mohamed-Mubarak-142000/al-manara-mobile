import { useLocalSearchParams } from "expo-router";

import { ListenPickGame } from "@/features/kids/games/ListenPickGame";
import { parseKidsSurah } from "@/features/kids/kidsData";
import { KidsNotFound } from "@/features/kids/ui/LevelGate";

/** The website's /kids/games/listen-pick/[surah]: hear an ayah, then find it among three. */
export default function KidsListenPickGameScreen() {
  const id = parseKidsSurah(useLocalSearchParams<{ surah: string }>().surah);
  return id ? <ListenPickGame key={id} surahId={id} /> : <KidsNotFound />;
}
