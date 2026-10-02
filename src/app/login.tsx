import { router } from "expo-router";
import { ChevronRight, LogIn } from "lucide-react-native";
import { useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Ornament";
import { account } from "@/features/account/accountStore";
import { useThemeColor } from "@/theme/useThemeColor";

const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL ?? "";

function Field({
  label,
  value,
  onChangeText,
  secure,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  secure?: boolean;
  keyboardType?: "email-address";
}) {
  const fg = useThemeColor("fg");
  const muted = useThemeColor("fg-muted");
  return (
    <View className="gap-1.5">
      <Text className="font-sans-bold text-sm text-fg">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={secure ? "current-password" : "email"}
        textContentType={secure ? "password" : "emailAddress"}
        placeholderTextColor={muted}
        className="h-12 rounded-2xl border border-border bg-surface px-4 font-sans text-base"
        style={{ color: fg, textAlign: "right" }}
      />
    </View>
  );
}

/** Sign-in with the website account. Registration and password reset run on the website for now. */
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const heroFg = useThemeColor("hero-fg");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email.trim() || !password) {
      setError("أدخل البريد الإلكتروني وكلمة المرور.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await account.signIn(email, password);
    setBusy(false);
    if (result.ok) router.back();
    else setError(result.message);
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-bg" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <View className="rounded-b-[32px] bg-hero px-5 pb-8" style={{ paddingTop: insets.top + 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="رجوع"
            onPress={() => router.back()}
            hitSlop={12}
            className="mb-4 self-start p-1"
          >
            <ChevronRight size={26} color={heroFg} />
          </Pressable>
          <Text className="font-display-bold text-3xl text-hero-fg">تسجيل الدخول</Text>
          <Text className="mt-2 font-sans text-base leading-7 text-white/75">
            بنفس حسابك على موقع المنارة، ليتابع معك حفظك وختمتك وموضع قراءتك أينما كنت.
          </Text>
          <View className="mt-6 w-2/3">
            <Divider tone="light" />
          </View>
        </View>

        <View className="gap-4 px-5 pt-6">
          <Field label="البريد الإلكتروني" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <Field label="كلمة المرور" value={password} onChangeText={setPassword} secure />
          {error && <Text className="font-sans text-sm text-danger">{error}</Text>}
          <Button icon={LogIn} size="lg" onPress={submit} disabled={busy}>
            {busy ? "جارٍ الدخول…" : "دخول"}
          </Button>

          {SITE_URL ? (
            <View className="mt-2 flex-row flex-wrap justify-center gap-x-4 gap-y-2">
              <Pressable accessibilityRole="link" onPress={() => Linking.openURL(`${SITE_URL}/register`)}>
                <Text className="font-sans-bold text-sm text-primary">إنشاء حساب جديد</Text>
              </Pressable>
              <Pressable accessibilityRole="link" onPress={() => Linking.openURL(`${SITE_URL}/forgot-password`)}>
                <Text className="font-sans-bold text-sm text-primary">نسيت كلمة المرور؟</Text>
              </Pressable>
            </View>
          ) : null}

          <Text className="mt-4 text-center font-sans text-xs leading-6 text-fg-muted">
            التطبيق يعمل كاملًا بدون حساب. الحساب فقط لمزامنة تقدمك مع الموقع والأجهزة الأخرى.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
