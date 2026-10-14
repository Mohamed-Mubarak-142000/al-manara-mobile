import { FlashList } from "@shopify/flash-list";
import { Check, Lock, Star } from "lucide-react-native";
import { memo } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import type { Surah } from "@/core/quran/api";
import { getSurahAyahCount } from "@/core/quran/surahAyahCounts";
import { levelStatus, type LevelStatus } from "@/core/kids/levels";
import { toArabicDigits } from "@/core/text/arabic";

import { getKidsSurahs } from "../kidsData";
import { useKidsProgress } from "../progress/progressStore";
import { KidsArt } from "./KidsArt";
import { KidsTitlePanel, KidsText } from "./KidsPanel";
import { useKidsBottomPad } from "./KidsShell";
import { KIDS, PANEL_SHADOW } from "./kidsStyles";
import { go } from "./nav";

interface KidsSurahPickerProps {
  hrefBase: string;
  title: string;
  subtitle: string;
  showProgress?: boolean;
  /** Surahs are levels: a surah stays locked until the quiz of the one before it is passed. */
  levels?: boolean;
  /** The 3D picture over the title (an emoji with a KidsArt picture). */
  art?: string;
}

const RING = 97.4;

const SurahCard = memo(function SurahCard({
  surah,
  hrefBase,
  memorized,
  level,
  locked,
  showProgress,
}: {
  surah: Surah;
  hrefBase: string;
  memorized: number;
  level: LevelStatus | null;
  locked: boolean;
  showProgress: boolean;
}) {
  const total = getSurahAyahCount(surah.id);
  const percent = total ? memorized / total : 0;
  const done = percent >= 1;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: locked }}
      disabled={locked}
      onPress={() => go(`${hrefBase}/${surah.id}`)}
      style={({ pressed }) => [
        {
          margin: 6,
          alignItems: "center",
          borderRadius: 32,
          padding: 14,
          borderWidth: 4,
          backgroundColor: locked ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.95)",
          borderColor: locked ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.6)",
          opacity: locked ? 0.75 : 1,
          transform: [{ translateY: pressed ? -3 : 0 }],
        },
        PANEL_SHADOW,
      ]}
    >
      <View style={{ width: 64, height: 64, alignItems: "center", justifyContent: "center" }}>
        <Svg width={64} height={64} viewBox="0 0 36 36" style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
          <Circle
            cx="18"
            cy="18"
            r="15.5"
            fill={locked ? KIDS.soft : done ? KIDS.emerald : KIDS.ringFill}
            stroke={KIDS.ringTrack}
            strokeWidth="3"
          />
          {showProgress && !locked && (
            <Circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke={KIDS.gold}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={RING}
              strokeDashoffset={RING * (1 - percent)}
            />
          )}
        </Svg>
        {locked ? (
          <Lock size={24} color={KIDS.muted} />
        ) : done ? (
          <Check size={28} color={KIDS.white} />
        ) : (
          <Text className="font-kids-bold" style={{ fontSize: 20, color: KIDS.deep }}>
            {toArabicDigits(surah.id)}
          </Text>
        )}
        {level === "passed" && (
          <View style={{ position: "absolute", top: -4, end: -4 }} accessibilityLabel="نجحت في اختبارها">
            <Star size={24} color={KIDS.starStroke} fill={KIDS.starFill} />
          </View>
        )}
      </View>
      <KidsText size={20} bold center className="mt-2">
        {surah.name}
      </KidsText>
      <KidsText size={14} bold tone="muted" center>
        {locked
          ? "انجح في اختبار السورة السابقة لتفتحها"
          : `${toArabicDigits(total)} آيات${showProgress && memorized > 0 ? ` · حفظت ${toArabicDigits(memorized)}` : ""}`}
      </KidsText>
    </Pressable>
  );
});

/** The website's KidsSurahPicker: the kids surahs as big cards, with progress rings and level locks. */
export function KidsSurahPicker({ hrefBase, title, subtitle, showProgress = true, levels = false, art }: KidsSurahPickerProps) {
  const { state, status } = useKidsProgress();
  const bottom = useKidsBottomPad();
  const surahs = getKidsSurahs();
  return (
    <FlashList
      data={surahs}
      numColumns={2}
      keyExtractor={(surah) => String(surah.id)}
      extraData={state}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 10, paddingBottom: bottom }}
      ListHeaderComponent={
        <KidsTitlePanel
          title={title}
          subtitle={subtitle}
          icon={art ? <KidsArt emoji={art} size={64} /> : undefined}
          className="mx-1.5 mb-4"
        />
      }
      renderItem={({ item }) => {
        const level = levels ? levelStatus(state, item.id) : null;
        return (
          <SurahCard
            surah={item}
            hrefBase={hrefBase}
            memorized={state.memorizedAyahsBySurah[item.id]?.length ?? 0}
            level={level}
            locked={level === "locked" || (levels && status === "loading")}
            showProgress={showProgress}
          />
        );
      }}
    />
  );
}
