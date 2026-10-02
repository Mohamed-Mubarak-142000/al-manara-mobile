import { router } from "expo-router";
import { LogOut, UserRound } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { useThemeColor } from "@/theme/useThemeColor";

import { account, useAccount } from "./accountStore";

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
        <Pressable accessibilityRole="button" accessibilityLabel="تسجيل الخروج" onPress={account.signOut} hitSlop={10} className="p-2">
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
    </View>
  );
}
