import { Award, Check, RotateCcw, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";

import type { QuizQuestion } from "@/core/seerah/seerahContent";
import { toArabicDigits } from "@/core/text/arabic";
import { useThemeColor } from "@/theme/useThemeColor";

import { updateSeerah, useSeerah } from "./seerahStore";
import { seerahSound } from "./sound";

/** The website's SeerahQuiz: a few questions after a chapter, one at a time; answering them all earns its badge. */
export function SeerahQuiz({ chapter, title, quiz }: { chapter: string; title: string; quiz: QuizQuestion[] }) {
  const { badges } = useSeerah();
  const accent = useThemeColor("accent-strong");
  const primary = useThemeColor("primary");
  const danger = useThemeColor("danger");
  const muted = useThemeColor("fg-muted");
  const night = useThemeColor("emerald-night");
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const question = quiz[index];

  function pick(option: number) {
    if (picked !== null || !question) return;
    setPicked(option);
    if (option === question.answer) {
      seerahSound.effect("chime");
      setScore((value) => value + 1);
    } else seerahSound.effect("wrong");
  }

  function next() {
    const last = index === quiz.length - 1;
    setIndex((value) => value + 1);
    setPicked(null);
    if (!last) return;
    seerahSound.effect("fanfare");
    updateSeerah((current) => (current.badges.includes(chapter) ? current : { ...current, badges: [...current.badges, chapter] }));
  }

  return (
    <View className="rounded-3xl border border-border bg-surface p-4">
      <View className="flex-row items-center gap-2">
        <Award size={20} color={accent} />
        <Text className="flex-1 font-sans-bold text-base text-fg">اختبر ما قرأت</Text>
        {badges.includes(chapter) && (
          <View className="rounded-full bg-accent-soft px-2.5 py-0.5">
            <Text className="font-sans-bold text-xs text-accent-strong">نلت شارة الفصل</Text>
          </View>
        )}
      </View>

      {!question ? (
        <Animated.View entering={FadeIn} className="mt-4 items-center">
          <Animated.View entering={ZoomIn.springify()} className="size-20 items-center justify-center rounded-full bg-gold">
            <Award size={40} color={night} />
          </Animated.View>
          <Text className="mt-3 text-center font-sans-bold text-base text-fg">
            أجبت {toArabicDigits(score)} من {toArabicDigits(quiz.length)} — شارة «{title}» لك
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setIndex(0);
              setScore(0);
            }}
            className="mt-2 flex-row items-center gap-1.5 p-2"
          >
            <RotateCcw size={16} color={muted} />
            <Text className="font-sans text-sm text-fg-muted underline">أعد الأسئلة</Text>
          </Pressable>
        </Animated.View>
      ) : (
        <Animated.View key={index} entering={FadeIn} className="mt-3">
          <Text className="font-sans text-xs text-fg-muted">
            السؤال {toArabicDigits(index + 1)} من {toArabicDigits(quiz.length)}
          </Text>
          <Text className="mt-1 font-sans-bold text-lg leading-8 text-fg">{question.question}</Text>
          <View className="mt-3 gap-2">
            {question.options.map((option, optionIndex) => {
              const right = picked !== null && optionIndex === question.answer;
              const wrong = picked === optionIndex && optionIndex !== question.answer;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: picked !== null, selected: picked === optionIndex }}
                  disabled={picked !== null}
                  onPress={() => pick(optionIndex)}
                  className={`flex-row items-center justify-between rounded-2xl border px-4 py-3 ${
                    right ? "border-primary bg-primary-soft" : wrong ? "border-danger bg-danger/10" : "border-border"
                  }`}
                >
                  <Text className="flex-1 font-sans text-base text-fg">{option}</Text>
                  {right && <Check size={20} color={primary} />}
                  {wrong && <X size={20} color={danger} />}
                </Pressable>
              );
            })}
          </View>
          {picked !== null && (
            <View className="mt-3 rounded-2xl bg-surface-alt p-3">
              <Text className="font-sans text-sm leading-7 text-fg">{question.why}</Text>
              <Pressable accessibilityRole="button" onPress={next} className="mt-2 self-start rounded-xl bg-primary px-4 py-2">
                <Text className="font-sans-bold text-sm text-on-primary">{index === quiz.length - 1 ? "النتيجة" : "التالي"}</Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}
