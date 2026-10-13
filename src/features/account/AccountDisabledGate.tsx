import { ShieldOff } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { useThemeColor } from "@/theme/useThemeColor";

import { account, useAccount } from "./accountStore";

/**
 * The website's /account/disabled: an account the admins suspended can't be used. Covers the app until
 * the person signs out; the app then works as a guest, and their progress stays on the account.
 */
export function AccountDisabledGate() {
  const state = useAccount();
  const insets = useSafeAreaInsets();
  const danger = useThemeColor("danger");
  const [busy, setBusy] = useState(false);
  if (state.status !== "signed-in" || !state.profile?.disabled) return null;

  return (
    <View
      className="absolute inset-0 items-center justify-center bg-bg px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      accessibilityViewIsModal
    >
      <View className="size-16 items-center justify-center rounded-3xl bg-danger/10">
        <ShieldOff size={32} color={danger} />
      </View>
      <Text className="mt-6 text-center font-display-bold text-3xl text-primary-strong">هذا الحساب موقوف</Text>
      <Text className="mt-3 text-center font-sans text-base leading-7 text-fg-muted">
        أوقفت إدارة المنصة هذا الحساب. يمكنك الاستمرار في استخدام التطبيق كزائر، وسيبقى تقدّمك محفوظًا إن أُعيد تفعيل الحساب.
      </Text>
      <Button
        className="mt-8"
        size="lg"
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          await account.signOut({ synced: true }).finally(() => setBusy(false));
        }}
      >
        تسجيل الخروج
      </Button>
    </View>
  );
}
