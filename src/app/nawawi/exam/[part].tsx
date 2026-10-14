import { router, useLocalSearchParams } from "expo-router";
import { Award, BookOpen, CheckCircle2, GraduationCap, ListChecks, Lock } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FINAL_PART, NAWAWI_PARTS, examSize, parsePartSlug, partRange, partSlug, partTitle } from "@/core/nawawi/nawawiData";
import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { ScreenHeader, enterSoft } from "@/components/ui/PageHeader";
import { StateMessage } from "@/components/ui/StateMessage";
import { activeLearnerId, useAccount } from "@/features/account/accountStore";
import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { getExamSettings, type ExamSettings, type SubmitResult } from "@/features/exams/examData";
import { NawawiExamRunner, NawawiResult } from "@/features/nawawi/NawawiExamRunner";
import {
  getNawawiAttempt,
  getNawawiOverview,
  nawawiExams,
  type ActiveNawawiAttempt,
  type NawawiOverview,
} from "@/features/nawawi/nawawiExam";
import { useThemeColor } from "@/theme/useThemeColor";

/** The website's RULES for the Nawawi exams. */
const RULES = [
  "أسئلة متنوّعة: أكمل الحديث، والكلمة الناقصة، وراوي الحديث.",
  "الأسئلة تتولّد لك وحدك من نصوص الأحاديث، وتُصحَّح على الخادم.",
  "يُسلَّم الاختبار تلقائيًا عند انتهاء الوقت.",
];

/** A stage's exam (1–4) or the final (5): the rules, then the runner, then the result. */
export default function NawawiExamScreen() {
  const { part: slug } = useLocalSearchParams<{ part: string }>();
  const part = parsePartSlug(slug ?? "");
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();
  const accent = useThemeColor("accent-strong");
  const primary = useThemeColor("primary");
  const muted = useThemeColor("fg-muted");
  const learnerId = activeLearnerId(useAccount());
  const [settings, setSettings] = useState<ExamSettings | null>(null);
  const [loaded, setLoaded] = useState<{ learnerId: string; overview: NawawiOverview | null } | null>(null);
  const [attempt, setAttempt] = useState<ActiveNawawiAttempt | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getExamSettings().then(setSettings);
  }, []);
  useEffect(() => {
    if (!learnerId) return;
    let cancelled = false;
    getNawawiOverview(learnerId).then((overview) => !cancelled && setLoaded({ learnerId, overview }));
    return () => {
      cancelled = true;
    };
  }, [learnerId]);

  const overview = learnerId && loaded?.learnerId === learnerId ? loaded.overview : undefined;

  async function start() {
    if (!part) return;
    setBusy(true);
    setError(null);
    const started = await nawawiExams.start(part);
    if (!started.ok) {
      setBusy(false);
      setError(started.status === 401 ? "سجّل الدخول أولًا." : started.error);
      return;
    }
    const opened = await getNawawiAttempt(started.attemptId);
    setBusy(false);
    if (opened) setAttempt(opened);
    else setError("تعذّر تحميل أسئلة الاختبار، حاول مرة أخرى.");
  }

  if (part && attempt && !result) return <NawawiExamRunner attempt={attempt} onDone={setResult} />;

  const isFinal = part === FINAL_PART;
  const size = part ? examSize(part) : null;
  const missingParts = isFinal && overview ? NAWAWI_PARTS.filter((entry) => overview.parts[entry.id]?.kind !== "passed") : [];

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: insets.bottom + miniPlayer + 32 }}>
      <ScreenHeader title="الأربعون النووية" onBack={() => (router.canGoBack() ? router.back() : router.replace("/nawawi"))} />
      {part && size && (
        <Animated.View entering={enterSoft(0)} className="px-5 pb-5 pt-2">
          <View className="flex-row items-center gap-2">
            <GraduationCap size={16} color={primary} />
            <Text className="font-sans-bold text-sm text-primary">{isFinal ? "الاختبار النهائي" : "اختبار المرحلة"}</Text>
          </View>
          <Text className="mt-2 font-sans-bold text-[28px] leading-10.5 text-fg">
            {isFinal ? partTitle(part) : `اختبار ${partTitle(part)}`}
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {[
              partRange(part),
              `${toArabicDigits(size.questions)} أسئلة`,
              `${toArabicDigits(size.minutes)} دقيقة`,
              `النجاح ${toArabicDigits(settings?.exam_pass_percent ?? 80)}٪`,
            ].map((chip) => (
              <View key={chip} className="rounded-full border border-border px-3 py-1.5">
                <Text className="font-sans-medium text-xs text-fg">{chip}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      )}

      <View className="gap-4 px-4">
        {!part ? (
          <StateMessage message="لم نجد هذا الاختبار." actionLabel="الأربعون النووية" onAction={() => router.replace("/nawawi")} />
        ) : result ? (
          <NawawiResult result={result} part={part} />
        ) : isFinal && overview?.certificate ? (
          <View className="items-center rounded-3xl border border-accent/40 bg-accent-soft p-6">
            <Award size={48} color={accent} />
            <Text className="mt-4 font-sans-bold text-2xl text-fg">أتممت الأربعين النووية</Text>
            <Button
              className="mt-5"
              size="lg"
              onPress={() => router.replace({ pathname: "/certificate/[code]", params: { code: overview.certificate!.verification_code } })}
            >
              عرض الشهادة
            </Button>
          </View>
        ) : (
          <>
            <View className="gap-2 rounded-3xl border border-border bg-surface p-5 shadow-card">
              <View className="mb-1 flex-row items-center gap-2">
                <ListChecks size={18} color={primary} />
                <Text className="font-sans-bold text-base text-fg">قبل أن تبدأ</Text>
              </View>
              {[
                ...RULES,
                isFinal
                  ? `يُفتح بعد اجتياز المراحل الأربع، وتنال بالنجاح فيه شهادة الأربعين النووية. إن لم تنجح أعدته بعد ${toArabicDigits(settings?.retry_cooldown_hours ?? 24)} ساعة.`
                  : "يمكنك إعادة اختبار المرحلة متى شئت حتى تجتازها.",
              ].map((rule) => (
                <Text key={rule} className="font-sans text-sm leading-7 text-fg-muted">
                  • {rule}
                </Text>
              ))}
            </View>
            {error ? <Text className="font-sans text-sm leading-6 text-danger">{error}</Text> : null}
            {!learnerId ? (
              <Button size="lg" onPress={() => router.push("/login")}>
                سجّل الدخول لبدء الاختبار
              </Button>
            ) : missingParts.length > 0 ? (
              <View className="gap-2">
                <View className="flex-row items-center gap-2 self-start rounded-2xl bg-accent-soft px-4 py-3">
                  <Lock size={18} color={accent} />
                  <Text className="font-sans-bold text-sm text-accent-strong">اجتز هذه المراحل أولًا:</Text>
                </View>
                {NAWAWI_PARTS.map((entry) => {
                  const passed = !missingParts.includes(entry);
                  return (
                    <View
                      key={entry.id}
                      className="flex-row items-center justify-between gap-3 rounded-3xl border border-border bg-surface p-4"
                    >
                      <View className="flex-1 flex-row items-center gap-2">
                        {passed ? <CheckCircle2 size={18} color={primary} /> : <Lock size={18} color={muted} />}
                        <Text className="shrink font-sans-bold text-sm text-fg">
                          {entry.title} <Text className="font-sans text-xs text-fg-muted">({partRange(entry.id)})</Text>
                        </Text>
                      </View>
                      {!passed && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onPress={() => router.replace({ pathname: "/nawawi/exam/[part]", params: { part: partSlug(entry.id) } })}
                        >
                          اختبرها
                        </Button>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <>
                <Button size="lg" icon={GraduationCap} onPress={start} disabled={busy || (isFinal && overview === undefined)}>
                  {busy ? "جارٍ تجهيز الاختبار…" : "ابدأ الاختبار"}
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  icon={BookOpen}
                  onPress={() => (router.canGoBack() ? router.back() : router.replace("/nawawi"))}
                >
                  راجع الأحاديث
                </Button>
              </>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}
