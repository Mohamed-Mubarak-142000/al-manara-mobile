import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { useThemeColor } from "@/theme/useThemeColor";

/**
 * The website's HadithPanel, in the app's card style: a white card with a hairline border, its title row
 * (a small tinted icon and the title) set apart from the body by a hairline.
 */
export function HadithPanel({ title, icon: Icon, children }: { title: string; icon?: LucideIcon; children: ReactNode }) {
  const accent = useThemeColor("accent-strong");
  return (
    <View className="overflow-hidden rounded-3xl border border-border bg-surface shadow-card">
      <View className="flex-row items-center gap-3 border-b border-border px-5 py-3.5">
        {Icon && (
          <View className="size-9 items-center justify-center rounded-xl bg-accent-soft">
            <Icon size={18} color={accent} />
          </View>
        )}
        <Text accessibilityRole="header" className="flex-1 font-sans-bold text-base text-fg">
          {title}
        </Text>
      </View>
      <View className="p-5">{children}</View>
    </View>
  );
}

/** Colours the Prophet's words (between «») apart from the narration around them. */
export function HadithText({ text, numberOfLines }: { text: string; numberOfLines?: number }) {
  const parts = text.split(/(«[^»]*»)/g).filter(Boolean);
  return (
    <Text className="font-sans text-xl leading-11 text-fg" numberOfLines={numberOfLines}>
      {parts.map((part, index) =>
        part.startsWith("«") ? (
          <Text key={index} className="font-sans-semibold text-primary-strong">
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

/** "التخريج: …" and "الدرجة: …" under the hadith, as outlined pills. */
export function HadithChip({ label, value }: { label: string; value: string }) {
  return (
    <View className="rounded-full border border-border px-3 py-1.5">
      <Text className="font-sans text-sm text-fg-muted">
        {label}: <Text className="font-sans-bold text-primary-strong">{value}</Text>
      </Text>
    </View>
  );
}
