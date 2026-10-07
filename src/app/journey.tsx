import { router } from "expo-router";
import { Award, BookOpenCheck, CalendarRange, ChevronRight, Flame, GraduationCap, Lock, Medal, Mic, Repeat } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StateMessage } from "@/components/ui/StateMessage";
import { activeLearnerId, useAccount } from "@/features/account/accountStore";
import { useAsync } from "@/features/hadith/useAsync";
import { REVIEW_INTERVALS_DAYS, loadJourney, markSurahReviewed, type ReviewRow } from "@/features/journey/progress";
import { ContinueReadingCard } from "@/features/mushaf/ContinueReadingCard";
import { getSurah } from "@/features/mushaf/mushaf";
import { StreakCard } from "@/features/streak/StreakCard";
import { useNow } from "@/features/time/useNow";
import { useThemeColor } from "@/theme/useThemeColor";

const DAY_MS = 24 * 60 * 60 * 1000;

function inDays(days: number): string {
  if (days <= 1) return "يوم";
  if (days === 2) return "يومين";
  return `${toArabicDigits(days)} ${days <= 10 ? "أيام" : "يومًا"}`;
}

function Stat({ icon: Icon, value, label }: { icon: typeof Flame; value: number; label: string }) {
  const primary = useThemeColor("primary");
  return (
    <View className="w-[48.5%] items-center rounded-3xl border border-border bg-surface p-4">
      <Icon size={22} color={primary} />
      <Text className="mt-1 font-display-bold text-2xl text-fg">{toArabicDigits(value)}</Text>
      <Text className="text-center font-sans text-xs text-fg-muted">{label}</Text>
    </View>
  );
}

/** The website's /dashboard ("رحلتي"): memorization per juz, reviews due, tasmee and certificates. */
export default function JourneyScreen() {
  const insets = useSafeAreaInsets();
  const heroFg = useThemeColor("hero-fg");
  const primary = useThemeColor("primary");
  const account = useAccount();
  const learnerId = activeLearnerId(account);
  const name = account.status === "signed-in" ? account.activeLearner?.display_name : null;
  const { state, reload } = useAsync(learnerId ?? "guest", () => (learnerId ? loadJourney(learnerId) : Promise.resolve(null)));
  const [reviewed, setReviewed] = useState<Set<number>>(new Set());

  const journey = state.status === "ready" ? state.data : null;
  const now = useNow(60_000).getTime();
  const due = journey?.reviews.filter((review) => new Date(review.due_at).getTime() <= now && !reviewed.has(review.surah)) ?? [];
  const nextReview = journey?.reviews.find((review) => new Date(review.due_at).getTime() > now);

  async function review(row: ReviewRow) {
    if (!learnerId) return;
    if (await markSurahReviewed(learnerId, row)) setReviewed((current) => new Set(current).add(row.surah));
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
        <Text className="font-sans-bold text-sm text-gold-soft">رحلتي</Text>
        <Text className="mt-2 font-display-bold text-3xl leading-[46px] text-hero-fg">
          {name ? `رحلة ${name} مع القرآن` : "رحلتك مع القرآن"}
        </Text>
        <Text className="mt-1 font-sans text-sm leading-6 text-white/75">
          ما حفظته في كل جزء، ومكان قراءتك، وتسميعك، واختباراتك وشهاداتك — محفوظة في حسابك.
        </Text>
      </View>

      <View className="gap-4 px-4 pt-5">
        {/* Kept on the phone, so guests see it too. */}
        <StreakCard />
        {!learnerId ? (
          <View className="items-center rounded-3xl border border-border bg-surface p-6">
            <Lock size={28} color={primary} />
            <Text className="mt-3 text-center font-sans text-base leading-7 text-fg">رحلتك تُحفظ في حسابك لتراها على الموقع والتطبيق.</Text>
            <Button className="mt-4" onPress={() => router.push("/login")}>
              تسجيل الدخول
            </Button>
          </View>
        ) : state.status === "loading" ? (
          <StateMessage loading />
        ) : !journey ? (
          <StateMessage message="تعذّر مزامنة تقدّمك الآن، حاول مجددًا بعد قليل." onRetry={reload} />
        ) : (
          <>
            <View className="flex-row flex-wrap justify-between gap-y-3">
              <Stat icon={BookOpenCheck} value={journey.memorizedAyahs} label="آية محفوظة من ٦٢٣٦" />
              <Stat icon={Flame} value={journey.streak} label="أيام متتالية" />
              <Stat icon={Award} value={journey.certificates} label="شهادة أجزاء" />
              <Stat icon={Medal} value={journey.badges} label="شارة" />
            </View>

            <ContinueReadingCard />

            <View className="flex-row gap-3">
              <Button variant="outline" icon={CalendarRange} className="flex-1" onPress={() => router.push("/plan")}>
                خطة الحفظ
              </Button>
              <Button variant="outline" icon={Mic} className="flex-1" onPress={() => router.push("/tasmee")}>
                سمّع لنفسك
              </Button>
            </View>

            <View className="gap-3 rounded-3xl border border-border bg-surface p-4">
              <View className="flex-row items-center justify-between">
                <Text className="font-display-bold text-lg text-fg">مراجعة اليوم</Text>
                {due.length > 0 && (
                  <Text className="font-sans-bold text-xs text-accent-strong">
                    {toArabicDigits(due.length)} {due.length > 2 ? "سور" : "سورة"}
                  </Text>
                )}
              </View>
              {journey.reviews.length === 0 ? (
                <Text className="font-sans text-sm leading-6 text-fg-muted">
                  عندما تُتمّ حفظ سورة كاملة نضع لها جدول مراجعة تلقائيًا (بعد يوم، ثم ٣ أيام، ثم أسبوع…) حتى تثبت في حفظك.
                </Text>
              ) : due.length === 0 ? (
                <Text className="font-sans text-sm leading-6 text-fg-muted">
                  لا مراجعات اليوم، أحسنت!
                  {nextReview
                    ? ` المراجعة القادمة: سورة ${getSurah(nextReview.surah)?.name ?? ""} بعد ${inDays(Math.ceil((new Date(nextReview.due_at).getTime() - now) / DAY_MS))}.`
                    : ""}
                </Text>
              ) : (
                due.map((row) => {
                  const late = Math.floor((now - new Date(row.due_at).getTime()) / DAY_MS);
                  return (
                    <View key={row.surah} className="gap-2 rounded-2xl bg-bg p-3">
                      <View className="flex-row items-center justify-between">
                        <Text className="font-display-bold text-base text-fg">سورة {getSurah(row.surah)?.name}</Text>
                        <Text className="font-sans text-xs text-fg-muted">
                          المراجعة {toArabicDigits(row.interval_index + 1)} من {toArabicDigits(REVIEW_INTERVALS_DAYS.length)}
                          {late >= 1 ? ` · متأخرة ${inDays(late)}` : ""}
                        </Text>
                      </View>
                      <View className="flex-row flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          icon={Mic}
                          onPress={() => router.push({ pathname: "/tasmee/[surah]", params: { surah: String(row.surah) } })}
                        >
                          سمّع
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onPress={() =>
                            router.push({ pathname: "/mushaf", params: { page: String(getSurah(row.surah)?.startPage ?? 1) } })
                          }
                        >
                          اقرأ
                        </Button>
                        <Button size="sm" icon={Repeat} onPress={() => review(row)}>
                          راجعتها
                        </Button>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            <Text className="mt-2 font-display-bold text-lg text-fg">حفظك في الأجزاء الثلاثين</Text>
            <View className="flex-row flex-wrap justify-between gap-y-2.5">
              {journey.juz.map((juz) => (
                <Pressable
                  key={juz.juz}
                  accessibilityRole="button"
                  onPress={() =>
                    juz.certificateCode
                      ? router.push({ pathname: "/certificate/[code]", params: { code: juz.certificateCode } })
                      : router.push({ pathname: "/exams/[juz]", params: { juz: String(juz.juz) } })
                  }
                  className="w-[48.5%]"
                >
                  <View
                    className={`gap-1.5 rounded-2xl border p-3 ${juz.certificateCode ? "border-gold/50 bg-accent-soft" : "border-border bg-surface"}`}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="font-display-bold text-sm text-fg">الجزء {toArabicDigits(juz.juz)}</Text>
                      {juz.certificateCode ? (
                        <Award size={16} color={primary} />
                      ) : juz.lastFailed ? (
                        <Text className="font-sans-bold text-[10px] text-danger">أعد المحاولة</Text>
                      ) : juz.percent === 100 ? (
                        <GraduationCap size={16} color={primary} />
                      ) : null}
                    </View>
                    <ProgressBar value={juz.percent / 100} />
                    <Text className="font-sans text-[11px] text-fg-muted">
                      {toArabicDigits(juz.percent)}٪ — {toArabicDigits(juz.memorized)} من {toArabicDigits(juz.total)} آية
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <View className="gap-2 rounded-3xl border border-border bg-surface p-4">
              <Text className="font-display-bold text-base text-fg">آخر جلسات التسميع</Text>
              {journey.tasmee.length === 0 ? (
                <Text className="font-sans text-sm text-fg-muted">لم تسمّع بعد.</Text>
              ) : (
                journey.tasmee.map((session) => (
                  <View key={session.id} className="flex-row items-center justify-between border-t border-border pt-2">
                    <Text className="font-sans-bold text-sm text-fg">
                      سورة {getSurah(session.surah)?.name} {toArabicDigits(session.ayah_from)}–{toArabicDigits(session.ayah_to)}
                    </Text>
                    <Text className="font-sans text-xs text-fg-muted">
                      {toArabicDigits(session.correct)} صحيحة · {toArabicDigits(session.mistakes)} للمراجعة
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}
