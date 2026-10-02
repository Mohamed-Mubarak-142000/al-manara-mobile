import { router } from "expo-router";
import { BookOpen, CalendarRange, Check, ChevronLeft, ChevronRight, Flame, Lock, Trophy } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StateMessage } from "@/components/ui/StateMessage";
import { formatDay } from "@/features/khatma/CreateKhatmaForm";
import { getSurahs, mushafStarts } from "@/features/mushaf/mushaf";
import { CreatePlanForm } from "@/features/plan/CreatePlanForm";
import { planActions, usePlan } from "@/features/plan/planStore";
import { buildTodayView, type PageLink } from "@/features/plan/view";
import { useThemeColor } from "@/theme/useThemeColor";

const HALF: Record<PageLink["half"], string> = { full: "", first: " (النصف الأول)", second: " (النصف الثاني)" };

function openPage(page: number) {
  router.push({ pathname: "/mushaf", params: { page: String(page) } });
}

function PageRow({ link }: { link: PageLink }) {
  const muted = useThemeColor("fg-muted");
  return (
    <Pressable accessibilityRole="button" onPress={() => openPage(link.page)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <View className="flex-row items-center justify-between rounded-2xl border border-border bg-bg px-3 py-2.5">
        <Text className="font-sans-semibold text-sm text-fg">
          صفحة {toArabicDigits(link.page)}
          {HALF[link.half]} · {link.surahName}
        </Text>
        <ChevronLeft size={16} color={muted} />
      </View>
    </Pressable>
  );
}

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const heroFg = useThemeColor("hero-fg");
  const gold = useThemeColor("gold-soft");
  const primary = useThemeColor("primary");
  const state = usePlan();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const names = Object.fromEntries(getSurahs().map((surah) => [surah.number, surah.name]));
  const view = state.status === "ready" && state.current ? buildTodayView(state.current, mushafStarts().pageStarts, names) : null;

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (!result.ok) setError(result.error ?? null);
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
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
        <View className="flex-row items-center gap-2">
          <CalendarRange size={16} color={gold} />
          <Text className="font-sans-bold text-sm text-gold-soft">خطة الحفظ</Text>
        </View>
        <Text className="mt-2 font-display-bold text-3xl text-hero-fg">
          {view
            ? view.kind === "memorize"
              ? `حفظ الأجزاء ${toArabicDigits(view.startJuz ?? 0)}–${toArabicDigits(view.endJuz ?? 0)}`
              : "تثبيت الحفظ"
            : "وردك اليومي"}
        </Text>
        <Text className="mt-1 font-sans text-sm leading-6 text-white/70">
          {view
            ? view.kind === "memorize"
              ? `${view.dailyLabel} · ${view.newDays.label}`
              : `${view.reviewLabel} مراجعة · ${view.reviewDays.label}`
            : "خطة حفظ ومراجعة على أيامك، ونخبرك كل يوم بوردك."}
        </Text>
        {view?.kind === "memorize" && (
          <View className="mt-4">
            <ProgressBar tone="light" value={view.percent / 100} />
            <Text className="mt-1 font-sans text-xs text-white/60">
              {toArabicDigits(view.pagesDone)} من {toArabicDigits(view.totalPages)} صفحة ({toArabicDigits(view.percent)}٪)
            </Text>
          </View>
        )}
      </View>

      <View className="gap-4 px-4 pt-5">
        {state.status === "loading" ? (
          <StateMessage loading />
        ) : state.status === "guest" ? (
          <View className="items-center rounded-3xl border border-border bg-surface p-6">
            <Lock size={28} color={primary} />
            <Text className="mt-3 text-center font-sans text-base leading-7 text-fg">
              خطة الحفظ مرتبطة بحسابك، لتتابعها على الموقع والتطبيق وتفتح لك اختبارات الأجزاء.
            </Text>
            <Button className="mt-4" onPress={() => router.push("/login")}>
              تسجيل الدخول
            </Button>
          </View>
        ) : !view ? (
          <CreatePlanForm />
        ) : (
          <>
            {view.status === "completed" && (
              <View className="items-center rounded-3xl border border-gold/40 bg-accent-soft p-6">
                <Trophy size={40} color={gold} />
                <Text className="mt-3 font-display-bold text-2xl text-fg">أتممت خطتك، بارك الله فيك</Text>
                <Text className="mt-1 text-center font-sans text-sm text-fg-muted">اختبر حفظك الآن واحصل على شهادات الأجزاء.</Text>
                <Button className="mt-4" variant="gold" onPress={() => router.push("/exams")}>
                  اختبارات الأجزاء
                </Button>
              </View>
            )}

            {view.newPortion && (
              <View className="gap-3 rounded-3xl border border-border bg-surface p-5 shadow-soft">
                <Text className="font-sans-bold text-sm text-accent-strong">
                  {view.newPortion.done ? "حفظت ورد اليوم" : view.newDays.today ? "حفظ اليوم" : `حفظك القادم ${view.newDays.next ?? ""}`}
                </Text>
                {view.newPortion.parts?.map((part) => (
                  <Pressable key={`${part.page}-${part.half}`} accessibilityRole="button" onPress={() => openPage(part.page)}>
                    <View className="gap-1 rounded-2xl bg-primary-soft p-3">
                      <Text className="font-display-bold text-base text-fg">
                        صفحة {toArabicDigits(part.page)}
                        {HALF[part.half]}
                      </Text>
                      <Text className="font-sans text-sm text-fg-muted">
                        {part.spans.map((span) => `${span.surahName} ${toArabicDigits(span.from)}–${toArabicDigits(span.to)}`).join("، ")}
                      </Text>
                      {part.opening ? <Text className="font-quran text-lg leading-9 text-fg">{part.opening}</Text> : null}
                    </View>
                  </Pressable>
                ))}
                {!view.newPortion.done && (
                  <Button icon={Check} onPress={() => run(planActions.completeNew)} disabled={busy}>
                    حفظت ورد اليوم
                  </Button>
                )}
              </View>
            )}

            {(view.recent.length > 0 || view.far.length > 0) && (
              <View className="gap-3 rounded-3xl border border-border bg-surface p-5">
                <Text className="font-sans-bold text-sm text-accent-strong">
                  {view.reviewDone
                    ? "راجعت اليوم"
                    : view.reviewDays.today
                      ? "مراجعة اليوم"
                      : `مراجعتك القادمة ${view.reviewDays.next ?? ""}`}
                </Text>
                {view.recent.length > 0 && (
                  <>
                    <Text className="font-sans-semibold text-xs text-fg-muted">القريب: ما حفظته في آخر الأيام</Text>
                    {view.recent.map((link) => (
                      <PageRow key={`r-${link.page}-${link.half}`} link={link} />
                    ))}
                  </>
                )}
                {view.far.length > 0 && (
                  <>
                    <Text className="font-sans-semibold text-xs text-fg-muted">البعيد: ما حفظته سابقًا</Text>
                    {view.far.map((link) => (
                      <PageRow key={`f-${link.page}`} link={link} />
                    ))}
                  </>
                )}
                {!view.reviewDone && (
                  <Button variant="outline" icon={BookOpen} onPress={() => run(planActions.completeReview)} disabled={busy}>
                    أتممت المراجعة
                  </Button>
                )}
              </View>
            )}

            <View className="flex-row gap-3">
              <View className="flex-1 items-center rounded-3xl border border-border bg-surface p-4">
                <Flame size={22} color={primary} />
                <Text className="mt-1 font-display-bold text-xl text-fg">{toArabicDigits(view.streak)}</Text>
                <Text className="font-sans text-xs text-fg-muted">أيام متتالية</Text>
              </View>
              {view.finishDay && (
                <View className="flex-1 items-center rounded-3xl border border-border bg-surface p-4">
                  <CalendarRange size={22} color={primary} />
                  <Text className="mt-1 text-center font-display-bold text-sm text-fg">{formatDay(view.finishDay)}</Text>
                  <Text className="font-sans text-xs text-fg-muted">موعد الختم المتوقع</Text>
                </View>
              )}
            </View>
            {error ? <Text className="text-center font-sans text-sm text-danger">{error}</Text> : null}
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onPress={() => (confirmArchive ? run(planActions.archive).then(() => setConfirmArchive(false)) : setConfirmArchive(true))}
            >
              {confirmArchive ? "اضغط مرة أخرى لتأكيد إنهاء الخطة" : "إنهاء الخطة وإنشاء خطة جديدة"}
            </Button>
          </>
        )}
      </View>
    </ScrollView>
  );
}
