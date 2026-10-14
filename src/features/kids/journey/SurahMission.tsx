import { ArrowRight, Check, Lock, Pause, Play, Star } from "lucide-react-native";
import { useEffect, useMemo, type ReactNode } from "react";
import { View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";

import { missionProgress, regionOf, stationStars } from "@/core/kids/journey";
import { KIDS_SURAH_IDS } from "@/core/kids/kidsSurahs";
import { isSurahUnlocked, nextSurahId } from "@/core/kids/levels";
import { getSurahAyahCount } from "@/core/quran/surahAyahCounts";
import { toArabicDigits } from "@/core/text/arabic";

import { companion as companionStore } from "../companion/companionStore";
import { kidsAudio, useKidsAudio } from "../kidsAudio";
import { getTeachingTrack, kidsSurah } from "../kidsData";
import { useKidsProgress } from "../progress/progressStore";
import { sfx } from "../sfx";
import { useLoad } from "../useLoad";
import { KidsArt } from "../ui/KidsArt";
import { KidsButton } from "../ui/KidsButton";
import { KidsEnter } from "../ui/KidsMotion";
import { KidsPanel, KidsText } from "../ui/KidsPanel";
import { KidsScroll } from "../ui/KidsScroll";
import { KIDS, PANEL_SHADOW } from "../ui/kidsStyles";
import { go } from "../ui/nav";

interface StepCardProps {
  done: boolean;
  emoji: string;
  title: string;
  hint: string;
  /** A small picture after the hint (the lock that the quiz opens). */
  hintArt?: string;
  color: string;
  shadow: string;
  index: number;
  children: ReactNode;
}

function StepCard({ done, emoji, title, hint, hintArt, color, shadow, index, children }: StepCardProps) {
  return (
    <KidsEnter
      index={index + 1}
      style={[
        {
          gap: 14,
          borderRadius: 32,
          padding: 18,
          borderWidth: 4,
          backgroundColor: done ? KIDS.mintDeep : "rgba(255,255,255,0.95)",
          borderColor: done ? KIDS.mintRing : "rgba(255,255,255,0.6)",
          alignItems: "center",
        },
        PANEL_SHADOW,
      ]}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 24,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: color,
          borderBottomWidth: 6,
          borderBottomColor: shadow,
        }}
      >
        <KidsArt emoji={emoji} size={42} />
        {done && (
          <View
            style={{
              position: "absolute",
              top: -8,
              end: -8,
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: KIDS.emerald,
              borderWidth: 4,
              borderColor: KIDS.white,
            }}
          >
            <Check size={18} color={KIDS.white} />
          </View>
        )}
      </View>
      <View style={{ alignItems: "center" }}>
        <KidsText size={22} bold center>
          {title}
          {done ? " ✓" : ""}
        </KidsText>
        <View className="flex-row items-center justify-center gap-1.5">
          <KidsText size={16} tone="muted" center style={{ flexShrink: 1 }}>
            {hint}
          </KidsText>
          {hintArt ? <KidsArt emoji={hintArt} size={22} /> : null}
        </View>
      </View>
      <View className="flex-row flex-wrap justify-center gap-2">{children}</View>
    </KidsEnter>
  );
}

export function SurahMission({ surahId }: { surahId: number }) {
  const surah = kidsSurah(surahId);
  const { state, status, recordListenCompletion } = useKidsProgress();
  const player = useKidsAudio();
  const teachingState = useLoad(`teach-${surahId}`, () => getTeachingTrack(surahId), null);
  const teaching = teachingState.status === "ready" ? teachingState.data : null;

  // Like the website: leaving the station stops its recitation.
  useEffect(
    () => () => {
      if (kidsAudio.getState().id?.startsWith("kids-")) kidsAudio.stop();
    },
    [],
  );

  const region = regionOf(surah.id);
  const station = KIDS_SURAH_IDS.indexOf(surah.id) + 1;
  const progress = missionProgress(state, surah.id);
  const stars = stationStars(state, surah.id);
  const ayahCount = getSurahAyahCount(surah.id);
  const memorizedCount = state.memorizedAyahsBySurah[surah.id]?.length ?? 0;
  const next = nextSurahId(surah.id);
  const unlocked = isSurahUnlocked(state, surah.id);
  const shortSurah = ayahCount <= 8;
  const starRow = useMemo(() => Array.from({ length: 5 }, (_, index) => index), []);

  const listenId = `kids-mission-${surah.id}`;
  const listening = player.id === listenId && player.playing;

  function listen() {
    if (!teaching) return;
    if (kidsAudio.isCurrent(listenId)) {
      kidsAudio.toggle();
      return;
    }
    sfx.tap();
    kidsAudio.play(listenId, teaching.src, {
      onEnded: () => {
        recordListenCompletion(surah.id);
        sfx.win();
        companionStore.react("correct");
      },
    });
  }

  if (status === "ready" && !unlocked) {
    return (
      <KidsScroll>
        <KidsEnter>
          <KidsPanel className="items-center">
            <Lock size={56} color={KIDS.lockedShadow} />
            <KidsText size={28} bold center className="mt-3">
              سورة {surah.name} مغلقة الآن
            </KidsText>
            <View className="mt-2 flex-row items-center justify-center gap-2">
              <KidsText size={17} tone="muted" center style={{ flexShrink: 1 }}>
                اجتز اختبار المحطة التي قبلها، وستُفتح لك هذه السورة
              </KidsText>
              <KidsArt emoji="🔓" size={28} />
            </View>
            <KidsButton tone="emerald" icon={ArrowRight} className="mt-6" onPress={() => go("/kids")}>
              العودة للخريطة
            </KidsButton>
          </KidsPanel>
        </KidsEnter>
      </KidsScroll>
    );
  }

  return (
    <KidsScroll gap={16}>
      <KidsEnter
        style={[
          {
            borderRadius: 36,
            padding: 22,
            paddingBottom: 28,
            borderWidth: 4,
            borderColor: "rgba(255,255,255,0.7)",
            backgroundColor: `${region.tint}f5`,
            overflow: "hidden",
            alignItems: "center",
          },
          PANEL_SHADOW,
        ]}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.8)",
            paddingHorizontal: 14,
            paddingVertical: 2,
          }}
        >
          <KidsArt emoji={region.emoji} size={22} />
          <KidsText size={15} bold style={{ color: region.shadow }}>
            {region.name} · المحطة {toArabicDigits(station)}
          </KidsText>
        </View>
        <KidsText size={36} bold center className="mt-3">
          سورة {surah.name}
        </KidsText>
        <KidsText size={17} tone="muted" center className="mt-1">
          {toArabicDigits(ayahCount)} آيات · أكمل المهام واجمع النجوم الخمس!
        </KidsText>
        <View accessibilityLabel={`${stars} من ٥ نجوم`} className="mt-4 flex-row gap-1.5">
          {starRow.map((index) => (
            <Animated.View key={index} entering={ZoomIn.delay(300 + index * 80).springify()}>
              <Star
                size={38}
                color={index < stars ? KIDS.starStroke : KIDS.whiteShadow}
                fill={index < stars ? KIDS.starFill : KIDS.white}
              />
            </Animated.View>
          ))}
        </View>
      </KidsEnter>

      <StepCard
        index={0}
        done={progress.listen}
        emoji="🎧"
        title="اسمع السورة"
        hint="استمع للشيخ والأطفال وردّد معهم حتى النهاية"
        color={KIDS.sky}
        shadow={KIDS.skyShadow}
      >
        {teaching ? (
          <KidsButton tone="sky" icon={listening ? Pause : Play} iconFilled onPress={listen}>
            {listening ? "إيقاف" : player.id === listenId && player.loading ? "لحظة…" : "استمع"}
          </KidsButton>
        ) : (
          <KidsText tone="muted">{teachingState.status === "loading" ? "لحظة…" : "التسجيل غير متاح الآن"}</KidsText>
        )}
      </StepCard>

      <StepCard
        index={1}
        done={progress.learn}
        emoji="📖"
        title="احفظ آياتها"
        hint={`حفظت ${toArabicDigits(memorizedCount)} من ${toArabicDigits(ayahCount)} آيات`}
        color={KIDS.emerald}
        shadow={KIDS.emeraldShadow}
      >
        <KidsButton tone="emerald" onPress={() => go(`/kids/learn/${surah.id}`)}>
          ابدأ الحفظ
        </KidsButton>
      </StepCard>

      <StepCard
        index={2}
        done={progress.play}
        emoji="🎮"
        title="العب بالسورة"
        hint="أي لعبة على هذه السورة تكمل المهمة"
        color={KIDS.gold}
        shadow={KIDS.goldShadow}
      >
        {shortSurah && (
          <KidsButton tone="gold" onPress={() => go(`/kids/games/ayah-order/${surah.id}`)}>
            رتّب الآيات
          </KidsButton>
        )}
        <KidsButton tone={shortSurah ? "white" : "gold"} onPress={() => go(`/kids/games/listen-pick/${surah.id}`)}>
          اسمع واختر
        </KidsButton>
        <KidsButton tone="white" onPress={() => go(`/kids/games/arrange/${surah.id}`)}>
          رتّب الكلمات
        </KidsButton>
      </StepCard>

      <StepCard
        index={3}
        done={progress.recite}
        emoji="🎤"
        title="سمّعني"
        hint="اقرأ بصوتك ورفيقك يسمعك"
        color={KIDS.rose}
        shadow={KIDS.roseShadow}
      >
        <KidsButton tone="rose" onPress={() => go(`/kids/recite/${surah.id}`)}>
          سمّع الآن
        </KidsButton>
      </StepCard>

      <StepCard
        index={4}
        done={progress.quiz}
        emoji="🧠"
        title="اختبار المحطة"
        hint={progress.quiz ? "اجتزت الاختبار وفتحت المحطة التالية!" : "اجتز الاختبار لتفتح المحطة التالية"}
        hintArt={progress.quiz ? undefined : "🔓"}
        color={KIDS.violet}
        shadow={KIDS.violetShadow}
      >
        <KidsButton tone="violet" onPress={() => go(`/kids/quiz/${surah.id}`)}>
          {progress.quiz ? "أعد الاختبار" : "ابدأ الاختبار"}
        </KidsButton>
      </StepCard>

      {player.error && player.id === listenId ? (
        <KidsText size={14} bold center style={{ color: KIDS.roseShadow }}>
          {player.error}
        </KidsText>
      ) : null}

      <View className="flex-row flex-wrap justify-center gap-3">
        <KidsButton tone="white" icon={ArrowRight} onPress={() => go("/kids")}>
          الخريطة
        </KidsButton>
        {progress.quiz && next !== null && (
          <KidsButton tone="emerald" art="🚀" onPress={() => go(`/kids/journey/${next}`)}>
            المحطة التالية
          </KidsButton>
        )}
      </View>
    </KidsScroll>
  );
}
