import { router } from "expo-router";
import { Award, ChevronLeft, ChevronRight } from "lucide-react-native";
import { useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toArabicDigits } from "@/core/text/arabic";
import { StateMessage } from "@/components/ui/StateMessage";
import { useAccount } from "@/features/account/accountStore";
import { getMyCertificates } from "@/features/exams/examData";
import { juzOrdinal } from "@/features/exams/juzNames";
import { useThemeColor } from "@/theme/useThemeColor";

type Row = Awaited<ReturnType<typeof getMyCertificates>>[number];

/** Certificates of every learner on the account (a parent sees their children's too). */
export default function CertificatesScreen() {
  const insets = useSafeAreaInsets();
  const heroFg = useThemeColor("hero-fg");
  const gold = useThemeColor("gold");
  const muted = useThemeColor("fg-muted");
  const account = useAccount();
  const learnerIds = account.status === "signed-in" ? account.learners.map((learner) => learner.id) : [];
  const key = learnerIds.join(",");
  const [rows, setRows] = useState<{ key: string; list: Row[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyCertificates(key ? key.split(",") : []).then((list) => !cancelled && setRows({ key, list }));
    return () => {
      cancelled = true;
    };
  }, [key]);

  const list = rows?.key === key ? rows.list : null;

  return (
    <FlatList
      className="flex-1 bg-bg"
      data={list ?? []}
      keyExtractor={(row) => row.verification_code}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      ListHeaderComponent={
        <View className="mb-4 rounded-b-[32px] bg-hero px-5 pb-6" style={{ paddingTop: insets.top + 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="رجوع"
            onPress={() => router.back()}
            hitSlop={12}
            className="mb-3 self-start p-1"
          >
            <ChevronRight size={26} color={heroFg} />
          </Pressable>
          <Text className="font-display-bold text-3xl text-hero-fg">شهاداتي</Text>
          <Text className="mt-1 font-sans text-sm text-white/70">شهادات الأجزاء التي أتممتها، موثّقة برمز تحقق.</Text>
        </View>
      }
      ListEmptyComponent={
        list ? <StateMessage message="لا توجد شهادات بعد. اجتز اختبار أي جزء لتحصل على شهادته." /> : <StateMessage loading />
      }
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: "/certificate/[code]", params: { code: item.verification_code } })}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <View className="mx-4 mb-2.5 flex-row items-center gap-3 rounded-2xl border border-gold/40 bg-accent-soft px-4 py-3">
            <Award size={26} color={gold} />
            <View className="flex-1">
              <Text className="font-display-bold text-base text-fg">الجزء {juzOrdinal(item.juz)}</Text>
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
