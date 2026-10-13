import { useLocalSearchParams } from "expo-router";

import { ArrangeAyahGame } from "@/features/kids/games/ArrangeAyahGame";
import { parseKidsSurah } from "@/features/kids/kidsData";
import { KidsNotFound } from "@/features/kids/ui/LevelGate";

/** The website's /kids/games/arrange/[surah]: put an ayah's words back in order. */
export default function KidsArrangeAyahGameScreen() {
  const id = parseKidsSurah(useLocalSearchParams<{ surah: string }>().surah);
  return id ? <ArrangeAyahGame key={id} surahId={id} /> : <KidsNotFound />;
}
