import { Lock } from "lucide-react-native";
import type { ReactNode } from "react";
import { View } from "react-native";

import { isSurahUnlocked } from "@/core/kids/levels";

import { useKidsProgress } from "../progress/progressStore";
import { KidsButton } from "./KidsButton";
import { KidsPanel, KidsText } from "./KidsPanel";
import { KidsScroll } from "./KidsScroll";
import { KIDS } from "./kidsStyles";
import { go } from "./nav";

/** Shows a surah's page only once it is open, so a direct link can't skip a level. */
export function LevelGate({ surahId, children }: { surahId: number; children: ReactNode }) {
  const { state, status } = useKidsProgress();
  if (status === "loading") return null;
  if (isSurahUnlocked(state, surahId)) return children;
  return (
    <KidsScroll>
      <KidsPanel className="items-center">
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: KIDS.soft, alignItems: "center", justifyContent: "center" }}>
          <Lock size={40} color={KIDS.muted} />
        </View>
        <KidsText size={28} bold center className="mt-5">
          هذه السورة مقفلة
        </KidsText>
        <KidsText size={17} tone="muted" center className="mt-2">
          انجح في اختبار السورة السابقة لتفتح هذه السورة.
        </KidsText>
        <KidsButton tone="gold" className="mt-6" onPress={() => go("/kids/quiz")}>
          إلى الاختبارات
        </KidsButton>
      </KidsPanel>
    </KidsScroll>
  );
}

/** The website's notFound() for a surah outside the kids list. */
export function KidsNotFound() {
  return (
    <KidsScroll>
      <KidsPanel className="items-center">
        <KidsText size={24} bold center>
          لم نجد هذه الصفحة
        </KidsText>
        <KidsButton tone="emerald" className="mt-5" onPress={() => go("/kids")}>
          العودة للخريطة
        </KidsButton>
      </KidsPanel>
    </KidsScroll>
  );
}
