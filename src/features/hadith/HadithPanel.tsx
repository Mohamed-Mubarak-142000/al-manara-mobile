import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { useThemeColor } from "@/theme/useThemeColor";

/** The website's HadithPanel: a gold tab with the title above a framed parchment box. */
export function HadithPanel({ title, icon: Icon, children }: { title: string; icon?: LucideIcon; children: ReactNode }) {
  const onTab = useThemeColor("on-primary");
  return (
    <View className="pt-6">
      <View className="absolute start-0 top-0 z-10 flex-row items-center gap-2 rounded-t-2xl rounded-be-2xl bg-accent-strong px-4 py-2 shadow-soft">
        {Icon && <Icon size={18} color={onTab} />}
        <Text className="font-sans-bold text-base text-on-primary">{title}</Text>
      </View>
      <View className="rounded-3xl rounded-ss-none border border-e-4 border-accent/30 border-e-primary bg-surface-alt px-5 pb-5 pt-9">
        {children}
      </View>
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

/** "التخريج: …" and "الدرجة: …" under the hadith. */
export function HadithChip({ label, value }: { label: string; value: string }) {
  return (
    <View className="rounded-full bg-surface px-3 py-1">
      <Text className="font-sans text-sm text-fg-muted">
        {label}: <Text className="font-sans-bold text-primary-strong">{value}</Text>
      </Text>
    </View>
  );
}
