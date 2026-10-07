import { router } from "expo-router";
import { Lock, LogIn, Mail } from "lucide-react-native";
import { useRef, useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { account } from "@/features/account/accountStore";
import { AuthField, AuthLayout, FormError, GoogleButton, TextLink } from "@/features/account/AuthLayout";
import { authFlows } from "@/features/account/authFlows";
import { useCloseAuthFlow } from "@/features/account/closeAuthFlow";

/** Sign-in with the website account. */
export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = useCloseAuthFlow();
  // `busy` lags a render: two quick taps would both sign in and close twice.
  const submitting = useRef(false);

  async function submit() {
    if (!email.trim() || !password) {
      setError("أدخل البريد الإلكتروني وكلمة المرور.");
      return;
    }
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    let result = await account.signIn(email, password);
    // Like the website's login: an account from the old signup-code flow is confirmed, then signed in.
    if (!result.ok && result.needsVerification) {
      const confirmed = await authFlows.confirmLegacy(email.trim().toLowerCase(), password);
      result = confirmed.ok ? await account.signIn(email, password) : { ok: false, message: confirmed.error };
    }
    submitting.current = false;
    setBusy(false);
    if (result.ok) close();
    else setError(result.message);
  }

  return (
    <AuthLayout title="تسجيل الدخول" description="بنفس حسابك على موقع المنارة، ليتابع معك حفظك وختمتك وموضع قراءتك أينما كنت.">
      <GoogleButton onDone={close} />
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
      <AuthField
        label="كلمة المرور"
        icon={Lock}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
      />
      <FormError message={error} />
      <Button icon={LogIn} size="lg" onPress={submit} disabled={busy}>
        {busy ? "جارٍ الدخول…" : "دخول"}
      </Button>
      <View className="mt-2 flex-row flex-wrap justify-center gap-x-5 gap-y-2">
        <TextLink label="إنشاء حساب جديد" onPress={() => router.replace("/register")} />
        <TextLink label="نسيت كلمة المرور؟" onPress={() => router.push({ pathname: "/forgot-password", params: { email } })} />
      </View>
      <Text className="mt-1 text-center font-sans text-xs leading-6 text-fg-muted">
        التطبيق يعمل كاملًا بدون حساب. الحساب فقط لمزامنة تقدمك مع الموقع والأجهزة الأخرى.
      </Text>
    </AuthLayout>
  );
}
