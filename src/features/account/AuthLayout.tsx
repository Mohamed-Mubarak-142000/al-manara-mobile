import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ChevronRight, CircleAlert, Eye, EyeOff, type LucideIcon } from "lucide-react-native";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View, type TextInputProps } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GoogleLogo } from "@/components/GoogleLogo";
import { Divider } from "@/components/ui/Ornament";
import { useTextScale } from "@/theme/textScale";
import { useThemeColor } from "@/theme/useThemeColor";

import { signInWithGoogle } from "./authFlows";

/** The error buzz for a rejected submit (validation or server). */
export function errorHaptic() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}

/**
 * The shared frame of the account screens: the home screen's Quran-terrace scene under an emerald wash,
 * logo and title, then the form in a raised card that overlaps the bottom of the scene.
 */
export function AuthLayout({
  title,
  description,
  children,
  onBack,
}: {
  title: string;
  description: string;
  children: ReactNode;
  /** Replaces the default back (e.g. the reset screen closes the whole flow). */
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const hero = useThemeColor("hero");
  const goldSoft = useThemeColor("gold-soft");
  const textScale = useTextScale();
  const enter = (index: number) => FadeInDown.duration(600).delay(index * 90);
  // Android too: edge-to-edge (forced on RN 0.86 / Android 15+) means the window is no longer resized for the
  // keyboard, so without padding it covers the lower fields. KeyboardAvoidingView measures the overlap
  // itself, so it adds nothing where the system already made room.
  return (
    <KeyboardAvoidingView className="flex-1 bg-bg" behavior="padding">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <View className="overflow-hidden bg-hero px-5 pb-20" style={{ paddingTop: insets.top + 8 }}>
          <Image source={require("@/assets/images/scenes/quran-terrace.webp")} contentFit="cover" style={{ position: "absolute", inset: 0 }} />
          <View className="absolute inset-0 bg-hero/60" />
          <LinearGradient colors={["transparent", hero]} locations={[0.2, 1]} style={{ position: "absolute", inset: 0 }} />
          <View className="absolute -top-40 self-center size-96 rounded-full bg-gold/15" />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="رجوع"
            onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace("/")))}
            hitSlop={12}
            className="size-10 items-center justify-center self-start rounded-full border border-white/15 bg-white/10"
          >
            <ChevronRight size={24} color={goldSoft} />
          </Pressable>

          <Animated.View entering={enter(0)} className="mt-2 items-center">
            <View className="size-20 items-center justify-center rounded-full border border-gold/30 bg-white/10 shadow-gold">
              <Image
                source={require("@/assets/images/brand/logo.png")}
                contentFit="contain"
                style={{ width: 56, height: 56 }}
                accessibilityLabel="المنارة"
              />
            </View>
          </Animated.View>
          <Animated.Text
            entering={enter(1)}
            className="mt-4 text-center font-display-bold text-3xl text-hero-fg"
            style={{ lineHeight: Math.round(46 * textScale) }}
          >
            {title}
          </Animated.Text>
          <Animated.Text entering={enter(2)} className="mt-1 text-center font-sans text-base leading-7 text-white/80">
            {description}
          </Animated.Text>
          <Animated.View entering={enter(3)} className="mt-5 w-1/2 self-center">
            <Divider tone="light" />
          </Animated.View>
        </View>

        <Animated.View
          entering={FadeInDown.duration(650).delay(200)}
          className="-mt-12 mx-4 gap-4 rounded-[28px] border border-border bg-surface p-5 shadow-lift"
        >
          {children}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

interface AuthFieldProps extends Omit<TextInputProps, "style" | "className"> {
  label: string;
  error?: string | undefined;
  /** Shown at the start of the field (Mail, Lock, User…). */
  icon?: LucideIcon;
}

/** A labelled field. secureTextEntry fields get a show/hide toggle; the border turns primary on focus. */
export function AuthField({ label, error, icon: Icon, secureTextEntry, onFocus, onBlur, ...input }: AuthFieldProps) {
  const fg = useThemeColor("fg");
  const muted = useThemeColor("fg-muted");
  const border = useThemeColor("border");
  const primary = useThemeColor("primary");
  const danger = useThemeColor("danger");
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  const focus = useSharedValue(0);

  useEffect(() => {
    focus.value = withTiming(focused ? 1 : 0, { duration: 180 });
  }, [focused, focus]);

  const frame = useAnimatedStyle(() => ({
    borderColor: error ? danger : interpolateColor(focus.value, [0, 1], [border, primary]),
    transform: [{ scale: 1 + focus.value * 0.01 }],
  }));

  return (
    <View className="gap-1.5">
      <Text className="font-sans-bold text-sm text-fg">{label}</Text>
      <Animated.View className="h-13 flex-row items-center gap-2.5 rounded-2xl border-[1.5px] bg-bg px-4" style={frame}>
        {Icon && <Icon size={19} color={error ? danger : focused ? primary : muted} />}
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={muted}
          {...input}
          accessibilityLabel={input.accessibilityLabel ?? label}
          secureTextEntry={secureTextEntry ? hidden : undefined}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          className="h-full flex-1 font-sans text-base"
          style={{ color: fg, textAlign: "right" }}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? "إظهار كلمة المرور" : "إخفاء كلمة المرور"}
            onPress={() => setHidden((value) => !value)}
            hitSlop={10}
            className="p-1"
          >
            {hidden ? <Eye size={19} color={muted} /> : <EyeOff size={19} color={muted} />}
          </Pressable>
        ) : null}
      </Animated.View>
      {error ? (
        <Animated.View entering={FadeIn.duration(200)} className="flex-row items-center gap-1.5">
          <CircleAlert size={14} color={danger} />
          <Text className="flex-1 font-sans text-xs text-danger">{error}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** The form-level error as an alert banner; buzzes each time a new message appears. */
export function FormError({ message }: { message: string | null }) {
  const danger = useThemeColor("danger");
  useEffect(() => {
    if (message) errorHaptic();
  }, [message]);
  if (!message) return null;
  return (
    <Animated.View
      key={message}
      entering={FadeInDown.duration(250)}
      exiting={FadeOut.duration(150)}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className="flex-row items-start gap-2.5 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3"
    >
      <CircleAlert size={18} color={danger} />
      <Text className="flex-1 font-sans text-sm leading-6 text-danger">{message}</Text>
    </Animated.View>
  );
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

/** "المتابعة باستخدام Google", above the email form on sign-in and registration, then an "أو" divider. */
export function GoogleButton({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fg = useThemeColor("fg");
  // A second sheet can't open while one is ("WebBrowser is already open"); `busy` lags a render.
  const opening = useRef(false);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );
  return (
    <View className="gap-4">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy, disabled: busy }}
        disabled={busy}
        onPress={async () => {
          if (opening.current) return;
          opening.current = true;
          Haptics.selectionAsync().catch(() => {});
          setBusy(true);
          setError(null);
          const result = await signInWithGoogle().catch(() => ({ ok: false as const, error: "تعذّر بدء الدخول بجوجل الآن." }));
          opening.current = false;
          if (!mounted.current) return;
          setBusy(false);
          if (result.ok) onDone();
          else if (result.error) setError(result.error);
        }}
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }], opacity: busy ? 0.6 : 1 })}
      >
        <View className="h-13 flex-row items-center justify-center gap-3 rounded-full border-[1.5px] border-border bg-surface shadow-soft">
          {busy ? <ActivityIndicator size="small" color={fg} /> : <GoogleLogo size={20} />}
          <Text className="font-sans-bold text-base text-fg">{busy ? "جارٍ الدخول…" : "المتابعة باستخدام Google"}</Text>
        </View>
      </Pressable>
      <FormError message={error} />
      <View className="flex-row items-center gap-3" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View className="h-px flex-1 bg-border" />
        <Text className="font-sans text-sm text-fg-muted">أو</Text>
        <View className="h-px flex-1 bg-border" />
      </View>
    </View>
  );
}
