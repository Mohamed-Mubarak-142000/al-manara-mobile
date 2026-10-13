import { useLocalSearchParams } from "expo-router";

import { TajweedColorGame } from "@/features/kids/games/TajweedColorGame";
import { parseKidsSurah } from "@/features/kids/kidsData";
import { KidsNotFound } from "@/features/kids/ui/LevelGate";

/** The website's /kids/games/tajweed/[surah]: find and colour the tajweed rules. */
export default function KidsTajweedColorGameScreen() {
  const id = parseKidsSurah(useLocalSearchParams<{ surah: string }>().surah);
  return id ? <TajweedColorGame key={id} surahId={id} /> : <KidsNotFound />;
}
