import { useLocalSearchParams } from "expo-router";

import { SurahMatchGame } from "@/features/kids/games/SurahMatchGame";
import { parseKidsSurah } from "@/features/kids/kidsData";

/** The website's /kids/games/surah-match (?surah= keeps that surah among the pairs). */
export default function KidsSurahMatchScreen() {
  const focus = parseKidsSurah(useLocalSearchParams<{ surah?: string }>().surah);
  return <SurahMatchGame key={focus ?? "all"} focusSurahId={focus} />;
}
