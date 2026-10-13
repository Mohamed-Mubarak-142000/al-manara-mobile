import { useLocalSearchParams } from "expo-router";

import { SurahMission } from "@/features/kids/journey/SurahMission";
import { parseKidsSurah } from "@/features/kids/kidsData";
import { KidsNotFound } from "@/features/kids/ui/LevelGate";

/** The website's /kids/journey/[surah]: one station's five missions. */
export default function KidsStationScreen() {
  const id = parseKidsSurah(useLocalSearchParams<{ surah: string }>().surah);
  return id ? <SurahMission key={id} surahId={id} /> : <KidsNotFound />;
}
