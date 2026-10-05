import { router } from "expo-router";
import { Cloud, LogIn } from "lucide-react-native";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { useAccount } from "@/features/account/accountStore";
import { useThemeColor } from "@/theme/useThemeColor";

/** For guests on the home screen: what a free account adds, with sign-in and sign-up. Gone once signed in. */
export function GuestSignInCard() {
  const state = useAccount();
  const primary = useThemeColor("primary");
  if (state.status !== "guest" || !state.configured) return null;

  return (
    <View className="rounded-3xl border border-gold/30 bg-surface p-4 shadow-soft">
      <View className="flex-row items-center gap-3">
        <View className="size-11 items-center justify-center rounded-2xl bg-primary-soft">
          <Cloud size={22} color={primary} />
        </View>
        <View className="flex-1">
          <Text className="font-display-bold text-base text-fg">احفظ رحلتك مع القرآن</Text>
          <Text className="font-sans text-xs leading-5 text-fg-muted">
            حساب مجاني يحفظ ختمتك وحفظك على هاتفك والموقع معًا، ويفتح لك الاختبارات والشهادات.
          </Text>
        </View>
      </View>
      <View className="mt-4 flex-row gap-2">
        <Button icon={LogIn} className="flex-1" onPress={() => router.push("/login")}>
          تسجيل الدخول
        </Button>
        <Button variant="outline" className="flex-1" onPress={() => router.push("/register")}>
          حساب جديد
        </Button>
      </View>
    </View>
  );
}
