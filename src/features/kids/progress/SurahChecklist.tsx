import { FlashList } from "@shopify/flash-list";
import { BookOpen, Check, RefreshCw } from "lucide-react-native";
import { memo } from "react";
import { Pressable, Text, View } from "react-native";

import { getDueReviews } from "@/core/kids/reviewSchedule";
import type { Ayah } from "@/core/quran/textApi";
import { toArabicDigits } from "@/core/text/arabic";

import { kidsAyahs, kidsSurah } from "../kidsData";
import { sfx } from "../sfx";
import { KidsButton } from "../ui/KidsButton";
import { KidsPanel, KidsText, QuranText } from "../ui/KidsPanel";
import { useKidsBottomPad } from "../ui/KidsShell";
import { KIDS, PANEL_SHADOW } from "../ui/kidsStyles";
import { go } from "../ui/nav";
import { kidsProgress, useKidsState } from "./progressStore";

const AyahRow = memo(function AyahRow({ surahId, ayah, done }: { surahId: number; ayah: Ayah; done: boolean }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      onPress={() => {
        kidsProgress.setAyahMemorized(surahId, ayah.numberInSurah, !done);
        if (!done) sfx.correct();
      }}
      style={({ pressed }) => [
        {
          marginHorizontal: 12,
          marginBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          borderRadius: 32,
          padding: 14,
          borderWidth: 4,
          backgroundColor: done ? KIDS.doneBg : "rgba(255,255,255,0.95)",
          borderColor: done ? KIDS.emerald : "rgba(255,255,255,0.6)",
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        PANEL_SHADOW,
      ]}
    >
      <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: done ? KIDS.emerald : KIDS.soft }}>
        {done ? (
          <Check size={24} color={KIDS.white} />
        ) : (
          <Text className="font-kids-bold" style={{ fontSize: 17, color: KIDS.muted }}>
            {toArabicDigits(ayah.numberInSurah)}
          </Text>
        )}
      </View>
      <QuranText size={22} center={false} style={{ flex: 1 }}>
        {ayah.text}
      </QuranText>
    </Pressable>
  );
});

/** The website's /kids/progress/[surah]: tick the ayahs memorized, and mark a due review done. */
export function SurahChecklist({ surahId }: { surahId: number }) {
  const surah = kidsSurah(surahId);
  const ayahs = kidsAyahs(surahId);
  const state = useKidsState();
  const bottom = useKidsBottomPad();
  const memorized = new Set(state.memorizedAyahsBySurah[surah.id] ?? []);
  const isDue = getDueReviews(state.reviewSchedule).some((entry) => entry.surahId === surah.id);

  return (
    <FlashList
      data={ayahs}
      keyExtractor={(ayah) => String(ayah.number)}
      extraData={state.memorizedAyahsBySurah[surah.id]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: 10, paddingBottom: bottom }}
      ListHeaderComponent={
        <KidsPanel className="mx-3 mb-5 items-center">
          <KidsText size={28} bold center>
            سورة {surah.name}
          </KidsText>
          <KidsText size={17} tone="muted" center className="mt-2">
            حفظت {toArabicDigits(memorized.size)} من {toArabicDigits(ayahs.length)} آيات — اضغط على الآية التي حفظتها
          </KidsText>
          <View className="mt-5 flex-row flex-wrap justify-center gap-3">
            <KidsButton tone="emerald" size="sm" icon={BookOpen} onPress={() => go(`/kids/learn/${surah.id}`)}>
              تعلّم السورة
            </KidsButton>
            {isDue && (
              <KidsButton
                tone="sky"
                size="sm"
                icon={RefreshCw}
                onPress={() => {
                  kidsProgress.markSurahReviewed(surah.id);
                  sfx.correct();
                }}
              >
                راجعتها اليوم
              </KidsButton>
            )}
          </View>
        </KidsPanel>
      }
      renderItem={({ item }) => <AyahRow surahId={surah.id} ayah={item} done={memorized.has(item.numberInSurah)} />}
    />
  );
}
