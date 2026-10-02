import { router, useLocalSearchParams } from "expo-router";
import { ShieldCheck } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";

import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { AuthLayout, FormError, TextLink } from "@/features/account/AuthLayout";
import { authFlows, type OtpType } from "@/features/account/authFlows";
import { useThemeColor } from "@/theme/useThemeColor";

const RESEND_SECONDS = 60;
const TYPES: OtpType[] = ["signup", "recovery", "email"];

/** The 6-digit code from the email. Signup/email codes sign in; a recovery code continues to the new password. */
export default function VerifyScreen() {
  const params = useLocalSearchParams<{ email?: string; type?: string }>();
  const email = params.email ?? "";
  const type: OtpType = TYPES.includes(params.type as OtpType) ? (params.type as OtpType) : "signup";
  const fg = useThemeColor("fg");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function submit(value = code) {
    if (!/^\d{6}$/.test(value)) {
      setError("الكود ٦ أرقام");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await authFlows.verify(email, type, value);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (type === "recovery") router.replace("/reset-password");
    else router.dismissAll();
  }

  async function resend() {
    setError(null);
    const result = await authFlows.sendCode(email, type);
    if (result.ok) {
      setNotice("أرسلنا كودًا جديدًا إلى بريدك.");
      setCooldown(RESEND_SECONDS);
    } else setError(result.error);
  }

  return (
    <AuthLayout title="أدخل الكود" description={`أرسلنا كودًا من ٦ أرقام إلى ${email}. صالح لمدة ١٥ دقيقة.`}>
      <TextInput
        value={code}
        onChangeText={(text) => {
          const digits = text.replace(/\D/g, "").slice(0, 6);
          setCode(digits);
          if (digits.length === 6) submit(digits);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
        autoFocus
        accessibilityLabel="الكود"
        className="h-16 rounded-2xl border border-border bg-surface text-center font-display-bold text-3xl tracking-[12px]"
        style={{ color: fg }}
      />
      <FormError message={error} />
      {notice && !error ? <Text className="font-sans text-sm text-primary">{notice}</Text> : null}
      <Button icon={ShieldCheck} size="lg" onPress={() => submit()} disabled={busy}>
        {busy ? "جارٍ التحقق…" : "تأكيد"}
      </Button>
      <View className="mt-2 items-center">
        {cooldown > 0 ? (
          <Text className="font-sans text-sm text-fg-muted">يمكنك طلب كود جديد بعد {toArabicDigits(cooldown)} ثانية</Text>
        ) : (
          <TextLink label="أرسل كودًا جديدًا" onPress={resend} />
        )}
      </View>
    </AuthLayout>
  );
}
