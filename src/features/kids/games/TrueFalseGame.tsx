import { Check, CircleHelp, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeInDown, FadeInLeft } from "react-native-reanimated";

import { buildTrueFalseQuiz, type TrueFalseQuestion } from "@/core/kids/games/trueFalseLogic";
import { toArabicDigits } from "@/core/text/arabic";

import { useCompanion } from "../companion/companionStore";
import { getKidsFirstAyahs, getKidsSurahs } from "../kidsData";
import { useKidsProgress } from "../progress/progressStore";
import { sfx } from "../sfx";
import { Celebration } from "../ui/Celebration";
import { KidsButton } from "../ui/KidsButton";
import { KidsPanel, KidsText, QuranText } from "../ui/KidsPanel";
import { KidsScroll } from "../ui/KidsScroll";
import { KIDS } from "../ui/kidsStyles";
import { go } from "../ui/nav";
import { GameBar, GameIntro } from "./GameChrome";

export function TrueFalseGame() {
  const surahs = getKidsSurahs();
  const firstAyahs = useMemo(() => getKidsFirstAyahs(), []);
  const { recordGame } = useKidsProgress();
  const { react } = useCompanion();
  const [questions, setQuestions] = useState<TrueFalseQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [correct, setCorrect] = useState(0);
  const [won, setWon] = useState(false);

  function start() {
    sfx.tap();
    setQuestions(buildTrueFalseQuiz(surahs, firstAyahs));
    setIndex(0);
    setAnswer(null);
    setCorrect(0);
    setWon(false);
  }

  const question = questions[index];

  function choose(value: boolean) {
    if (!question || answer !== null) return;
    setAnswer(value);
    if (value === question.answer) {
      sfx.correct();
      react("correct");
      setCorrect((count) => count + 1);
    } else {
      sfx.flip();
      react("almost");
    }
  }

  function next() {
    sfx.tap();
    if (index + 1 >= questions.length) {
      recordGame({ game: "true_false", score: correct, total: questions.length });
      sfx.win();
      setWon(true);
      return;
    }
    setIndex(index + 1);
    setAnswer(null);
  }

  if (!question) {
    return (
      <KidsScroll>
        <GameIntro icon={CircleHelp} tone="rose" title="صح أم خطأ؟" description="جمل عن سور القرآن: هل هي صحيحة أم خطأ؟ وبعد كل جملة تتعلّم معلومة جديدة!">
          <KidsButton tone="rose" onPress={start}>
            ابدأ اللعب
          </KidsButton>
        </GameIntro>
      </KidsScroll>
    );
  }

  const right = answer !== null && answer === question.answer;
  const stars = correct >= questions.length ? 3 : correct >= questions.length * 0.6 ? 2 : 1;

  return (
    <KidsScroll gap={16}>
      <GameBar title="صح أم خطأ؟">
        <KidsText size={15} bold tone="muted">
          {toArabicDigits(index + 1)} / {toArabicDigits(questions.length)}
        </KidsText>
      </GameBar>

      <Animated.View key={question.id} entering={FadeInLeft}>
        <KidsPanel className="items-center">
          <KidsText size={24} bold center>
            {question.statement}
          </KidsText>
          {question.ayah && (
            <View style={{ marginTop: 14, borderRadius: 24, backgroundColor: KIDS.paper, padding: 14, alignSelf: "stretch" }}>
              <QuranText size={24}>{question.ayah}</QuranText>
            </View>
          )}

          <View style={{ marginTop: 22, flexDirection: "row", gap: 14, alignSelf: "stretch" }}>
            {[true, false].map((value) => {
              const picked = answer === value;
              return (
                <Pressable
                  key={String(value)}
                  accessibilityRole="button"
                  disabled={answer !== null}
                  onPress={() => choose(value)}
                  style={({ pressed }) => ({
                    flex: 1,
                    alignItems: "center",
                    gap: 2,
                    borderRadius: 32,
                    paddingVertical: 16,
                    backgroundColor: value ? KIDS.emerald : KIDS.rose,
                    borderBottomWidth: pressed ? 1 : 7,
                    borderBottomColor: value ? KIDS.emeraldShadow : KIDS.roseShadow,
                    opacity: answer !== null && !picked ? 0.4 : 1,
                    transform: [{ scale: pressed ? 0.94 : 1 }],
                  })}
                >
                  {value ? <Check size={40} color={KIDS.white} /> : <X size={40} color={KIDS.white} />}
                  <KidsText size={22} bold tone="white">
                    {value ? "صح" : "خطأ"}
                  </KidsText>
                </Pressable>
              );
            })}
          </View>

          {answer !== null && (
            <Animated.View entering={FadeInDown} className="mt-6 items-center">
              <KidsText size={20} bold center style={{ color: right ? KIDS.emeraldShadow : KIDS.honey }}>
                {right ? "أحسنت! 🌟" : "قريب! ❤️ تعلّمنا معلومة جديدة:"}
              </KidsText>
              <KidsText size={17} tone="muted" center className="mt-1">
                {question.explanation}
              </KidsText>
              <KidsButton tone="emerald" className="mt-4" onPress={next}>
                {index + 1 >= questions.length ? "النتيجة" : "التالي"}
              </KidsButton>
            </Animated.View>
          )}
        </KidsPanel>
      </Animated.View>

      <Celebration open={won} title="أحسنت يا بطل!" message={`عرفت ${toArabicDigits(correct)} من ${toArabicDigits(questions.length)}`} stars={stars} onClose={() => setWon(false)}>
        <KidsButton tone="rose" onPress={start}>
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
