import { router } from "expo-router";
import { UserPlus } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/Button";
import { AuthField, AuthLayout, FormError, GoogleButton, TextLink, emailProblem, passwordProblem } from "@/features/account/AuthLayout";
import { authFlows } from "@/features/account/authFlows";

type Errors = Partial<Record<"fullName" | "email" | "password" | "confirm", string>>;

/** Same fields and rules as the website's register form; the server sends the confirmation code. */
export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const next: Errors = {
      fullName: fullName.trim().length < 2 ? "اكتب اسمك (حرفان على الأقل)" : undefined,
      email: emailProblem(email),
      password: passwordProblem(password),
      confirm: password !== confirm ? "كلمتا المرور غير متطابقتين" : undefined,
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setBusy(true);
    setError(null);
    const address = email.trim().toLowerCase();
    const result = await authFlows.register(fullName.trim(), address, password);
    setBusy(false);
    // Signed in right away, like the website: back to wherever the user came from.
    if (result.ok) router.dismissAll();
    else setError(result.error);
  }

  return (
    <AuthLayout title="حساب جديد" description="أنشئ حسابك مرة واحدة واستخدمه على الموقع والتطبيق.">
      <GoogleButton onDone={() => router.dismissAll()} />
      <AuthField
        label="الاسم"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
        autoComplete="name"
        error={errors.fullName}
      />
      <AuthField
        label="البريد الإلكتروني"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        error={errors.email}
      />
      <AuthField
        label="كلمة المرور"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        error={errors.password}
      />
      <AuthField label="تأكيد كلمة المرور" value={confirm} onChangeText={setConfirm} secureTextEntry error={errors.confirm} />
      <FormError message={error} />
      <Button icon={UserPlus} size="lg" onPress={submit} disabled={busy}>
        {busy ? "جارٍ الإنشاء…" : "إنشاء الحساب"}
      </Button>
      <View className="mt-2 items-center">
        <TextLink label="لديك حساب؟ سجّل الدخول" onPress={() => router.replace("/login")} />
      </View>
    </AuthLayout>
  );
}
