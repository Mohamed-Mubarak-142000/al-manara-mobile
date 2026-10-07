import { router } from "expo-router";
import { Lock, Mail, ShieldCheck, User, UserPlus } from "lucide-react-native";
import { useRef, useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import {
  AuthField,
  AuthLayout,
  FormError,
  GoogleButton,
  TextLink,
  emailProblem,
  errorHaptic,
  passwordProblem,
} from "@/features/account/AuthLayout";
import { PasswordStrength } from "@/features/account/PasswordStrength";
import { authFlows } from "@/features/account/authFlows";
import { useCloseAuthFlow } from "@/features/account/closeAuthFlow";

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
  const close = useCloseAuthFlow();
  const submitting = useRef(false);

  async function submit() {
    const next: Errors = {
      fullName: fullName.trim().length < 2 ? "اكتب اسمك (حرفان على الأقل)" : undefined,
      email: emailProblem(email),
      password: passwordProblem(password),
      confirm: password !== confirm ? "كلمتا المرور غير متطابقتين" : undefined,
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) {
      errorHaptic();
      return;
    }
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    const address = email.trim().toLowerCase();
    const result = await authFlows.register(fullName.trim(), address, password);
    submitting.current = false;
    setBusy(false);
    // Signed in right away, like the website: back to wherever the user came from.
    if (result.ok) close();
    else setError(result.error);
  }

  return (
    <AuthLayout title="حساب جديد" description="أنشئ حسابك مرة واحدة واستخدمه على الموقع والتطبيق.">
      <GoogleButton onDone={close} />
      <AuthField
        label="الاسم"
        icon={User}
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
        autoComplete="name"
        error={errors.fullName}
      />
      <AuthField
        label="البريد الإلكتروني"
        icon={Mail}
        placeholder="name@example.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        error={errors.email}
      />
      <AuthField
        label="كلمة المرور"
        icon={Lock}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        error={errors.password}
      />
      <PasswordStrength password={password} />
      <AuthField
        label="تأكيد كلمة المرور"
        icon={ShieldCheck}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoComplete="new-password"
        error={errors.confirm}
      />
      <FormError message={error} />
      <Button icon={UserPlus} size="lg" onPress={submit} disabled={busy}>
        {busy ? "جارٍ الإنشاء…" : "إنشاء الحساب"}
      </Button>
      <Text className="text-center font-sans text-xs leading-6 text-fg-muted">
        بالتسجيل فإنك توافق على{" "}
        <Text accessibilityRole="link" className="font-sans-bold text-primary" onPress={() => router.push("/terms")}>
          الشروط
        </Text>{" "}
        و
        <Text accessibilityRole="link" className="font-sans-bold text-primary" onPress={() => router.push("/privacy")}>
          سياسة الخصوصية
        </Text>
      </Text>
      <View className="mt-1 items-center">
        <TextLink label="لديك حساب؟ سجّل الدخول" onPress={() => router.replace("/login")} />
      </View>
    </AuthLayout>
  );
}
