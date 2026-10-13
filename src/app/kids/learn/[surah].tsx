import { useLocalSearchParams } from "expo-router";

import { parseKidsSurah } from "@/features/kids/kidsData";
import { KidsLearn } from "@/features/kids/learn/KidsLearn";
import { KidsNotFound, LevelGate } from "@/features/kids/ui/LevelGate";

/** The website's /kids/learn/[surah]: ayah by ayah with the sheikh, repeat, tafsir and "I memorized it". */
export default function KidsLearnScreen() {
  const id = parseKidsSurah(useLocalSearchParams<{ surah: string }>().surah);
  if (!id) return <KidsNotFound />;
  return (
    <LevelGate surahId={id}>
      <KidsLearn key={id} surahId={id} />
    </LevelGate>
  );
}
