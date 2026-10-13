import { Ear, Volume2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { ayahPreview, starsForSlips } from "@/core/kids/games/gameUtils";
import { buildListenPickRounds, type ListenPickRound } from "@/core/kids/games/listenPickLogic";
import type { Ayah } from "@/core/quran/textApi";
import { toArabicDigits } from "@/core/text/arabic";

import { useCompanion } from "../companion/companionStore";
import { kidsAudio, useKidsAudio } from "../kidsAudio";
import { husaryAyah, kidsAyahs, kidsSurah } from "../kidsData";
import { useKidsProgress } from "../progress/progressStore";
import { sfx } from "../sfx";
import { Celebration } from "../ui/Celebration";
import { KidsButton } from "../ui/KidsButton";
import { KidsPanel, KidsText, QuranText } from "../ui/KidsPanel";
import { KidsScroll } from "../ui/KidsScroll";
import { KIDS } from "../ui/kidsStyles";
import { useShake } from "../ui/motion";
import { go } from "../ui/nav";
import { GameBar, GameIntro } from "./GameChrome";

function ChoiceCard({ text, wrong, right, disabled, onPress }: { text: string; wrong: boolean; right: boolean; disabled: boolean; onPress: () => void }) {
  const motion = useShake(wrong || right, wrong ? "shake" : right ? "pop" : null);
  return (
    <Animated.View style={motion}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={{
          borderRadius: 24,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderWidth: 4,
          backgroundColor: right ? KIDS.rightBg : wrong ? KIDS.wrongMuted : KIDS.paper,
          borderColor: right ? KIDS.emerald : wrong ? "transparent" : KIDS.paperRing,
          opacity: wrong ? 0.6 : 1,
        }}
      >
        <QuranText size={24} color={wrong ? KIDS.muted : KIDS.ink}>
          {text}
        </QuranText>
      </Pressable>
    </Animated.View>
  );
}

function SpeakerButton({ playing, onPress }: { playing: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = playing ? withRepeat(withSequence(withTiming(1.08, { duration: 500 }), withTiming(1, { duration: 500 })), -1) : withTiming(1);
  }, [playing, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="اسمع الآية"
        onPress={onPress}
        style={{ width: 112, height: 112, borderRadius: 56, alignItems: "center", justifyContent: "center", backgroundColor: KIDS.sky, borderBottomWidth: 8, borderBottomColor: KIDS.skyShadow }}
      >
        <Volume2 size={56} color={KIDS.white} />
      </Pressable>
    </Animated.View>
  );
}

export function ListenPickGame({ surahId }: { surahId: number }) {
  const surah = kidsSurah(surahId);
  const ayahs = kidsAyahs(surahId);
  const player = useKidsAudio();
  const { recordGame } = useKidsProgress();
  const { react } = useCompanion();
  const [rounds, setRounds] = useState<ListenPickRound[]>([]);
  const [index, setIndex] = useState(0);
  const [wrongPicks, setWrongPicks] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [slips, setSlips] = useState(0);
  const [won, setWon] = useState(false);

  useEffect(
    () => () => {
      if (kidsAudio.getState().id?.startsWith("kids-")) kidsAudio.stop();
    },
    [],
  );

  const round = rounds[index];

  function playAyah(target: Ayah) {
    kidsAudio.play(`kids-pick-${target.number}`, husaryAyah(surah.id, target.numberInSurah));
  }

  function start() {
    const next = buildListenPickRounds(ayahs);
    if (next.length === 0) return;
    sfx.tap();
    setRounds(next);
    setIndex(0);
    setWrongPicks([]);
    setSolved(false);
    setSlips(0);
    setWon(false);
    playAyah(next[0]!.target);
  }

  function pick(choice: Ayah) {
    if (!round || solved) return;
    if (choice.number === round.target.number) {
      sfx.correct();
      react("correct");
      setSolved(true);
      setTimeout(() => {
        const nextIndex = index + 1;
        if (nextIndex >= rounds.length) {
          recordGame({ game: "listen_pick", surah: surah.id, score: rounds.length, total: rounds.length, stars: starsForSlips(slips, rounds.length) });
          sfx.win();
          setWon(true);
          return;
        }
        setIndex(nextIndex);
        setWrongPicks([]);
        setSolved(false);
        playAyah(rounds[nextIndex]!.target);
      }, 900);
    } else {
      sfx.flip();
      react("almost");
      setSlips((value) => value + 1);
      setWrongPicks((current) => [...current, choice.number]);
    }
  }

  if (!round) {
    return (
      <KidsScroll>
        <GameIntro icon={Ear} tone="sky" title={`اسمع واختر: سورة ${surah.name}`} description="اسمع الآية جيدًا، ثم اضغط على الآية التي سمعتها.">
          {ayahs.length >= 3 ? (
            <KidsButton tone="sky" onPress={start}>
              ابدأ اللعب
            </KidsButton>
          ) : (
            <KidsText tone="muted" center>
              هذه السورة قصيرة جدًا لهذه اللعبة، جرّب سورة أخرى.
            </KidsText>
          )}
        </GameIntro>
      </KidsScroll>
    );
  }

  const targetId = `kids-pick-${round.target.number}`;
  const playing = player.id === targetId && player.playing;
  const stars = starsForSlips(slips, rounds.length);

  return (
    <KidsScroll gap={16}>
      <GameBar title={`اسمع واختر: ${surah.name}`}>
        <View className="flex-row gap-1.5" accessibilityLabel={`السؤال ${index + 1} من ${rounds.length}`}>
          {rounds.map((_, dot) => (
            <View key={dot} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: dot < index ? KIDS.emerald : dot === index ? KIDS.gold : KIDS.dashed }} />
          ))}
        </View>
      </GameBar>

      <KidsPanel className="items-center">
        <SpeakerButton playing={playing} onPress={() => (kidsAudio.isCurrent(targetId) ? kidsAudio.toggle() : playAyah(round.target))} />
        <KidsText size={17} bold tone="muted" center className="mt-4">
          {playing ? "استمع جيدًا…" : "اضغط لتسمع الآية مرة أخرى"}
        </KidsText>
        <View style={{ marginTop: 20, gap: 12, alignSelf: "stretch" }}>
          {round.choices.map((choice) => {
            const wrong = wrongPicks.includes(choice.number);
            const right = solved && choice.number === round.target.number;
            return <ChoiceCard key={choice.number} text={ayahPreview(choice.text, 10)} wrong={wrong} right={right} disabled={wrong || solved} onPress={() => pick(choice)} />;
          })}
        </View>
      </KidsPanel>

      <Celebration open={won} title="ما شاء الله! أذنك ذهبية 🎧" message={`عرفت ${toArabicDigits(rounds.length)} آيات من سورة ${surah.name}`} stars={stars} onClose={() => setWon(false)}>
        <KidsButton tone="sky" onPress={start}>
          العب مرة أخرى
        </KidsButton>
        <KidsButton
          tone="white"
          onPress={() => {
            setWon(false);
            go(`/kids/journey/${surah.id}`);
          }}
        >
          العودة للمحطة
        </KidsButton>
      </Celebration>
    </KidsScroll>
  );
}
