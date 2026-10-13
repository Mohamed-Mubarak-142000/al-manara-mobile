import { useLocalSearchParams } from "expo-router";

import { parseKidsSurah } from "@/features/kids/kidsData";
import { KidsRecite } from "@/features/kids/recite/KidsRecite";
import { KidsNotFound } from "@/features/kids/ui/LevelGate";

/** The website's /kids/recite/[surah]: "سمّعني", the child reads aloud and the companion listens. */
export default function KidsReciteScreen() {
  const id = parseKidsSurah(useLocalSearchParams<{ surah: string }>().surah);
  return id ? <KidsRecite key={id} surahId={id} /> : <KidsNotFound />;
}
