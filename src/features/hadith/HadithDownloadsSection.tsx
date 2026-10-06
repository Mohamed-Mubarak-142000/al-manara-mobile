import { router } from "expo-router";
import { ScrollText, Trash2 } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { toArabicDigits } from "@/core/text/arabic";
import { useThemeColor } from "@/theme/useThemeColor";

import { confirmRemovePack, megabytes } from "./HadithPackControls";
import { readyPacks, useHadithPacks } from "./hadithPacks";

/** The downloaded hadith topics with their size, for the downloads screen; nothing when there are none. */
export function HadithDownloadsSection() {
  // Subscribing keeps the list in step with downloads and deletes made elsewhere.
  useHadithPacks();
  const muted = useThemeColor("fg-muted");
  const primary = useThemeColor("primary");
  const packs = readyPacks().sort((a, b) => b.savedAt - a.savedAt);
  if (!packs.length) return null;
  const total = packs.reduce((sum, pack) => sum + pack.bytes, 0);

  return (
    <View className="mx-4 mb-4 gap-2">
      <View className="flex-row items-baseline justify-between">
        <Text className="font-display-bold text-lg text-fg">الأحاديث</Text>
        <Text className="font-sans text-xs text-fg-muted">{megabytes(total)}</Text>
      </View>
      {packs.map((pack) => (
        <View key={pack.id} className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2.5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`فتح ${pack.title}`}
            onPress={() => router.push({ pathname: "/hadith/category/[id]", params: { id: pack.id, title: pack.title } })}
            className="flex-1 flex-row items-center gap-3"
          >
            <View className="size-10 items-center justify-center rounded-full bg-primary-soft">
              <ScrollText size={16} color={primary} />
            </View>
            <View className="flex-1">
              <Text className="font-display-bold text-base text-fg">{pack.title}</Text>
              <Text className="font-sans text-xs text-fg-muted">
                {toArabicDigits(pack.count)} حديث · {megabytes(pack.bytes)}
              </Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`حذف ${pack.title}`}
            onPress={() => confirmRemovePack(pack.id, pack.title)}
            hitSlop={8}
            className="p-2"
          >
            <Trash2 size={18} color={muted} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}
