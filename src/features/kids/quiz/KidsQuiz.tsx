import { LinearGradient } from "expo-linear-gradient";
import { Check, Sparkles, Star, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeInDown, FadeInLeft, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { isQuizPassed, nextSurahId, QUIZ_PASS_PERCENT } from "@/core/kids/levels";
import { generateQuiz } from "@/core/kids/quizGenerator";
import type { QuizQuestion } from "@/core/kids/quizTypes";
import { toArabicDigits } from "@/core/text/arabic";

import { getKidsSurahs, kidsAyahs } from "../kidsData";
import { useKidsProgress } from "../progress/progressStore";
import { sfx } from "../sfx";
import { Celebration } from "../ui/Celebration";
import { KidsButton } from "../ui/KidsButton";
import { KidsPanel, KidsText, QuranText } from "../ui/KidsPanel";
import { KidsScroll } from "../ui/KidsScroll";
import { KIDS, PANEL_SHADOW } from "../ui/kidsStyles";
import { useShake } from "../ui/motion";
import { go } from "../ui/nav";

const QUESTION_COUNT = 8;

function Choice({
  label,
  quran,
  reveal,
  isCorrect,
  picked,
  onPress,
}: {
  label: string;
  quran: boolean;
  reveal: boolean;
  isCorrect: boolean;
  picked: boolean;
  onPress: () => void;
}) {
  const motion = useShake(reveal, reveal && picked && !isCorrect ? "shake" : reveal && isCorrect ? "pop" : null);
  const colors =
    reveal && isCorrect
      ? { bg: KIDS.rightBg, fg: KIDS.emeraldShadow, ring: KIDS.emerald }
      : reveal && picked
        ? { bg: KIDS.wrongBg, fg: KIDS.roseShadow, ring: KIDS.rose }
        : { bg: KIDS.white, fg: KIDS.deep, ring: KIDS.whiteRing };
  return (
    <Animated.View style={[motion, { opacity: reveal && !isCorrect && !picked ? 0.5 : 1 }]}>
      <Pressable
        accessibilityRole="button"
        disabled={reveal}
        onPress={onPress}
        style={{
          minHeight: 64,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          borderRadius: 24,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderWidth: 4,
          backgroundColor: colors.bg,
          borderColor: colors.ring,
        }}
      >
        {reveal && isCorrect && <Check size={22} color={colors.fg} />}
        {reveal && picked && !isCorrect && <X size={22} color={colors.fg} />}
        {quran ? (
          <QuranText size={22} color={colors.fg} style={{ flexShrink: 1 }}>
            {label}
          </QuranText>
        ) : (
          <KidsText size={22} bold center style={{ color: colors.fg, flexShrink: 1 }}>
            {label}
          </KidsText>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function KidsQuiz({ surahId }: { surahId: number }) {
  const { recordQuizResult } = useKidsProgress();
  // Every kids surah is loaded because the wrong choices come from the other surahs.
  const surahs = getKidsSurahs();
  const ayahsBySurah = useMemo(() => Object.fromEntries(surahs.map((surah) => [surah.id, kidsAyahs(surah.id)])), [surahs]);
  const surah = surahs.find((entry) => entry.id === surahId);
  const nextId = nextSurahId(surahId);
  const nextSurah = nextId === null ? undefined : surahs.find((entry) => entry.id === nextId);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const progress = useSharedValue(0);
  const total = questions?.length ?? 0;
  useEffect(() => {
    progress.value = withTiming(total ? ((current + (answer ? 1 : 0)) / total) * 100 : 0, { duration: 350 });
  }, [current, answer, total, progress]);
  const bar = useAnimatedStyle(() => ({ width: `${progress.value}%` }));

  function start() {
    setQuestions(generateQuiz(surahs, ayahsBySurah, QUESTION_COUNT, Math.random, surahId));
    setCurrent(0);
    setAnswer(null);
    setScore(0);
    setFinished(false);
    sfx.tap();
  }

  const question = questions?.[current];

  function choose(choiceId: string) {
    if (!question || answer) return;
    setAnswer(choiceId);
    if (choiceId === question.correctChoiceId) {
      sfx.correct();
      setScore((value) => value + 1);
    } else sfx.wrong();
  }

  function next() {
    if (!questions) return;
    if (current === questions.length - 1) {
      recordQuizResult(score, questions.length, surahId);
      if (isQuizPassed(score, questions.length)) sfx.win();
      else sfx.wrong();
      setFinished(true);
      return;
    }
    setCurrent((value) => value + 1);
    setAnswer(null);
  }

  if (!questions) {
    return (
      <KidsScroll>
        <KidsPanel className="items-center">
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: KIDS.gold,
              borderBottomWidth: 7,
              borderBottomColor: KIDS.goldShadow,
            }}
          >
            <Sparkles size={40} color={KIDS.white} />
          </View>
          <KidsText size={28} bold center className="mt-5">
            اختبار سورة {surah?.name}
          </KidsText>
          <KidsText size={17} tone="muted" center className="mt-2">
            أكمل الآية التالية، أو اعرف من أي سورة هذه الآية.
          </KidsText>
          <KidsText size={16} bold center className="mt-2" style={{ color: KIDS.honey }}>
            أجب {toArabicDigits(QUIZ_PASS_PERCENT)}٪ من الأسئلة صحيحًا لتفتح {nextSurah ? `سورة ${nextSurah.name}` : "الشارة الكبرى"}
          </KidsText>
          <KidsButton tone="gold" className="mt-6" disabled={surahs.length === 0} onPress={start}>
            ابدأ الاختبار
          </KidsButton>
        </KidsPanel>
      </KidsScroll>
    );
  }

  if (questions.length === 0)
    return (
      <KidsScroll>
        <KidsPanel>
          <KidsText tone="muted" center>
            تعذّر تحضير الأسئلة الآن، جرّب بعد قليل.
          </KidsText>
        </KidsPanel>
      </KidsScroll>
    );
  const percent = Math.round((score / questions.length) * 100);
  const passed = isQuizPassed(score, questions.length);

  return (
    <KidsScroll gap={16}>
      <View
        style={[
          {
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.95)",
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderWidth: 4,
            borderColor: "rgba(255,255,255,0.6)",
          },
          PANEL_SHADOW,
        ]}
      >
        <View className="flex-row items-center justify-between">
          <KidsText size={16} bold>
            السؤال {toArabicDigits(Math.min(current + 1, questions.length))} من {toArabicDigits(questions.length)}
          </KidsText>
          <View className="flex-row items-center gap-1">
            <Star size={20} color={KIDS.starStroke} fill={KIDS.starFill} />
            <KidsText size={16} bold style={{ color: KIDS.honey }}>
              {toArabicDigits(score)}
            </KidsText>
          </View>
        </View>
        <View style={{ marginTop: 8, height: 12, borderRadius: 6, overflow: "hidden", backgroundColor: KIDS.soft }}>
          <Animated.View style={[{ height: "100%", borderRadius: 6, overflow: "hidden" }, bar]}>
            <LinearGradient colors={[KIDS.emerald, KIDS.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
          </Animated.View>
        </View>
      </View>

      {question && (
        <Animated.View key={question.id} entering={FadeInLeft.springify().stiffness(260).damping(26)}>
          <KidsPanel className="items-center">
            <View style={{ borderRadius: 999, backgroundColor: KIDS.cream, paddingHorizontal: 16, paddingVertical: 2 }}>
              <KidsText size={16} bold style={{ color: KIDS.honey }}>
                {question.promptLabel}
              </KidsText>
            </View>
            <QuranText size={28} style={{ marginTop: 18 }}>
              {question.prompt}
            </QuranText>
            <View style={{ marginTop: 24, gap: 12, alignSelf: "stretch" }}>
              {question.choices.map((choice) => (
                <Choice
                  key={choice.id}
                  label={choice.label}
                  quran={question.kind === "complete-ayah"}
                  reveal={answer !== null}
                  isCorrect={choice.id === question.correctChoiceId}
                  picked={answer === choice.id}
                  onPress={() => choose(choice.id)}
                />
              ))}
            </View>
            {answer && (
              <Animated.View entering={FadeInDown} className="mt-6 items-center">
                <KidsText size={20} bold center className="mb-3">
                  {answer === question.correctChoiceId ? "إجابة صحيحة!" : "لا بأس، تعلّمنا الإجابة الصحيحة"}
                </KidsText>
                <KidsButton tone="emerald" onPress={next}>
                  {current === questions.length - 1 ? "النتيجة" : "السؤال التالي"}
                </KidsButton>
              </Animated.View>
            )}
          </KidsPanel>
        </Animated.View>
      )}

      <Celebration
        open={finished}
        title={passed ? (nextSurah ? `نجحت! فتحت سورة ${nextSurah.name}` : "بطل! أنهيت كل السور") : "محاولة جميلة!"}
        message={
          `أجبت ${toArabicDigits(score)} من ${toArabicDigits(questions.length)} إجابة صحيحة` +
          (passed ? "" : `. تحتاج ${toArabicDigits(QUIZ_PASS_PERCENT)}٪ لتنجح، راجع السورة وحاول مرة أخرى`)
        }
        stars={percent >= 90 ? 3 : passed ? 2 : 1}
        onClose={() => setFinished(false)}
      >
        {passed && nextSurah ? (
          <KidsButton
            tone="gold"
            onPress={() => {
              setFinished(false);
              go(`/kids/learn/${nextSurah.id}`);
            }}
          >
            تعلّم سورة {nextSurah.name}
          </KidsButton>
        ) : (
          <KidsButton tone="gold" onPress={start}>
            حاول مرة أخرى
          </KidsButton>
        )}
        {!passed && (
          <KidsButton
            tone="emerald"
            onPress={() => {
              setFinished(false);
              go(`/kids/learn/${surahId}`);
            }}
          >
            راجع السورة
          </KidsButton>
        )}
        <KidsButton
          tone="white"
          onPress={() => {
            setFinished(false);
            go("/kids/quiz");
          }}
        >
          الاختبارات
        </KidsButton>
      </Celebration>
    </KidsScroll>
  );
}
