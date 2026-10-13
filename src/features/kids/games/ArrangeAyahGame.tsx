import { Lightbulb, RotateCcw, Shuffle } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition, ZoomIn } from "react-native-reanimated";

import { buildWordTiles, isPlayableAyah, wrongPositions, type WordTile } from "@/core/kids/games/arrangeGameLogic";
import type { Ayah } from "@/core/quran/textApi";
import { toArabicDigits } from "@/core/text/arabic";

import { kidsAyahs, kidsSurah } from "../kidsData";
import { useKidsProgress } from "../progress/progressStore";
import { sfx } from "../sfx";
import { Celebration } from "../ui/Celebration";
import { KidsButton } from "../ui/KidsButton";
import { KidsPanel, KidsText, QuranText } from "../ui/KidsPanel";
import { KidsScroll } from "../ui/KidsScroll";
import { KIDS } from "../ui/kidsStyles";
import { useShake } from "../ui/motion";
import { go } from "../ui/nav";
import { BarAction, GameBar, GameIntro } from "./GameChrome";

function PlacedTile({ tile, wrong, checked, onPress }: { tile: WordTile; wrong: boolean; checked: boolean; onPress: () => void }) {
  const motion = useShake(checked, wrong ? "shake" : null);
  return (
    <Animated.View entering={ZoomIn.duration(180)} layout={LinearTransition} style={motion}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={{
          borderRadius: 16,
          paddingHorizontal: 14,
          paddingVertical: 2,
          borderWidth: 2,
          borderBottomWidth: 5,
          backgroundColor: wrong ? KIDS.wrongBg : checked ? KIDS.rightBg : KIDS.white,
          borderColor: wrong ? KIDS.rose : checked ? KIDS.emerald : KIDS.whiteRing,
          borderBottomColor: KIDS.whiteShadow,
        }}
      >
        <QuranText size={26}>{tile.text}</QuranText>
      </Pressable>
    </Animated.View>
  );
}

export function ArrangeAyahGame({ surahId }: { surahId: number }) {
  const surah = kidsSurah(surahId);
  const ayahs = kidsAyahs(surahId);
  const { recordGame } = useKidsProgress();
  const playable = ayahs.filter((ayah) => isPlayableAyah(ayah.text));
  const [ayah, setAyah] = useState<Ayah | null>(null);
  const [bank, setBank] = useState<WordTile[]>([]);
  const [placed, setPlaced] = useState<WordTile[]>([]);
  const [checked, setChecked] = useState(false);
  const [won, setWon] = useState(false);
  const [tries, setTries] = useState(0);
  const [hint, setHint] = useState(false);

  function startAyah(next: Ayah) {
    setAyah(next);
    setBank(buildWordTiles(next.text));
    setPlaced([]);
    setChecked(false);
    setWon(false);
    setTries(0);
    setHint(false);
    sfx.tap();
  }

  function randomAyah() {
    const choices = playable.filter((entry) => entry.number !== ayah?.number);
    const next = choices[Math.floor(Math.random() * choices.length)] ?? playable[0];
    if (next) startAyah(next);
  }

  function check(order: WordTile[]) {
    setChecked(true);
    setTries((value) => value + 1);
    if (wrongPositions(order).size === 0) {
      const attempt = tries + 1;
      recordGame({ game: "arrange", surah: surah.id, score: 1, total: attempt, stars: attempt === 1 ? 3 : attempt === 2 ? 2 : 1 });
      sfx.win();
      setTimeout(() => setWon(true), 350);
    } else sfx.wrong();
  }

  function place(tile: WordTile) {
    sfx.tap();
    setChecked(false);
    setBank((current) => current.filter((entry) => entry.id !== tile.id));
    const nextPlaced = [...placed, tile];
    setPlaced(nextPlaced);
    if (nextPlaced.length === (ayah ? bank.length + placed.length : 0)) check(nextPlaced);
  }

  function unplace(tile: WordTile) {
    sfx.flip();
    setChecked(false);
    setPlaced((current) => current.filter((entry) => entry.id !== tile.id));
    setBank((current) => [...current, tile]);
  }

  if (!ayah) {
    return (
      <KidsScroll>
        <GameIntro icon={Shuffle} tone="emerald" title={`رتّب الآية — سورة ${surah.name}`} description="الكلمات مبعثرة! اضغط عليها بالترتيب الصحيح لتكوّن الآية كما في المصحف.">
          {playable.length > 0 ? (
            <KidsButton tone="emerald" onPress={randomAyah}>
              ابدأ اللعب
            </KidsButton>
          ) : (
            <KidsText tone="muted" center>
              آيات هذه السورة غير مناسبة لهذه اللعبة، جرّب سورة أخرى.
            </KidsText>
          )}
          <Pressable accessibilityRole="link" onPress={() => go("/kids/games/arrange")}>
            <KidsText size={14} bold tone="muted" style={{ textDecorationLine: "underline" }}>
              اختر سورة أخرى
            </KidsText>
          </Pressable>
        </GameIntro>
      </KidsScroll>
    );
  }

  const wrong = checked ? wrongPositions(placed) : new Set<string>();
  const solved = checked && wrong.size === 0;

  return (
    <KidsScroll gap={16}>
      <GameBar title={`سورة ${surah.name} — الآية ${toArabicDigits(ayah.numberInSurah)}`}>
        <BarAction icon={Lightbulb} label={hint ? "إخفاء المساعدة" : "مساعدة"} color={KIDS.honey} onPress={() => setHint((value) => !value)} />
        <BarAction icon={RotateCcw} label="من جديد" onPress={() => startAyah(ayah)} />
      </GameBar>

      <KidsPanel>
        {hint && (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={{ opacity: 0.55 }}>
            <QuranText size={22} color={KIDS.muted}>
              {ayah.text}
            </QuranText>
          </Animated.View>
        )}
        <KidsText size={14} bold tone="muted" center>
          الآية بالترتيب:
        </KidsText>
        <View
          style={{
            marginTop: 10,
            minHeight: 96,
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            borderRadius: 30,
            borderWidth: 4,
            borderStyle: "dashed",
            padding: 12,
            borderColor: solved ? KIDS.emerald : checked ? "rgba(232,74,103,0.6)" : KIDS.dashed,
            backgroundColor: solved ? KIDS.doneBg : checked ? KIDS.wrongSoft : KIDS.ivory,
          }}
        >
          {placed.length === 0 && <KidsText tone="muted">اضغط على الكلمات بالأسفل…</KidsText>}
          {placed.map((tile) => (
            <PlacedTile key={tile.id} tile={tile} wrong={wrong.has(tile.id)} checked={checked} onPress={() => unplace(tile)} />
          ))}
        </View>

        <KidsText size={14} bold tone="muted" center className="mt-7">
          الكلمات:
        </KidsText>
        <View style={{ marginTop: 10, minHeight: 80, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 10 }}>
          {bank.map((tile) => (
            <Animated.View key={tile.id} entering={ZoomIn.duration(180)} layout={LinearTransition}>
              <Pressable
                accessibilityRole="button"
                onPress={() => place(tile)}
                style={({ pressed }) => ({
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 2,
                  borderWidth: 2,
                  borderBottomWidth: pressed ? 2 : 6,
                  backgroundColor: KIDS.tile,
                  borderColor: KIDS.tileRing,
                  borderBottomColor: KIDS.tileShadow,
                  transform: [{ scale: pressed ? 0.92 : 1 }],
                })}
              >
                <QuranText size={26} color={KIDS.wordInk}>
                  {tile.text}
                </QuranText>
              </Pressable>
            </Animated.View>
          ))}
        </View>
        {checked && wrong.size > 0 && (
          <KidsText size={16} bold center className="mt-5" style={{ color: KIDS.roseShadow }}>
            قريب! الكلمات الحمراء في غير مكانها، اضغط عليها لإرجاعها.
          </KidsText>
        )}
      </KidsPanel>

      <Celebration
        open={won}
        title="ممتاز! رتّبت الآية"
        message={tries === 1 ? "من أول محاولة!" : `في ${toArabicDigits(tries)} محاولات`}
        stars={tries === 1 ? 3 : tries === 2 ? 2 : 1}
        onClose={() => setWon(false)}
      >
        <KidsButton tone="emerald" onPress={randomAyah}>
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
