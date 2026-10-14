import { router } from "expo-router";
import { Award, ChevronLeft } from "lucide-react-native";
import { useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toArabicDigits } from "@/core/text/arabic";
import { PageHeader } from "@/components/ui/PageHeader";
import { StateMessage } from "@/components/ui/StateMessage";
import { useAccount } from "@/features/account/accountStore";
import { certificateSubject } from "@/features/exams/CertificateCard";
import { getMyCertificates } from "@/features/exams/examData";
import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { useThemeColor } from "@/theme/useThemeColor";

type Row = NonNullable<Awaited<ReturnType<typeof getMyCertificates>>>[number];

/** Certificates of every learner on the account (a parent sees their children's too). */
export default function CertificatesScreen() {
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();
  const gold = useThemeColor("accent-strong");
  const muted = useThemeColor("fg-muted");
  const account = useAccount();
  const learnerIds = account.status === "signed-in" ? account.learners.map((learner) => learner.id) : [];
  const key = learnerIds.join(",");
  const accent = useThemeColor("accent");
  const signedIn = account.status === "signed-in";
  const [rows, setRows] = useState<{ key: string; list: Row[] | null } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    getMyCertificates(key ? key.split(",") : []).then((list) => !cancelled && setRows({ key, list }));
    return () => {
      cancelled = true;
    };
  }, [key, signedIn, attempt]);

  /** undefined: loading; null: failed to load. */
  const list = rows?.key === key ? rows.list : undefined;

  function retry() {
    setRows(null);
    setAttempt((value) => value + 1);
  }

  return (
    <FlatList
      className="flex-1 bg-bg"
      data={list ?? []}
      keyExtractor={(row) => row.verification_code}
      refreshControl={
        signedIn ? (
          <RefreshControl refreshing={false} onRefresh={() => setAttempt((value) => value + 1)} tintColor={accent} colors={[accent]} />
        ) : undefined
      }
      contentContainerStyle={{ paddingBottom: insets.bottom + miniPlayer + 32 }}
      ListHeaderComponent={
        <PageHeader back kicker="الشهادات" icon={Award} title="شهاداتي" description="شهادات الأجزاء والأربعين النووية، موثّقة برمز تحقق." />
      }
      ListEmptyComponent={
        account.status === "loading" ? (
          <StateMessage loading />
        ) : !signedIn ? (
          <StateMessage
            message="سجّل الدخول لترى شهاداتك، وتحفظها في حسابك."
            actionLabel="تسجيل الدخول"
            onAction={() => router.push("/login")}
          />
        ) : list === undefined ? (
          <StateMessage loading />
        ) : list === null ? (
          <StateMessage message="تعذّر تحميل شهاداتك الآن، حاول بعد قليل." onRetry={retry} />
        ) : (
          <StateMessage
            message="لا توجد شهادات بعد. اجتز اختبار أي جزء، أو أتمّ الأربعين النووية، لتحصل على أول شهادة."
            actionLabel="الأربعون النووية"
            onAction={() => router.push("/nawawi")}
          />
        )
      }
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: "/certificate/[code]", params: { code: item.verification_code } })}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
        >
          <View className="mx-4 mb-3 flex-row items-center gap-3 rounded-3xl border border-border bg-surface px-4 py-3.5">
            <View className="size-11 items-center justify-center rounded-2xl bg-accent-soft">
              <Award size={22} color={gold} />
            </View>
            <View className="flex-1">
              <Text className="font-sans-bold text-base text-fg">{certificateSubject(item.juz)}</Text>
              <Text className="font-sans text-xs text-fg-muted">
                {item.holder_name} · {toArabicDigits(item.score)}/{toArabicDigits(item.total)}
              </Text>
            </View>
            <ChevronLeft size={18} color={muted} />
          </View>
        </Pressable>
      )}
    />
  );
}
