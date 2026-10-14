import { RotateCcw } from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import { View } from "react-native";

import { buildSurahMatchCards, isSurahPair, SURAH_MATCH_PAIRS, type SurahMatchCard } from "@/core/kids/games/surahMatchLogic";
import { toArabicDigits } from "@/core/text/arabic";

import { useCompanion } from "../companion/companionStore";
import { getKidsFirstAyahs, getKidsSurahs } from "../kidsData";
import { useKidsProgress } from "../progress/progressStore";
import { sfx } from "../sfx";
import { Celebration } from "../ui/Celebration";
import { KidsButton } from "../ui/KidsButton";
import { KidsText, QuranText } from "../ui/KidsPanel";
import { KidsScroll } from "../ui/KidsScroll";
import { KIDS } from "../ui/kidsStyles";
import { go } from "../ui/nav";
import { FlipCard } from "./FlipCard";
import { BarAction, GameBar, GameIntro } from "./GameChrome";

function starsFor(moves: number, pairs: number): number {
  if (moves <= pairs + 1) return 3;
  return moves <= pairs * 2 ? 2 : 1;
}

/** Memory game: find each surah's name and the ayah it begins with. */
export function SurahMatchGame({ focusSurahId }: { focusSurahId: number | null }) {
  const surahs = getKidsSurahs();
  const firstAyahs = useMemo(() => getKidsFirstAyahs(), []);
  const { recordGame } = useKidsProgress();
  const { react } = useCompanion();
  const [cards, setCards] = useState<SurahMatchCard[] | null>(null);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const lockRef = useRef(false);
  const pairs = cards ? cards.length / 2 : SURAH_MATCH_PAIRS;

  function start() {
    setCards(buildSurahMatchCards(surahs, firstAyahs, focusSurahId));
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setWon(false);
    lockRef.current = false;
    sfx.tap();
  }

  function flip(card: SurahMatchCard) {
    if (!cards || lockRef.current || matched.has(card.id) || flipped.includes(card.id)) return;
    sfx.flip();
    if (flipped.length === 0) {
      setFlipped([card.id]);
      return;
    }
    const first = cards.find((entry) => entry.id === flipped[0]);
    setFlipped([flipped[0]!, card.id]);
    setMoves((value) => value + 1);
    if (first && isSurahPair(first, card)) {
      const nextMatched = new Set(matched).add(first.id).add(card.id);
      setMatched(nextMatched);
      setFlipped([]);
      sfx.correct();
      react("correct");
      if (nextMatched.size === cards.length) {
        setTimeout(() => {
          sfx.win();
          setWon(true);
          recordGame({
            game: "surah_match",
            surah: focusSurahId,
            score: pairs,
            total: pairs,
            moves: moves + 1,
            stars: starsFor(moves + 1, pairs),
          });
        }, 450);
      }
      return;
    }
    lockRef.current = true;
    setTimeout(() => {
      setFlipped([]);
      lockRef.current = false;
    }, 1100);
  }

  if (!cards) {
    return (
      <KidsScroll>
        <GameIntro art="🃏" tone="violet" title="ذاكرة السور" description="اقلب بطاقتين: طابق اسم كل سورة مع أول آية فيها!">
          <KidsButton tone="emerald" onPress={start}>
            ابدأ اللعب
          </KidsButton>
        </GameIntro>
      </KidsScroll>
    );
  }

  const rows = Array.from({ length: Math.ceil(cards.length / 2) }, (_, row) => cards.slice(row * 2, row * 2 + 2));

  return (
    <KidsScroll gap={16}>
      <GameBar title="ذاكرة السور">
        <KidsText size={14} bold tone="muted">
          الأزواج: {toArabicDigits(matched.size / 2)}/{toArabicDigits(pairs)}
        </KidsText>
        <BarAction icon={RotateCcw} label="من جديد" onPress={start} />
      </GameBar>

      <View style={{ gap: 12 }}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={{ flexDirection: "row", gap: 12 }}>
            {row.map((card, column) => {
              const open = flipped.includes(card.id) || matched.has(card.id);
              return (
                <FlipCard
                  key={card.id}
                  index={rowIndex * 2 + column}
                  open={open}
                  matched={matched.has(card.id)}
                  aspect={4 / 5}
                  back={card.type === "name" ? [KIDS.cardGreen, KIDS.emeraldShadow] : [KIDS.cardGold, KIDS.starStroke]}
                  backShadow={card.type === "name" ? KIDS.cardGreenShadow : KIDS.cardGoldShadow}
                  label={card.text}
                  onPress={() => flip(card)}
                >
                  {card.type === "ayah" ? (
                    <QuranText size={20} color={KIDS.deep}>
                      {card.text}
                    </QuranText>
                  ) : (
                    <KidsText size={20} bold center>
                      {card.text}
                    </KidsText>
                  )}
                </FlipCard>
              );
            })}
          </View>
        ))}
      </View>

      <Celebration
        open={won}
        title="أحسنت! وجدت كل الأزواج"
        message={`في ${toArabicDigits(moves)} محاولة`}
        stars={starsFor(moves, pairs)}
        onClose={() => setWon(false)}
      >
        <KidsButton tone="emerald" onPress={start}>
          العب مرة أخرى
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
