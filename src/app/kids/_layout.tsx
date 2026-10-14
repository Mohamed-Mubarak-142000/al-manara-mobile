import { Stack } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

import { useAccount } from "@/features/account/accountStore";
import { ChooseChild, KidsSignIn } from "@/features/kids/ChooseChild";
import { useKidsProgress } from "@/features/kids/progress/progressStore";
import { KidsShell } from "@/features/kids/ui/KidsShell";
import { KidsError, KidsLoading } from "@/features/kids/ui/KidsStatus";
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
      <View className="flex-1 justify-center px-3 pb-20">
        <KidsLoading />
      </View>
    );
  else if (account.status !== "signed-in") content = <KidsSignIn />;
  else if (!childId)
    content = (
      <ChooseChild
        childLearners={account.learners.filter((entry) => entry.kind === "child").map(({ id, display_name }) => ({ id, display_name }))}
      />
    );
  else if (status === "loading")
    content = (
      <View className="flex-1 justify-center px-3 pb-20">
        <KidsLoading label="لحظة… نجهّز رحلتك" />
      </View>
    );
  else if (status === "error")
    content = (
      <View className="px-3 pt-4">
        <KidsError title="تعذّر تحميل رحلتك الآن" message="تأكد من الاتصال بالإنترنت، ثم حاول مرة أخرى." onRetry={retry} />
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
