import { router, useLocalSearchParams } from "expo-router";
import { MailCheck, ShieldCheck, Timer } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";

import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { AuthLayout, FormError, TextLink } from "@/features/account/AuthLayout";
import { authFlows, recovery, type OtpType } from "@/features/account/authFlows";
import { useCloseAuthFlow } from "@/features/account/closeAuthFlow";
import { OtpInput } from "@/features/account/OtpInput";
import { useThemeColor } from "@/theme/useThemeColor";

const RESEND_SECONDS = 60;
const TYPES: OtpType[] = ["signup", "recovery", "email"];

/** The 6-digit code from the email. Signup/email codes sign in; a recovery code continues to the new password. */
export default function VerifyScreen() {
  const params = useLocalSearchParams<{ email?: string; type?: string }>();
  const email = params.email ?? "";
  const type: OtpType = TYPES.includes(params.type as OtpType) ? (params.type as OtpType) : "signup";
  const primary = useThemeColor("primary");
  const muted = useThemeColor("fg-muted");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  // Autofill can deliver the code twice before `busy` re-renders; a second verify would burn the code.
  const verifying = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const close = useCloseAuthFlow();

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
    if (verifying.current) return;
    verifying.current = true;
    setBusy(true);
    setError(null);
    const result = await authFlows
      .verify(email, type, value)
      .catch(() => ({ ok: false as const, error: "تعذّر التحقق الآن، حاول مرة أخرى بعد قليل." }));
    verifying.current = false;
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (type === "recovery") {
      recovery.active = true;
      router.replace("/reset-password");
    } else close();
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
      <OtpInput
        value={code}
        onChange={(digits) => {
          setCode(digits);
          if (error) setError(null);
        }}
        onComplete={(digits) => {
          if (!busy) submit(digits);
        }}
        invalid={!!error}
        editable={!busy}
      />
      <FormError message={error} />
      {notice && !error ? (
        <View className="flex-row items-center gap-2 rounded-2xl bg-primary-soft px-4 py-3">
          <MailCheck size={18} color={primary} />
          <Text className="flex-1 font-sans text-sm text-primary">{notice}</Text>
        </View>
      ) : null}
      <Button icon={ShieldCheck} size="lg" onPress={() => submit()} disabled={busy}>
        {busy ? "جارٍ التحقق…" : "تأكيد"}
      </Button>
      <View className="mt-1 items-center">
        {cooldown > 0 ? (
          <View className="flex-row items-center gap-2 rounded-full bg-surface-alt px-4 py-2">
            <Timer size={15} color={muted} />
            <Text className="font-sans text-sm text-fg-muted">
              يمكنك طلب كود جديد بعد <Text className="font-sans-bold text-fg">{toArabicDigits(cooldown)}</Text> ثانية
            </Text>
          </View>
        ) : (
          <TextLink label="أرسل كودًا جديدًا" onPress={resend} />
        )}
      </View>
    </AuthLayout>
  );
}
