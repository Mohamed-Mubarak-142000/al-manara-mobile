import { useEffect, useRef, useState } from "react";
// Plain RN Animated for the caret keeps this file free of Reanimated, so normalizeOtp is unit-testable.
import { Animated, Platform, Pressable, Text, TextInput, View } from "react-native";

/**
 * Typed, pasted or autofilled text to the code's digits: Arabic-Indic (٠-٩) and Persian (۰-۹) digits
 * become Latin, everything else (spaces, dashes, "Code: ") is dropped, and it is cut to `length`.
 */
export function normalizeOtp(text: string, length = 6): string {
  return text
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[^0-9]/g, "")
    .slice(0, length);
}

interface OtpInputProps {
  value: string;
  onChange: (digits: string) => void;
  /** Called once all digits are in (typed, pasted or autofilled). */
  onComplete?: (digits: string) => void;
  length?: number;
  invalid?: boolean;
  editable?: boolean;
}

/**
 * One box per digit, all driven by a single transparent TextInput laid over them: the system keyboard,
 * paste menu (long press) and one-time-code autofill all work as with a normal field.
 */
export function OtpInput({ value, onChange, onComplete, length = 6, invalid = false, editable = true }: OtpInputProps) {
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const active = Math.min(value.length, length - 1);

  return (
    <Pressable onPress={() => input.current?.focus()} accessible={false}>
      {/* Codes read left to right, also in the RTL layout. */}
      <View className="flex-row justify-between gap-2" style={{ direction: "ltr" }} importantForAccessibility="no-hide-descendants">
        {Array.from({ length }, (_, index) => {
          const digit = value[index] ?? "";
          const isActive = focused && editable && index === active;
          const border = invalid ? "border-danger" : isActive ? "border-primary" : digit ? "border-primary/40" : "border-border";
          return (
            <View
              key={index}
              className={`h-14 flex-1 items-center justify-center rounded-2xl border-2 ${border} ${isActive ? "bg-primary-soft" : "bg-bg"}`}
              style={{ maxWidth: 56 }}
            >
              {digit ? (
                <Text className="font-display-bold text-2xl text-fg">{digit}</Text>
              ) : isActive ? (
                <Caret />
              ) : null}
            </View>
          );
        })}
      </View>
      <TextInput
        ref={input}
        value={value}
        onChangeText={(text) => {
          const digits = normalizeOtp(text, length);
          if (digits === value) return;
          onChange(digits);
          if (digits.length === length) onComplete?.(digits);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        editable={editable}
        keyboardType="number-pad"
        inputMode="numeric"
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
        autoFocus
        caretHidden
        accessibilityLabel="الكود"
        accessibilityHint={`${length} أرقام`}
        // Covers the boxes so a tap focuses it and a long press opens the paste menu; invisible itself.
        style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, opacity: 0.02, color: "transparent" }}
      />
    </Pressable>
  );
}

function Caret() {
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 450, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]),
    );
    blink.start();
    return () => blink.stop();
  }, [opacity]);
  return (
    <Animated.View style={{ opacity }}>
      <View className="h-6 w-0.5 rounded-full bg-primary" />
    </Animated.View>
  );
}
