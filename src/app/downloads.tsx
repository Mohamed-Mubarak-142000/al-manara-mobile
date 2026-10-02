import { router } from "expo-router";
import { ChevronRight, Play, Trash2 } from "lucide-react-native";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toArabicDigits } from "@/core/text/arabic";
import { StateMessage } from "@/components/ui/StateMessage";
import { audio, type Track } from "@/features/audio/playerStore";
import { downloads, useDownloads, type DownloadMeta } from "@/features/downloads/downloadStore";
import { useThemeColor } from "@/theme/useThemeColor";

function megabytes(bytes: number): string {
  return `${toArabicDigits((bytes / (1024 * 1024)).toFixed(1))} م.ب`;
}

/** Everything saved for offline listening. */
export default function DownloadsScreen() {
  const insets = useSafeAreaInsets();
  const heroFg = useThemeColor("hero-fg");
  const primary = useThemeColor("primary");
  const muted = useThemeColor("fg-muted");
  const entries = useDownloads();
  const saved: DownloadMeta[] = Object.values(entries)
    .flatMap((entry) => (entry.status === "done" ? [entry.meta] : []))
    .sort((a, b) => b.savedAt - a.savedAt);
  const total = saved.reduce((sum, meta) => sum + meta.bytes, 0);
  const queue: Track[] = saved.map(({ id, title, artist, url }) => ({ id, title, artist, url }));

  return (
    <FlatList
      className="flex-1 bg-bg"
      data={saved}
      keyExtractor={(meta) => meta.id}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      ListHeaderComponent={
        <View className="mb-4 rounded-b-[32px] bg-hero px-5 pb-6" style={{ paddingTop: insets.top + 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="رجوع"
            onPress={() => router.back()}
            hitSlop={12}
            className="mb-3 self-start p-1"
          >
            <ChevronRight size={26} color={heroFg} />
          </Pressable>
          <Text className="font-display-bold text-3xl text-hero-fg">المحفوظات</Text>
          <Text className="mt-1 font-sans text-sm text-white/70">
            {saved.length ? `${toArabicDigits(saved.length)} تلاوة · ${megabytes(total)} على الجهاز` : "تلاوات للاستماع دون إنترنت"}
          </Text>
        </View>
      }
      ListEmptyComponent={<StateMessage message="لم تحفظ أي تلاوة بعد. اضغط زر التنزيل بجوار أي سورة." />}
      renderItem={({ item, index }) => (
        <View className="mx-4 mb-2 flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2.5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`تشغيل ${item.title}`}
            onPress={() => audio.playQueue(queue, index)}
            className="size-10 items-center justify-center rounded-full bg-primary-soft"
          >
            <Play size={16} color={primary} fill={primary} />
          </Pressable>
          <View className="flex-1">
            <Text className="font-display-bold text-base text-fg">{item.title}</Text>
            <Text className="font-sans text-xs text-fg-muted">
              {item.artist} · {megabytes(item.bytes)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`حذف ${item.title}`}
            onPress={() => downloads.remove(item.id)}
            hitSlop={8}
            className="p-2"
          >
            <Trash2 size={18} color={muted} />
          </Pressable>
        </View>
      )}
    />
  );
}
