import { router } from "expo-router";
import { ArrowRight, Baby, LogIn, UserPlus } from "lucide-react-native";
import { View } from "react-native";

import { account, type Learner } from "@/features/account/accountStore";

import { KidsButton } from "./ui/KidsButton";
import { KidsPanel, KidsText } from "./ui/KidsPanel";
import { KidsScroll } from "./ui/KidsScroll";
import { KIDS } from "./ui/kidsStyles";

/**
 * Shown instead of the kids pages while the account holder (not a child) is selected: the kids area records
 * progress per child, so one of them has to be picked first.
 */
export function ChooseChild({ childLearners }: { childLearners: Pick<Learner, "id" | "display_name">[] }) {
  return (
    <KidsScroll>
      <KidsPanel className="items-center">
        <Baby size={56} color={KIDS.sky} />
        <KidsText size={28} bold center className="mt-3">
          حديقة القرآن لأطفالك
        </KidsText>
        {childLearners.length > 0 ? (
          <>
            <KidsText size={17} tone="muted" center className="mt-2">
              اختر طفلك لتُحفظ ألعابه ونجومه وتقدّمه في حسابه.
            </KidsText>
            <View className="mt-6 flex-row flex-wrap justify-center gap-3">
              {childLearners.map((child) => (
                <KidsButton key={child.id} tone="sky" onPress={() => account.chooseLearner(child.id)}>
                  {child.display_name}
                </KidsButton>
              ))}
            </View>
          </>
        ) : (
          <>
            <KidsText size={17} tone="muted" center className="mt-2">
              أضف طفلك من صفحة حسابك أولًا، ثم افتح له الحديقة.
            </KidsText>
            <KidsButton tone="emerald" icon={UserPlus} className="mt-6" onPress={() => router.push("/account")}>
              أضف طفلًا
            </KidsButton>
          </>
        )}
        <BackToJourney />
      </KidsPanel>
    </KidsScroll>
  );
}

function BackToJourney() {
  return (
    <KidsButton tone="white" size="sm" icon={ArrowRight} className="mt-5" onPress={() => router.dismissTo("/journey")}>
      العودة إلى رحلتي
    </KidsButton>
  );
}

/** The website sends a signed-out visitor to sign in (requireSession); the app asks on the spot. */
export function KidsSignIn() {
  return (
    <KidsScroll>
      <KidsPanel className="items-center">
        <Baby size={56} color={KIDS.sky} />
        <KidsText size={28} bold center className="mt-3">
          حديقة القرآن للأطفال
        </KidsText>
        <KidsText size={17} tone="muted" center className="mt-2">
          سجّل الدخول وأضف طفلك، لتُحفظ ألعابه ونجومه وتقدّمه في حسابك.
        </KidsText>
        <KidsButton tone="emerald" icon={LogIn} className="mt-6" onPress={() => router.push("/login")}>
          تسجيل الدخول
        </KidsButton>
      </KidsPanel>
    </KidsScroll>
  );
}
