import { router } from "expo-router";
import { BookMarked, Check, CloudUpload, LogIn, Mail, ShieldCheck } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { useAccount } from "@/features/account/accountStore";
import { GoogleButton } from "@/features/account/AuthLayout";
import { StepLayout } from "@/features/onboarding/OnboardingStep";
import { useThemeColor } from "@/theme/useThemeColor";

const PERKS = [
  { icon: BookMarked, text: "ختمتك وخطة حفظك محفوظة على حسابك" },
  { icon: CloudUpload, text: "تقدّمك يبقى معك لو غيّرت هاتفك" },
  { icon: ShieldCheck, text: "رحلتك وشهاداتك ودعمك للمنارة في مكان واحد" },
];

/**
 * Right after the welcome screen, so the khatma made at the end of onboarding is saved to the account.
 * Login and register are modals that go back here on success; "متابعة كضيف" (the screen's bottom
 * button) is the only way past without an account. `onSignedIn` moves on once a sign-in lands here.
 */
export function AccountStep({ onSignedIn }: { onSignedIn: () => void }) {
  const state = useAccount();
  const gold = useThemeColor("gold-soft");
  const signedIn = state.status === "signed-in";
  // Only a sign-in made on this step moves on by itself; coming back to it while signed in stays put.
  const wasSignedIn = useRef(signedIn);

  useEffect(() => {
    if (!signedIn || wasSignedIn.current) return;
    wasSignedIn.current = true;
    const id = setTimeout(onSignedIn, 900);
    return () => clearTimeout(id);
  }, [onSignedIn, signedIn]);

  if (signedIn) {
    const name = state.profile?.full_name?.trim() || state.email;
    return (
      <StepLayout icon={Check} eyebrow="حسابك" title="أهلًا بك في المنارة" subtitle="كل ما تحفظه من الآن يُحفظ على حسابك.">
        <View className="items-center gap-2 rounded-2xl border border-gold/30 bg-gold/10 p-5">
          <Text className="font-display-bold text-lg text-white">{name}</Text>
          <Text className="font-sans text-xs text-white/70">تم تسجيل الدخول ✓</Text>
        </View>
      </StepLayout>
    );
  }

  return (
    <StepLayout icon={CloudUpload} eyebrow="حسابك" title="احفظ تقدّمك في حسابك" subtitle="حساب مجاني يحفظ كل شيء لك، ويمكنك المتابعة كضيف.">
      <View className="gap-2.5">
        {PERKS.map(({ icon: Icon, text }) => (
          <View key={text} className="flex-row items-center gap-3">
            <Icon size={18} color={gold} />
            <Text className="flex-1 font-sans text-sm leading-6 text-white/85">{text}</Text>
          </View>
        ))}
      </View>
      <GoogleButton onDone={() => {}} />
      <Button variant="gold" size="lg" icon={Mail} onPress={() => router.push("/register")}>
        إنشاء حساب بالبريد
      </Button>
      <Button variant="light" icon={LogIn} onPress={() => router.push("/login")}>
        لديّ حساب بالفعل
      </Button>
    </StepLayout>
  );
}
