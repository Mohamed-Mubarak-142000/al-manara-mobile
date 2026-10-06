import { router } from "expo-router";
import { BookOpenText, Compass, Radio, Sparkles, type LucideIcon } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { useReaderState, type LastRead } from "@/features/mushaf/readerPrefs";
import { useThemeColor } from "@/theme/useThemeColor";

/** The mushaf at the last-read page, or the Quran index when nothing has been read yet. */
export function openReading(lastRead: LastRead | null) {
  if (lastRead) router.push({ pathname: "/mushaf", params: { page: String(lastRead.page) } });
  else router.push("/quran");
}

function Action({ icon: Icon, label, hint, onPress }: { icon: LucideIcon; label: string; hint?: string; onPress: () => void }) {
  const primary = useThemeColor("primary");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      className="flex-1"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View className="min-h-18 items-center justify-center gap-1.5 rounded-2xl px-1 py-2.5">
        <View className="size-10 items-center justify-center rounded-full bg-primary-soft">
          <Icon size={20} color={primary} />
        </View>
        <Text numberOfLines={1} className="font-sans-bold text-[11px] text-fg">
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

/** One tap to the four things most people open Home for. */
export function QuickActions() {
  const { lastRead } = useReaderState();
  return (
    <View className="flex-row gap-2 rounded-3xl border border-border bg-surface p-2 shadow-soft">
      <Action
        icon={BookOpenText}
        label={lastRead ? "أكمل القراءة" : "المصحف"}
        hint={lastRead ? "يفتح المصحف على آخر صفحة قرأتها" : undefined}
        onPress={() => openReading(lastRead)}
      />
      <Action icon={Sparkles} label="الأذكار" onPress={() => router.push("/adhkar")} />
      <Action icon={Compass} label="القبلة" onPress={() => router.push("/qibla")} />
      <Action icon={Radio} label="الراديو" onPress={() => router.push("/radio")} />
    </View>
  );
}
