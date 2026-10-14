import { RotateCcw } from "lucide-react-native";
import { useRef, useState } from "react";
import { View } from "react-native";

import { ARABIC_LETTERS } from "@/core/kids/games/arabicLetters";
import { buildLetterMatchRound, isMatchingPair, type LetterMatchTile } from "@/core/kids/games/letterGameLogic";
import { toArabicDigits } from "@/core/text/arabic";

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

const LEVELS = [
  { pairs: 4, label: "سهل", tone: "emerald" as const },
  { pairs: 6, label: "متوسط", tone: "gold" as const },
  { pairs: 8, label: "صعب", tone: "rose" as const },
];

function starsFor(moves: number, pairs: number): number {
  if (moves <= pairs + 2) return 3;
  if (moves <= Math.ceil(pairs * 1.7)) return 2;
  return 1;
}

function chunk<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, row) => items.slice(row * size, row * size + size));
}

export function LetterMemoryGame() {
  const { recordGame } = useKidsProgress();
  const [tiles, setTiles] = useState<LetterMatchTile[] | null>(null);
  const [pairs, setPairs] = useState(0);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const lockRef = useRef(false);

  function start(pairCount: number) {
    const round = buildLetterMatchRound(ARABIC_LETTERS, pairCount);
    setTiles(round.tiles);
    setPairs(round.pairCount);
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setWon(false);
    lockRef.current = false;
    sfx.tap();
  }

  function flip(tile: LetterMatchTile) {
    if (!tiles || lockRef.current || matched.has(tile.id) || flipped.includes(tile.id)) return;
    sfx.flip();
    if (flipped.length === 0) {
      setFlipped([tile.id]);
      return;
    }
    const first = tiles.find((entry) => entry.id === flipped[0]);
    setFlipped([flipped[0]!, tile.id]);
    setMoves((value) => value + 1);
    if (first && isMatchingPair(first, tile)) {
      const nextMatched = new Set(matched).add(first.id).add(tile.id);
      setMatched(nextMatched);
      setFlipped([]);
      sfx.correct();
      if (nextMatched.size === tiles.length) {
        setTimeout(() => {
          sfx.win();
          setWon(true);
          recordGame({ game: "letters", score: pairs, total: pairs, moves: moves + 1, stars: starsFor(moves + 1, pairs) });
        }, 450);
      }
      return;
    }
    lockRef.current = true;
    setTimeout(() => {
      sfx.wrong();
      setFlipped([]);
      lockRef.current = false;
    }, 900);
  }

  if (!tiles) {
    return (
      <KidsScroll>
        <GameIntro
          art="🅰️"
          tone="violet"
          title="ذاكرة الحروف"
          description="اقلب بطاقتين: إذا كان الحرف واسمه متطابقين يبقيان مفتوحين. هل تجد كل الأزواج؟"
        >
          <KidsText size={16} bold center>
            اختر المستوى:
          </KidsText>
          <View className="flex-row flex-wrap justify-center gap-3">
            {LEVELS.map((level) => (
              <KidsButton
                key={level.pairs}
                tone={level.tone}
                caption={`(${toArabicDigits(level.pairs)} أزواج)`}
                onPress={() => start(level.pairs)}
              >
                {level.label}
              </KidsButton>
            ))}
          </View>
        </GameIntro>
      </KidsScroll>
    );
  }

  const columns = tiles.length <= 12 && tiles.length > 8 ? 3 : 4;

  return (
    <KidsScroll gap={16}>
      <GameBar title="ذاكرة الحروف">
        <KidsText size={14} bold tone="muted">
          المحاولات: {toArabicDigits(moves)} · الأزواج: {toArabicDigits(matched.size / 2)}/{toArabicDigits(pairs)}
        </KidsText>
        <BarAction icon={RotateCcw} label="من جديد" onPress={() => setTiles(null)} />
      </GameBar>

      <View style={{ gap: 10 }}>
        {chunk(tiles, columns).map((row, rowIndex) => (
          <View key={rowIndex} style={{ flexDirection: "row", gap: 10 }}>
            {row.map((tile, column) => {
              const open = flipped.includes(tile.id) || matched.has(tile.id);
              return (
                <FlipCard
                  key={tile.id}
                  index={rowIndex * columns + column}
                  open={open}
                  matched={matched.has(tile.id)}
                  aspect={3 / 4}
                  back={[KIDS.cardViolet, KIDS.violetShadow]}
                  backShadow={KIDS.cardVioletShadow}
                  label={tile.value}
                  onPress={() => flip(tile)}
                >
                  {tile.type === "letter" ? (
                    <QuranText size={44} color={KIDS.deep}>
                      {tile.value}
                    </QuranText>
                  ) : (
                    <KidsText size={19} bold center>
                      {tile.value}
                    </KidsText>
                  )}
                </FlipCard>
              );
            })}
            {row.length < columns &&
              Array.from({ length: columns - row.length }, (_, pad) => <View key={`pad-${pad}`} style={{ flex: 1 }} />)}
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
        <KidsButton tone="emerald" onPress={() => start(pairs)}>
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
