import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Award, BookOpen, ChevronLeft, ChevronRight, Clock, Send, X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FINAL_PART, QUESTION_TITLES } from "@/core/nawawi/nawawiData";
import { formatDuration, toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import type { SubmitResult } from "@/features/exams/examData";
import { useNow } from "@/features/time/useNow";
import { useScaledText } from "@/theme/textScale";
import { useThemeColor } from "@/theme/useThemeColor";

import { nawawiExams, type ActiveNawawiAttempt } from "./nawawiExam";

/** The website's ExamResult: the score, each question right or wrong, and the certificate after the final. */
export function NawawiResult({ result, part }: { result: SubmitResult; part: number }) {
  const passed = result.status === "passed";
  const percent = result.total ? Math.round((result.score / result.total) * 100) : 0;
  const danger = useThemeColor("danger");
  return (
    <View className={`items-center rounded-[32px] p-6 ${passed ? "bg-hero" : "border border-border bg-surface"}`}>
      <View className={`size-20 items-center justify-center rounded-full ${passed ? "bg-gold" : "bg-danger/15"}`}>
        {passed ? <Award size={40} color="#012a22" /> : <X size={40} color={danger} />}
      </View>
      <Text className={`mt-5 text-center font-display-bold text-2xl ${passed ? "text-hero-fg" : "text-fg"}`}>
        {passed
          ? part === FINAL_PART
            ? "مبارك! أتممت الأربعين النووية"
            : "أحسنت! اجتزت هذه المرحلة"
          : result.status === "expired"
            ? "انتهى وقت الاختبار"
            : "لم تبلغ درجة النجاح هذه المرة"}
      </Text>
      <Text className={`mt-2 text-center font-sans text-base ${passed ? "text-white/80" : "text-fg-muted"}`}>
        درجتك {toArabicDigits(result.score)} من {toArabicDigits(result.total)} ({toArabicDigits(percent)}٪) — درجة النجاح{" "}
        {toArabicDigits(result.passPercent)}٪
      </Text>
      <View className="mt-5 flex-row flex-wrap justify-center gap-2">
        {result.perQuestion.map((right, index) => (
          <View
            key={index}
            accessibilityLabel={`السؤال ${index + 1}: ${right ? "صحيح" : "خطأ"}`}
            className={`size-9 items-center justify-center rounded-xl ${right ? "bg-primary" : "bg-danger/15"}`}
          >
            <Text className={`font-sans-bold text-sm ${right ? "text-on-primary" : "text-danger"}`}>{toArabicDigits(index + 1)}</Text>
          </View>
        ))}
      </View>
      <View className="mt-6 items-center gap-3">
        {passed && result.certificateCode && (
          <Button
            variant="gold"
            size="lg"
            icon={Award}
            onPress={() => router.replace({ pathname: "/certificate/[code]", params: { code: result.certificateCode! } })}
          >
            عرض الشهادة
          </Button>
        )}
        <Button
          variant={passed ? "light" : "primary"}
          icon={BookOpen}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/nawawi"))}
        >
          {passed ? "الأربعون النووية" : "راجع الأحاديث"}
        </Button>
      </View>
    </View>
  );
}

/** The running exam, like the juz exam's Runner: one question at a time, a countdown, auto-submit at zero. */
export function NawawiExamRunner({ attempt, onDone }: { attempt: ActiveNawawiAttempt; onDone: (result: SubmitResult) => void }) {
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();
  const now = useNow(1000);
  const primary = useThemeColor("primary");
  const danger = useThemeColor("danger");
  const promptText = useScaledText(22, 46);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() => attempt.questions.map(() => -1));
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitted = useRef(false);
  const left = Math.max(0, Math.floor((new Date(attempt.expiresAt).getTime() - now.getTime()) / 1000));
  const question = attempt.questions[index]!;
  const unanswered = answers.filter((answer) => answer < 0).length;

  const submit = useCallback(async () => {
    if (submitted.current) return;
    submitted.current = true;
    setBusy(true);
    setError(null);
    const result = await nawawiExams.submit(attempt.id, answers);
    setBusy(false);
    if (result.ok) onDone(result);
    else {
      submitted.current = false;
      setError(result.error);
    }
  }, [attempt.id, answers, onDone]);

  // Time's up: hand in what there is. A timer at the deadline, with the latest answers through the ref.
  const latestSubmit = useRef(submit);
  useEffect(() => {
    latestSubmit.current = submit;
  }, [submit]);
  useEffect(() => {
    const id = setTimeout(() => latestSubmit.current(), Math.max(0, new Date(attempt.expiresAt).getTime() - Date.now()));
    return () => clearTimeout(id);
  }, [attempt.expiresAt]);

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + miniPlayer + 12 }}>
      <View className="flex-row items-center justify-between px-4">
        <Text className="font-sans-bold text-sm text-fg-muted">
          السؤال {toArabicDigits(index + 1)} من {toArabicDigits(attempt.questions.length)} · أجبت عن{" "}
          {toArabicDigits(attempt.questions.length - unanswered)}
        </Text>
        <View className={`flex-row items-center gap-1.5 rounded-full px-3 py-1 ${left < 120 ? "bg-danger/15" : "bg-primary-soft"}`}>
          <Clock size={14} color={left < 120 ? danger : primary} />
          <Text className={`font-display-bold text-sm ${left < 120 ? "text-danger" : "text-primary"}`}>{formatDuration(left)}</Text>
        </View>
      </View>
      <View className="px-4 pt-2">
        <ProgressBar value={(index + 1) / attempt.questions.length} />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text className="font-sans-bold text-base text-accent-strong">{QUESTION_TITLES[question.type]}</Text>
        <View className="rounded-3xl border border-gold/30 bg-surface p-5">
          {/* Amiri Quran: the hadith text has Arabic commas, which the Hafs face draws as dotted circles. */}
          <Text className="text-center font-quran-fallback text-fg" style={promptText}>
            «{question.prompt}»
          </Text>
          <Text className="mt-2 text-center font-sans text-xs text-fg-muted">الحديث {toArabicDigits(question.hadith)}</Text>
        </View>
        {question.options.map((option, optionIndex) => {
          const chosen = answers[index] === optionIndex;
          return (
            <Pressable
              key={optionIndex}
              accessibilityRole="radio"
              accessibilityState={{ selected: chosen }}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setAnswers((current) => current.map((answer, position) => (position === index ? optionIndex : answer)));
              }}
              className={`rounded-2xl border-2 p-4 ${chosen ? "border-primary bg-primary-soft" : "border-border bg-surface"}`}
            >
              <Text
                className={`${question.type === "narrator" ? "font-sans-bold text-base" : "font-quran-fallback text-xl leading-10"} ${chosen ? "text-primary" : "text-fg"}`}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
        <View className="mt-2 flex-row flex-wrap justify-center gap-2">
          {attempt.questions.map((entry, position) => (
            <Pressable
              key={entry.id}
              accessibilityRole="button"
              accessibilityLabel={`السؤال ${position + 1}${answers[position]! >= 0 ? " (تمت الإجابة)" : ""}`}
              onPress={() => setIndex(position)}
              className={`size-9 items-center justify-center rounded-xl ${
                position === index ? "bg-hero" : answers[position]! >= 0 ? "bg-primary-soft" : "border border-border bg-surface"
              }`}
            >
              <Text
                className={`font-sans-bold text-sm ${position === index ? "text-hero-fg" : answers[position]! >= 0 ? "text-primary" : "text-fg-muted"}`}
              >
                {toArabicDigits(position + 1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View className="gap-3 px-4">
        {error ? <Text className="font-sans text-sm text-danger">{error}</Text> : null}
        {confirm && unanswered > 0 && (
          <Text className="font-sans text-sm text-accent-strong">
            بقي {toArabicDigits(unanswered)} سؤالًا دون إجابة. اضغط تسليم مرة أخرى للتأكيد.
          </Text>
        )}
        <View className="flex-row items-center gap-3">
          <Button variant="outline" icon={ChevronRight} disabled={index === 0} onPress={() => setIndex(index - 1)}>
            السابق
          </Button>
          <View className="flex-1" />
          {index + 1 < attempt.questions.length ? (
            <Button icon={ChevronLeft} onPress={() => setIndex(index + 1)}>
              التالي
            </Button>
          ) : (
            <Button variant="gold" icon={Send} disabled={busy} onPress={() => (unanswered > 0 && !confirm ? setConfirm(true) : submit())}>
              {busy ? "جارٍ التسليم…" : "تسليم"}
            </Button>
          )}
        </View>
      </View>
    </View>
  );
}
