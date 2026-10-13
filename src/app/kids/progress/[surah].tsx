import { useLocalSearchParams } from "expo-router";

import { parseKidsSurah } from "@/features/kids/kidsData";
import { SurahChecklist } from "@/features/kids/progress/SurahChecklist";
import { KidsNotFound } from "@/features/kids/ui/LevelGate";

/** The website's /kids/progress/[surah]: "ما حفظته". */
export default function KidsSurahProgressScreen() {
  const id = parseKidsSurah(useLocalSearchParams<{ surah: string }>().surah);
  return id ? <SurahChecklist key={id} surahId={id} /> : <KidsNotFound />;
}
