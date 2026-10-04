import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, type TextInputProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Divider } from "@/components/ui/Ornament";
import { useThemeColor } from "@/theme/useThemeColor";

import { signInWithGoogle } from "./authFlows";

/** The shared frame of the account screens: emerald header, then the form. */
export function AuthLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const heroFg = useThemeColor("hero-fg");
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
          <Text className="font-display-bold text-3xl text-hero-fg">{title}</Text>
          <Text className="mt-2 font-sans text-base leading-7 text-white/75">{description}</Text>
          <View className="mt-6 w-2/3">
            <Divider tone="light" />
          </View>
        </View>
        <View className="gap-4 px-5 pt-6">{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

interface AuthFieldProps extends Omit<TextInputProps, "style" | "className"> {
  label: string;
  error?: string | undefined;
}

export function AuthField({ label, error, ...input }: AuthFieldProps) {
  const fg = useThemeColor("fg");
  const muted = useThemeColor("fg-muted");
  return (
    <View className="gap-1.5">
      <Text className="font-sans-bold text-sm text-fg">{label}</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={muted}
        {...input}
        className={`h-12 rounded-2xl border bg-surface px-4 font-sans text-base ${error ? "border-danger" : "border-border"}`}
        style={{ color: fg, textAlign: "right" }}
      />
      {error ? <Text className="font-sans text-xs text-danger">{error}</Text> : null}
    </View>
  );
}

export function FormError({ message }: { message: string | null }) {
  return message ? <Text className="font-sans text-sm text-danger">{message}</Text> : null;
}

export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8}>
      <Text className="font-sans-bold text-sm text-primary">{label}</Text>
    </Pressable>
  );
}

/** The website's password rules (features/auth/service.ts passwordSchema). */
export function passwordProblem(password: string): string | undefined {
  if (password.length < 8) return "كلمة المرور ٨ أحرف على الأقل";
  if (password.length > 72) return "كلمة المرور طويلة جدًا";
  return undefined;
}

export function emailProblem(email: string): string | undefined {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? undefined : "أدخل بريدًا إلكترونيًا صحيحًا";
}

/** "متابعة باستخدام Google", above the email form on sign-in and registration. */
export function GoogleButton({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <View className="gap-2">
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          setError(null);
          const result = await signInWithGoogle();
          setBusy(false);
          if (result.ok) onDone();
          else if (result.error) setError(result.error);
        }}
        className="h-12 flex-row items-center justify-center gap-2 rounded-full border border-border bg-surface"
        style={{ opacity: busy ? 0.6 : 1 }}
      >
        <Text className="font-display-black text-lg" style={{ color: "#4285F4" }}>
          G
        </Text>
        <Text className="font-sans-bold text-base text-fg">{busy ? "جارٍ الدخول…" : "متابعة باستخدام Google"}</Text>
      </Pressable>
      <FormError message={error} />
      <View className="flex-row items-center gap-3">
        <View className="h-px flex-1 bg-border" />
        <Text className="font-sans text-xs text-fg-muted">أو بالبريد الإلكتروني</Text>
        <View className="h-px flex-1 bg-border" />
      </View>
    </View>
  );
}
