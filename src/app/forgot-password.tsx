import { router, useLocalSearchParams } from "expo-router";
import { Mail } from "lucide-react-native";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { AuthField, AuthLayout, FormError, emailProblem } from "@/features/account/AuthLayout";
import { authFlows } from "@/features/account/authFlows";

export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const problem = emailProblem(email);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    const address = email.trim().toLowerCase();
    const result = await authFlows.sendCode(address, "recovery");
    setBusy(false);
    // Same next step whether or not the account exists, like the website.
    if (result.ok) router.replace({ pathname: "/verify", params: { email: address, type: "recovery" } });
    else setError(result.error);
  }

  return (
    <AuthLayout title="استعادة كلمة المرور" description="أدخل بريدك وسنرسل لك كودًا لتعيين كلمة مرور جديدة.">
      <AuthField
        label="البريد الإلكتروني"
        icon={Mail}
        placeholder="name@example.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <FormError message={error} />
      <Button icon={Mail} size="lg" onPress={submit} disabled={busy}>
        {busy ? "جارٍ الإرسال…" : "أرسل الكود"}
      </Button>
    </AuthLayout>
  );
}
