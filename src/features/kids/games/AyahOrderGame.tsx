import { ListOrdered, RotateCcw } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeOut, LinearTransition, ZoomIn } from "react-native-reanimated";

import { buildAyahOrderRound, expectedNext, type AyahOrderRound } from "@/core/kids/games/ayahOrderLogic";
import { starsForSlips } from "@/core/kids/games/gameUtils";
import type { Ayah } from "@/core/quran/textApi";
import { toArabicDigits } from "@/core/text/arabic";

import { useCompanion } from "../companion/companionStore";
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

function PileCard({ ayah, shaking, onPress }: { ayah: Ayah; shaking: boolean; onPress: () => void }) {
  const motion = useShake(shaking, shaking ? "shake" : null);
  return (
    <Animated.View layout={LinearTransition} exiting={FadeOut} style={motion}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => ({
          borderRadius: 20,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderWidth: 2,
          backgroundColor: shaking ? KIDS.shakeBg : KIDS.tile,
          borderColor: shaking ? KIDS.shakeRing : KIDS.tileRing,
          borderBottomWidth: pressed ? 2 : 6,
          borderBottomColor: shaking ? KIDS.shakeRing : KIDS.tileShadow,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        })}
      >
        <QuranText size={24} color={KIDS.wordInk}>
          {ayah.text}
        </QuranText>
      </Pressable>
    </Animated.View>
  );
}

/**
 * The child taps the ayahs in Mushaf order. A wrong tap only wiggles the card and stays in the pile, so the
 * puzzle always ends in success.
 */
export function AyahOrderGame({ surahId }: { surahId: number }) {
  const surah = kidsSurah(surahId);
  const ayahs = kidsAyahs(surahId);
  const { recordGame } = useKidsProgress();
  const { react } = useCompanion();
  const [round, setRound] = useState<AyahOrderRound | null>(null);
  const [placed, setPlaced] = useState<Ayah[]>([]);
  const [shake, setShake] = useState<number | null>(null);
  const [slips, setSlips] = useState(0);
  const [won, setWon] = useState(false);

  function start() {
    const next = buildAyahOrderRound(ayahs);
    if (!next) return;
    sfx.tap();
    setRound(next);
    setPlaced([]);
    setSlips(0);
    setWon(false);
  }

  function tap(ayah: Ayah) {
    if (!round) return;
    const expected = expectedNext(round, placed.length);
    if (expected?.number !== ayah.number) {
      sfx.flip();
      react("almost");
      setSlips((value) => value + 1);
      setShake(ayah.number);
      setTimeout(() => setShake(null), 450);
      return;
    }
    sfx.correct();
    const next = [...placed, ayah];
    setPlaced(next);
    if (next.length === round.ordered.length) {
      recordGame({ game: "ayah_order", surah: surah.id, score: next.length, total: next.length + slips, stars: starsForSlips(slips, next.length) });
      sfx.win();
      setTimeout(() => setWon(true), 400);
    } else react("correct");
  }

  if (!round) {
    return (
      <KidsScroll>
        <GameIntro icon={ListOrdered} tone="gold" title={`رتّب الآيات: سورة ${surah.name}`} description="الآيات اختلط ترتيبها! اضغط على الآيات واحدة واحدة بترتيبها في المصحف.">
          {ayahs.length >= 2 ? (
            <KidsButton tone="gold" onPress={start}>
              ابدأ اللعب
            </KidsButton>
          ) : (
            <KidsText tone="muted" center>
              هذه السورة قصيرة جدًا لهذه اللعبة.
            </KidsText>
          )}
        </GameIntro>
      </KidsScroll>
    );
  }

  const pile = round.shuffled.filter((ayah) => !placed.some((entry) => entry.number === ayah.number));
  const firstNumber = round.ordered[0]!.numberInSurah;
  const lastNumber = round.ordered.at(-1)!.numberInSurah;

  return (
    <KidsScroll gap={16}>
      <GameBar
        title={`سورة ${surah.name}${round.ordered.length < ayahs.length ? ` · الآيات ${toArabicDigits(firstNumber)}–${toArabicDigits(lastNumber)}` : ""}`}
      >
        <BarAction icon={RotateCcw} label="من جديد" onPress={start} />
      </GameBar>

      <KidsPanel>
        <KidsText size={14} bold tone="muted" center>
          بالترتيب:
        </KidsText>
        <View style={{ marginTop: 10, minHeight: 80, gap: 8, borderRadius: 30, borderWidth: 4, borderStyle: "dashed", borderColor: KIDS.dashed, backgroundColor: KIDS.ivory, padding: 10 }}>
          {placed.length === 0 && (
            <KidsText tone="muted" center className="p-3">
              أيّ آية تأتي أولًا؟
            </KidsText>
          )}
          {placed.map((ayah) => (
            <Animated.View
              key={ayah.number}
              entering={ZoomIn}
              style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 18, backgroundColor: KIDS.rightBg, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderColor: KIDS.emerald }}
            >
              <View style={{ marginTop: 6, width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: KIDS.emerald }}>
                <Text className="font-kids-bold" style={{ color: KIDS.white, fontSize: 15 }}>
                  {toArabicDigits(ayah.numberInSurah)}
                </Text>
              </View>
              <QuranText size={22} center={false} style={{ flex: 1 }}>
                {ayah.text}
              </QuranText>
            </Animated.View>
          ))}
        </View>

        <KidsText size={14} bold tone="muted" center className="mt-6">
          الآيات المختلطة:
        </KidsText>
        <View style={{ marginTop: 10, gap: 12 }}>
          {pile.map((ayah) => (
            <PileCard key={ayah.number} ayah={ayah} shaking={shake === ayah.number} onPress={() => tap(ayah)} />
          ))}
        </View>
      </KidsPanel>

      <Celebration open={won} title="ممتاز! رتّبت الآيات" message={`سورة ${surah.name} بترتيبها الصحيح`} stars={starsForSlips(slips, round.ordered.length)} onClose={() => setWon(false)}>
        <KidsButton tone="gold" onPress={start}>
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
