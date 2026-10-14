import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import {
  buildTajweedMatchRound,
  checkTajweedMatch,
  type TajweedMatchRound,
  type TajweedMatchTarget,
} from "@/core/kids/games/matchGameLogic";
import { TAJWEED_RULES, type TajweedAyah } from "@/core/quran/tajweedApi";
import { toArabicDigits } from "@/core/text/arabic";

import { kidsSurah, kidsTajweedAyahs } from "../kidsData";
import { useKidsProgress } from "../progress/progressStore";
import { sfx } from "../sfx";
import { useLoad } from "../useLoad";
import { Celebration } from "../ui/Celebration";
import { KidsButton } from "../ui/KidsButton";
import { KidsPanel, KidsText } from "../ui/KidsPanel";
import { KidsScroll } from "../ui/KidsScroll";
import { KIDS } from "../ui/kidsStyles";
import { useShake } from "../ui/motion";
import { go } from "../ui/nav";
import { GameBar, GameIntro, GameLink } from "./GameChrome";

// Beginner-friendly rules only; silent letters and advanced idgham types are left out.
const KIDS_RULES = [
  "ghunnah",
  "idgham_ghunnah",
  "idgham_wo_ghunnah",
  "idgham_shafawi",
  "ikhafa",
  "ikhafa_shafawi",
  "iqlab",
  "qalaqah",
  "madda_normal",
  "madda_permissible",
  "madda_obligatory",
  "madda_necessary",
];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function kidsRound(ayah: TajweedAyah): TajweedMatchRound | null {
  const round = buildTajweedMatchRound(ayah);
  if (!round) return null;
  const targets = round.targets.filter((target) => KIDS_RULES.includes(target.ruleClass));
  if (targets.length < 2) return null;
  const allowed = new Set(targets.map((target) => target.id));
  return {
    ...round,
    targets,
    displaySegments: round.displaySegments.map((segment) =>
      segment.targetId && !allowed.has(segment.targetId) ? { ...segment, targetId: null } : segment,
    ),
  };
}

function RuleChoice({ rule, wrong, onPress }: { rule: string; wrong: boolean; onPress: () => void }) {
  const motion = useShake(wrong, wrong ? "shake" : null);
  return (
    <Animated.View style={[{ width: "48%" }, motion]}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          borderRadius: 999,
          paddingVertical: 10,
          paddingHorizontal: 8,
          backgroundColor: KIDS.white,
          borderWidth: 2,
          borderColor: KIDS.whiteRing,
          borderBottomWidth: pressed ? 2 : 6,
          borderBottomColor: KIDS.whiteShadow,
          opacity: wrong ? 0.5 : 1,
        })}
      >
        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: TAJWEED_RULES[rule]?.color }} />
        <KidsText size={15} bold>
          {TAJWEED_RULES[rule]?.label ?? rule}
        </KidsText>
      </Pressable>
    </Animated.View>
  );
}

export function TajweedColorGame({ surahId }: { surahId: number }) {
  const surah = kidsSurah(surahId);
  const loaded = useLoad(`tajweed-${surahId}`, () => kidsTajweedAyahs(surahId), [] as TajweedAyah[]);
  const ayahs = loaded.status === "ready" ? loaded.data : [];
  const { recordGame } = useKidsProgress();
  const rounds = ayahs.map(kidsRound).filter((round): round is TajweedMatchRound => round !== null);
  const [round, setRound] = useState<TajweedMatchRound | null>(null);
  const [selected, setSelected] = useState<TajweedMatchTarget | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [solved, setSolved] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string | null>(null);
  const [won, setWon] = useState(false);
  const [mistakes, setMistakes] = useState(0);

  function newRound() {
    const next = rounds[Math.floor(Math.random() * rounds.length)] ?? null;
    setRound(next);
    setSelected(null);
    setSolved(new Set());
    setWon(false);
    setMistakes(0);
    sfx.tap();
  }

  function pick(target: TajweedMatchTarget) {
    if (solved.has(target.id)) return;
    sfx.tap();
    setSelected(target);
    setWrong(null);
    const distractors = shuffle(KIDS_RULES.filter((rule) => TAJWEED_RULES[rule]?.label !== TAJWEED_RULES[target.ruleClass]?.label)).slice(
      0,
      3,
    );
    setChoices(shuffle([target.ruleClass, ...distractors]));
  }

  function choose(rule: string) {
    if (!selected || !round) return;
    if (!checkTajweedMatch(selected, rule)) {
      sfx.wrong();
      setWrong(rule);
      setMistakes((value) => value + 1);
      return;
    }
    sfx.correct();
    const next = new Set(solved).add(selected.id);
    setSolved(next);
    setSelected(null);
    if (next.size === round.targets.length) {
      setTimeout(() => {
        sfx.win();
        setWon(true);
        recordGame({
          game: "tajweed",
          surah: surah.id,
          score: round.targets.length,
          total: round.targets.length + mistakes,
          stars: mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1,
        });
      }, 400);
    }
  }

  if (!round) {
    return (
      <KidsScroll>
        <GameIntro
          art="🎨"
          tone="rose"
          title={`لوّن التجويد — سورة ${surah.name}`}
          description="في الآية كلمات مميّزة بخط منقّط. اضغط على كل واحدة، ثم اختر حكم التجويد الصحيح لتتلوّن!"
        >
          {loaded.status === "loading" ? (
            <ActivityIndicator color={KIDS.rose} />
          ) : rounds.length > 0 ? (
            <KidsButton tone="rose" onPress={newRound}>
              ابدأ اللعب
            </KidsButton>
          ) : (
            <KidsText tone="muted" center>
              لا تتوفر أحكام كافية في هذه السورة، جرّب سورة أخرى.
            </KidsText>
          )}
          <GameLink label="اختر سورة أخرى" onPress={() => go("/kids/games/tajweed")} />
        </GameIntro>
      </KidsScroll>
    );
  }

  return (
    <KidsScroll gap={16}>
      <GameBar title={`سورة ${surah.name} — الآية ${toArabicDigits(round.ayahNumberInSurah)}`}>
        <KidsText size={14} bold tone="muted">
          لوّنت {toArabicDigits(solved.size)} من {toArabicDigits(round.targets.length)}
        </KidsText>
      </GameBar>

      <KidsPanel className="items-center">
        <Text
          className="font-quran"
          style={{ fontSize: 34, lineHeight: 76, color: KIDS.ink, textAlign: "center", writingDirection: "rtl" }}
        >
          {round.displaySegments.map((segment, index) => {
            if (!segment.targetId) return <Text key={index}>{segment.text}</Text>;
            const target = round.targets.find((entry) => entry.id === segment.targetId)!;
            const isSolved = solved.has(target.id);
            const isSelected = selected?.id === target.id;
            return (
              <Text
                key={index}
                accessibilityRole="button"
                accessibilityLabel={isSolved ? TAJWEED_RULES[target.ruleClass]?.label : "كلمة فيها حكم تجويد"}
                onPress={() => pick(target)}
                suppressHighlighting
                style={
                  isSolved
                    ? { color: TAJWEED_RULES[target.ruleClass]?.color }
                    : {
                        textDecorationLine: "underline",
                        textDecorationStyle: "dotted",
                        textDecorationColor: KIDS.gold,
                        backgroundColor: isSelected ? KIDS.cream : "rgba(245,185,46,0.12)",
                      }
                }
              >
                {segment.text}
              </Text>
            );
          })}
        </Text>

        {selected ? (
          <Animated.View key={selected.id} entering={FadeInDown} style={{ marginTop: 24, alignSelf: "stretch" }}>
            <KidsText size={18} bold center>
              ما حكم الجزء المختار؟
            </KidsText>
            <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 }}>
              {choices.map((rule) => (
                <RuleChoice key={rule} rule={rule} wrong={wrong === rule} onPress={() => choose(rule)} />
              ))}
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn} style={{ marginTop: 24 }}>
            <KidsText size={17} bold tone="muted" center>
              اضغط على كلمة منقّطة لتبدأ
            </KidsText>
          </Animated.View>
        )}
      </KidsPanel>

      <Celebration
        open={won}
        title="رائع! لوّنت كل الأحكام"
        message={mistakes === 0 ? "بدون أي خطأ!" : `مع ${toArabicDigits(mistakes)} محاولة خاطئة`}
        stars={mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1}
        onClose={() => setWon(false)}
      >
        <KidsButton tone="rose" onPress={newRound}>
          آية أخرى
        </KidsButton>
        <KidsButton
          tone="white"
          onPress={() => {
            setWon(false);
            go("/kids/games");
          }}
        >
          ألعاب أخرى
        </KidsButton>
      </Celebration>
    </KidsScroll>
  );
}
