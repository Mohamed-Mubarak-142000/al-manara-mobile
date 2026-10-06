import { router } from "expo-router";
import { KeyRound, Lock, ShieldCheck } from "lucide-react-native";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { AuthField, AuthLayout, FormError, passwordProblem } from "@/features/account/AuthLayout";
import { authFlows } from "@/features/account/authFlows";
import { PasswordStrength } from "@/features/account/PasswordStrength";

/** Reached after a recovery code signed the user in. */
export default function ResetPasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const problem = passwordProblem(password) ?? (password !== confirm ? "كلمتا المرور غير متطابقتين" : undefined);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await authFlows.setPassword(password);
    setBusy(false);
    if (result.ok) router.dismissAll();
    else setError(result.error);
  }

  return (
    <AuthLayout title="كلمة مرور جديدة" description="اختر كلمة مرور جديدة لحسابك.">
      <AuthField
        label="كلمة المرور الجديدة"
        icon={Lock}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <PasswordStrength password={password} />
      <AuthField label="تأكيد كلمة المرور" icon={ShieldCheck} value={confirm} onChangeText={setConfirm} secureTextEntry />
      <FormError message={error} />
      <Button icon={KeyRound} size="lg" onPress={submit} disabled={busy}>
        {busy ? "جارٍ الحفظ…" : "حفظ كلمة المرور"}
      </Button>
    </AuthLayout>
  );
}
