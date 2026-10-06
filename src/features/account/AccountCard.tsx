import { router } from "expo-router";
import { BookOpenCheck, LogOut, Settings, UserRound } from "lucide-react-native";
import { Alert, Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { unregisterPushToken } from "@/features/notifications/usePushRegistration";
import { useThemeColor } from "@/theme/useThemeColor";

import { account, useAccount } from "./accountStore";

/** Tries to send waiting offline progress first; asks before leaving with some still unsent. */
async function signOut() {
  const left = await account.syncBeforeSignOut();
  const leave = () => unregisterPushToken().finally(() => account.signOut({ synced: true }));
  if (left === 0) return leave();
  Alert.alert("لديك تقدّم لم يُزامن بعد", "إذا خرجت الآن فسيُزامن عند تسجيل دخولك مرة أخرى بنفس الحساب.", [
    { text: "إلغاء", style: "cancel" },
    { text: "خروج على أي حال", style: "destructive", onPress: () => void leave() },
  ]);
}

/** Guest → a sign-in invitation; signed in → who, which learner, and sign-out. */
export function AccountCard() {
  const state = useAccount();
  const primary = useThemeColor("primary");
  const muted = useThemeColor("fg-muted");

  if (state.status === "loading" || (state.status === "guest" && !state.configured)) return null;

  if (state.status === "guest") {
    return (
      <View className="rounded-3xl border border-border bg-surface p-4 shadow-soft">
        <View className="flex-row items-center gap-3">
          <View className="size-11 items-center justify-center rounded-2xl bg-primary-soft">
            <UserRound size={22} color={primary} />
          </View>
          <View className="flex-1">
            <Text className="font-display-bold text-base text-fg">أنت تستخدم التطبيق كضيف</Text>
            <Text className="font-sans text-xs leading-5 text-fg-muted">سجّل الدخول بحساب الموقع لمزامنة تقدمك.</Text>
          </View>
        </View>
        <Button className="mt-4" onPress={() => router.push("/login")}>
          تسجيل الدخول
        </Button>
      </View>
    );
  }

  const name = state.activeLearner?.display_name ?? state.profile?.full_name ?? state.email;
  return (
    <View className="rounded-3xl border border-border bg-surface p-4 shadow-soft">
      <View className="flex-row items-center gap-3">
        <View className="size-11 items-center justify-center rounded-full bg-primary">
          <Text className="font-display-bold text-lg text-on-primary">{name.slice(0, 1)}</Text>
        </View>
        <View className="flex-1">
          <Text className="font-display-bold text-base text-fg">{name}</Text>
          <Text className="font-sans text-xs text-fg-muted">{state.email}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="تسجيل الخروج"
          onPress={() => void signOut()}
          hitSlop={10}
          className="p-2"
        >
          <LogOut size={20} color={muted} />
        </Pressable>
      </View>
      {state.learners.length > 1 && (
        <View className="mt-4 flex-row flex-wrap gap-2">
          {state.learners.map((learner) => {
            const active = learner.id === state.activeLearner?.id;
            return (
              <Pressable
                key={learner.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => account.chooseLearner(learner.id)}
                className={`rounded-full border px-3 py-1.5 ${active ? "border-primary bg-primary" : "border-border bg-bg"}`}
              >
                <Text className={`font-sans-bold text-xs ${active ? "text-on-primary" : "text-fg"}`}>{learner.display_name}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      <View className="mt-4 flex-row gap-2">
        <Button size="sm" variant="outline" icon={BookOpenCheck} className="flex-1" onPress={() => router.push("/journey")}>
          رحلتي
        </Button>
        <Button size="sm" variant="outline" icon={Settings} className="flex-1" onPress={() => router.push("/account")}>
          إعدادات الحساب
        </Button>
      </View>
    </View>
  );
}
