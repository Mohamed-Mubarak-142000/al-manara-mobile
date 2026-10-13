import { useLocalSearchParams } from "expo-router";

import { parseKidsSurah } from "@/features/kids/kidsData";
import { KidsQuiz } from "@/features/kids/quiz/KidsQuiz";
import { KidsNotFound, LevelGate } from "@/features/kids/ui/LevelGate";

/** The website's /kids/quiz/[surah]: passing a surah's quiz opens the next one. */
export default function KidsQuizScreen() {
  const id = parseKidsSurah(useLocalSearchParams<{ surah: string }>().surah);
  if (!id) return <KidsNotFound />;
  return (
    <LevelGate surahId={id}>
      <KidsQuiz key={id} surahId={id} />
    </LevelGate>
  );
}
