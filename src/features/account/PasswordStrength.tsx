import { Text, View } from "react-native";

export type StrengthLevel = "weak" | "ok" | "strong";

const LEVELS: Record<StrengthLevel, { label: string; segments: number; bar: string; text: string }> = {
  weak: { label: "ضعيفة", segments: 1, bar: "bg-danger", text: "text-danger" },
  ok: { label: "متوسطة", segments: 2, bar: "bg-accent", text: "text-accent-strong" },
  strong: { label: "قوية", segments: 3, bar: "bg-primary", text: "text-primary" },
};

/** Character kinds a password can mix: letters (Latin lower or Arabic), capitals, digits (Latin or Arabic-Indic), symbols. */
const KINDS = [/[a-zء-ي]/, /[A-Z]/, /[0-9٠-٩۰-۹]/, /[^a-zA-Z0-9ء-ي٠-٩۰-۹\s]/];

/**
 * A rough strength hint for the register form; the server's rule stays "8 to 72 characters"
 * (passwordProblem). Returns null for an empty password, so nothing is shown before typing.
 */
export function scorePassword(password: string): StrengthLevel | null {
  if (!password) return null;
  if (password.length < 8 || /^(.)\1+$/.test(password)) return "weak";
  const kinds = KINDS.filter((kind) => kind.test(password)).length;
  const score = kinds + (password.length >= 12 ? 1 : 0) + (password.length >= 16 ? 1 : 0);
  if (score >= 4) return "strong";
  if (score >= 2) return "ok";
  return "weak";
}

/** Three-segment bar with the level's name, under the password field. */
export function PasswordStrength({ password }: { password: string }) {
  const level = scorePassword(password);
  if (!level) return null;
  const meta = LEVELS[level];
  return (
    <View className="-mt-2 gap-1.5" accessibilityLabel={`قوة كلمة المرور: ${meta.label}`}>
      <View className="flex-row gap-1.5">
        {[0, 1, 2].map((index) => (
          <View key={index} className={`h-1.5 flex-1 rounded-full ${index < meta.segments ? meta.bar : "bg-border"}`} />
        ))}
      </View>
      <Text className="font-sans text-xs text-fg-muted">
        قوة كلمة المرور: <Text className={`font-sans-bold ${meta.text}`}>{meta.label}</Text>
        {level === "weak" ? " — اجمع بين حروف وأرقام ورموز" : ""}
      </Text>
    </View>
  );
}
