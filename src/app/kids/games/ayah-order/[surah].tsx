import { useLocalSearchParams } from "expo-router";

import { AyahOrderGame } from "@/features/kids/games/AyahOrderGame";
import { parseKidsSurah } from "@/features/kids/kidsData";
import { KidsNotFound } from "@/features/kids/ui/LevelGate";

/** The website's /kids/games/ayah-order/[surah]: tap the ayahs in Mushaf order. */
export default function KidsAyahOrderGameScreen() {
  const id = parseKidsSurah(useLocalSearchParams<{ surah: string }>().surah);
  return id ? <AyahOrderGame key={id} surahId={id} /> : <KidsNotFound />;
}
