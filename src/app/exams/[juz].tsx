import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { Award, ChevronLeft, ChevronRight, Clock, Send, X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatDuration, toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { activeLearnerId, useAccount } from "@/features/account/accountStore";
import { exams, getAttempt, getExamSettings, type ActiveAttempt, type ExamSettings, type SubmitResult } from "@/features/exams/examData";
import { QUESTION_TITLES, juzOrdinal } from "@/features/exams/juzNames";
import { getSurah } from "@/features/mushaf/mushaf";
import { useNow } from "@/features/time/useNow";
import { useThemeColor } from "@/theme/useThemeColor";

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const insets = useSafeAreaInsets();
  const heroFg = useThemeColor("hero-fg");
  return (
    <View className="rounded-b-[32px] bg-hero px-5 pb-6" style={{ paddingTop: insets.top + 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="رجوع"
        onPress={() => router.back()}
        hitSlop={12}
        className="mb-3 self-start p-1"
      >
        <ChevronRight size={26} color={heroFg} />
      </Pressable>
      <Text className="font-display-bold text-3xl text-hero-fg">{title}</Text>
      {subtitle ? <Text className="mt-1 font-sans text-sm leading-6 text-white/70">{subtitle}</Text> : null}
    </View>
  );
}

function Result({ result }: { result: SubmitResult }) {
  const passed = result.status === "passed";
  const percent = result.total ? Math.round((result.score / result.total) * 100) : 0;
  const gold = useThemeColor("gold");
  return (
    <View className={`items-center rounded-[32px] p-6 ${passed ? "bg-hero" : "border border-border bg-surface"}`}>
      <View className={`size-20 items-center justify-center rounded-full ${passed ? "bg-gold" : "bg-danger/15"}`}>
        {passed ? <Award size={40} color="#012a22" /> : <X size={40} color="#e0526b" />}
      </View>
      <Text className={`mt-5 text-center font-display-bold text-2xl ${passed ? "text-hero-fg" : "text-fg"}`}>
        {passed ? "مبارك! اجتزت اختبار الجزء" : result.status === "expired" ? "انتهى وقت الاختبار" : "لم تبلغ درجة النجاح هذه المرة"}
      </Text>
      <Text className={`mt-2 text-center font-sans text-base ${passed ? "text-white/80" : "text-fg-muted"}`}>
        درجتك {toArabicDigits(result.score)} من {toArabicDigits(result.total)} ({toArabicDigits(percent)}٪) — درجة النجاح{" "}
        {toArabicDigits(result.passPercent)}٪
      </Text>
      <View className="mt-5 flex-row flex-wrap justify-center gap-2">
        {result.perQuestion.map((right, index) => (
          <View key={index} className={`size-9 items-center justify-center rounded-xl ${right ? "bg-primary" : "bg-danger/15"}`}>
            <Text className={`font-sans-bold text-sm ${right ? "text-on-primary" : "text-danger"}`}>{toArabicDigits(index + 1)}</Text>
          </View>
        ))}
      </View>
      {passed && result.certificateCode ? (
        <Button
          className="mt-6"
          variant="gold"
          size="lg"
          icon={Award}
          onPress={() => router.replace({ pathname: "/certificate/[code]", params: { code: result.certificateCode! } })}
        >
          عرض الشهادة
        </Button>
      ) : (
        <Text className="mt-6 text-center font-sans text-sm" style={{ color: passed ? gold : undefined }}>
          راجع حفظك، ويمكنك إعادة الاختبار بعد مهلة قصيرة.
        </Text>
      )}
    </View>
  );
}

function Runner({ attempt, onDone }: { attempt: ActiveAttempt; onDone: (result: SubmitResult) => void }) {
  const insets = useSafeAreaInsets();
  const now = useNow(1000);
  const primary = useThemeColor("primary");
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
    const result = await exams.submit(attempt.id, answers);
    setBusy(false);
    if (result.ok) onDone(result);
    else {
      submitted.current = false;
      setError(result.error);
    }
  }, [attempt.id, answers, onDone]);

  // Time's up: hand in what there is, like the website. A timer at the deadline (not an effect on the
  // ticking clock) so the submit runs from a callback, with the latest answers through the ref.
  const latestSubmit = useRef(submit);
  useEffect(() => {
    latestSubmit.current = submit;
  }, [submit]);
  useEffect(() => {
    const id = setTimeout(() => latestSubmit.current(), Math.max(0, new Date(attempt.expiresAt).getTime() - Date.now()));
    return () => clearTimeout(id);
  }, [attempt.expiresAt]);

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }}>
      <View className="flex-row items-center justify-between px-4">
        <Text className="font-sans-bold text-sm text-fg-muted">
          السؤال {toArabicDigits(index + 1)} من {toArabicDigits(attempt.questions.length)}
        </Text>
        <View className={`flex-row items-center gap-1.5 rounded-full px-3 py-1 ${left < 60 ? "bg-danger/15" : "bg-primary-soft"}`}>
          <Clock size={14} color={left < 60 ? "#e0526b" : primary} />
          <Text className={`font-display-bold text-sm ${left < 60 ? "text-danger" : "text-primary"}`}>{formatDuration(left)}</Text>
        </View>
      </View>
      <View className="px-4 pt-2">
        <ProgressBar value={(index + 1) / attempt.questions.length} />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text className="font-sans-bold text-base text-accent-strong">{QUESTION_TITLES[question.type]}</Text>
        <View className="rounded-3xl border border-gold/30 bg-surface p-5">
          <Text className="font-quran text-[22px] leading-[46px] text-fg">{question.prompt}</Text>
          {question.type !== "surah" && <Text className="mt-2 font-sans text-xs text-fg-muted">سورة {getSurah(question.surah)?.name}</Text>}
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
                className={`${question.type === "surah" ? "font-display-bold text-lg" : "font-quran text-xl leading-10"} ${chosen ? "text-primary" : "text-fg"}`}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
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

export default function JuzExamScreen() {
  const { juz: param } = useLocalSearchParams<{ juz: string }>();
  const juz = Number(param);
  const insets = useSafeAreaInsets();
  const learnerId = activeLearnerId(useAccount());
  const [settings, setSettings] = useState<ExamSettings | null>(null);
  const [attempt, setAttempt] = useState<ActiveAttempt | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getExamSettings().then(setSettings);
  }, []);

  async function start() {
    setBusy(true);
    setError(null);
    const started = await exams.start(juz);
    if (!started.ok) {
      setBusy(false);
      setError(started.status === 401 ? "سجّل الدخول أولًا." : started.error);
      return;
    }
    const loaded = await getAttempt(started.attemptId);
    setBusy(false);
    if (loaded) setAttempt(loaded);
    else setError("تعذّر تحميل أسئلة الاختبار، حاول مرة أخرى.");
  }

  if (attempt && !result) return <Runner attempt={attempt} onDone={setResult} />;

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
      <Header title={`اختبار الجزء ${juzOrdinal(juz)}`} subtitle="اختبار حفظ من آيات الجزء، وشهادة موثّقة باسمك عند النجاح." />
      <View className="gap-4 px-4 pt-5">
        {result ? (
          <Result result={result} />
        ) : (
          <>
            <View className="gap-2 rounded-3xl border border-border bg-surface p-5">
              <Text className="font-display-bold text-lg text-fg">قبل أن تبدأ</Text>
              <Text className="font-sans text-sm leading-7 text-fg-muted">
                • {toArabicDigits(settings?.exam_question_count ?? 20)} سؤالًا خلال {toArabicDigits(settings?.exam_minutes ?? 30)} دقيقة.
                {"\n"}• درجة النجاح {toArabicDigits(settings?.exam_pass_percent ?? 80)}٪.{"\n"}• يفتح الاختبار بعد حفظ الجزء كاملًا وتسميعه.
                {"\n"}• عند انتهاء الوقت يُسلَّم الاختبار تلقائيًا.
              </Text>
            </View>
            {error ? <Text className="font-sans text-sm leading-6 text-danger">{error}</Text> : null}
            {learnerId ? (
              <Button size="lg" onPress={start} disabled={busy}>
                {busy ? "جارٍ تجهيز الاختبار…" : "ابدأ الاختبار"}
              </Button>
            ) : (
              <Button size="lg" onPress={() => router.push("/login")}>
                سجّل الدخول لبدء الاختبار
              </Button>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}
