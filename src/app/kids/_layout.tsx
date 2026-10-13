import { Stack } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { useAccount } from "@/features/account/accountStore";
import { ChooseChild, KidsSignIn } from "@/features/kids/ChooseChild";
import { useKidsProgress } from "@/features/kids/progress/progressStore";
import { KidsButton } from "@/features/kids/ui/KidsButton";
import { KidsPanel, KidsText } from "@/features/kids/ui/KidsPanel";
import { KidsShell } from "@/features/kids/ui/KidsShell";
import { KIDS } from "@/features/kids/ui/kidsStyles";

/**
 * The website's /kids layout: "حديقة القرآن للأطفال". Children only — an account must be signed in with one
 * of its children selected, so every game, star and badge is saved to that child in the database.
 */
export default function KidsLayout() {
  const account = useAccount();
  const { status, retry, connect } = useKidsProgress();
  const learner = account.status === "signed-in" ? account.activeLearner : null;
  const childId = learner?.kind === "child" ? learner.id : null;

  useEffect(() => {
    connect(childId);
  }, [childId, connect]);

  let content;
  if (account.status === "loading")
    content = (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={KIDS.white} size="large" />
      </View>
    );
  else if (account.status !== "signed-in") content = <KidsSignIn />;
  else if (!childId)
    content = <ChooseChild childLearners={account.learners.filter((entry) => entry.kind === "child").map(({ id, display_name }) => ({ id, display_name }))} />;
  else if (status === "loading")
    content = (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={KIDS.white} size="large" />
      </View>
    );
  else if (status === "error")
    content = (
      <View className="px-3 pt-4">
        <KidsPanel className="items-center">
          <KidsText size={22} bold center>
            تعذّر تحميل رحلتك الآن
          </KidsText>
          <KidsText size={16} tone="muted" center className="mt-2">
            تأكد من الاتصال بالإنترنت، ثم حاول مرة أخرى.
          </KidsText>
          <KidsButton tone="emerald" className="mt-5" onPress={retry}>
            حاول مرة أخرى
          </KidsButton>
        </KidsPanel>
      </View>
    );
  else
    content = (
      <Stack screenOptions={{ headerShown: false, animation: "fade", contentStyle: { backgroundColor: "transparent" } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />
      </Stack>
    );

  return (
    <View style={{ flex: 1, backgroundColor: KIDS.grass }}>
      <KidsShell isChild={!!childId}>{content}</KidsShell>
    </View>
  );
}
