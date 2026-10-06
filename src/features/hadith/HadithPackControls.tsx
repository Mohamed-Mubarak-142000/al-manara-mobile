import { Check, CloudDownload, Download, RotateCcw, X } from "lucide-react-native";
import { Alert, Pressable, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import type { HadithCategory } from "@/core/hadith/api";
import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useThemeColor } from "@/theme/useThemeColor";

import { hadithPacks, overallProgress, useDownloadAllRunning, useHadithPack, useHadithPacks } from "./hadithPacks";

export function megabytes(bytes: number): string {
  return `${toArabicDigits((bytes / (1024 * 1024)).toFixed(1))} م.ب`;
}

export function confirmRemovePack(id: string, title: string) {
  Alert.alert("حذف الأحاديث المنزّلة", `حذف «${title}» من الجهاز؟ ستبقى متاحة عبر الإنترنت.`, [
    { text: "إلغاء", style: "cancel" },
    { text: "حذف", style: "destructive", onPress: () => hadithPacks.remove(id) },
  ]);
}

const R = 15;
const C = 2 * Math.PI * R;

/** One topic's download control: download → progress ring (tap to cancel) → check + size (long-press to delete). */
export function HadithPackButton({ category }: { category: HadithCategory }) {
  const state = useHadithPack(category.id);
  const primary = useThemeColor("primary");
  const muted = useThemeColor("fg-muted");
  const gold = useThemeColor("gold");
  const border = useThemeColor("border");
  const danger = useThemeColor("danger");

  if (state.status === "downloading") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`إلغاء تنزيل ${category.title}، ${toArabicDigits(Math.round(state.progress * 100))}٪`}
        hitSlop={8}
        onPress={() => hadithPacks.cancel(category.id)}
      >
        <View className="size-9 items-center justify-center">
          <Svg width={36} height={36} viewBox="0 0 36 36" style={{ transform: [{ rotate: "-90deg" }] }}>
            <Circle cx={18} cy={18} r={R} stroke={border} strokeWidth={3} fill="none" />
            <Circle
              cx={18}
              cy={18}
              r={R}
              stroke={gold}
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - state.progress)}
            />
          </Svg>
          <View className="absolute">
            <X size={14} color={muted} />
          </View>
        </View>
      </Pressable>
    );
  }

  if (state.status === "ready") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${category.title} محفوظ على الجهاز (${megabytes(state.bytes)})، اضغط مطولًا للحذف`}
        hitSlop={8}
        onLongPress={() => confirmRemovePack(category.id, category.title)}
        delayLongPress={350}
        className="flex-row items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1.5"
      >
        <Check size={14} color={primary} />
        <Text className="font-sans-bold text-[11px] text-primary">{megabytes(state.bytes)}</Text>
      </Pressable>
    );
  }

  const failed = state.status === "failed";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={failed ? `إعادة محاولة تنزيل ${category.title}. ${state.message}` : `تنزيل ${category.title} للقراءة دون إنترنت`}
      hitSlop={8}
      onPress={() => hadithPacks.download(category.id)}
      className="size-9 items-center justify-center"
    >
      {failed ? <RotateCcw size={19} color={danger} /> : <Download size={20} color={muted} />}
    </Pressable>
  );
}

/** "Download all" card for the hadith index, with the overall progress across topics. */
export function HadithDownloadAllCard({ roots }: { roots: HadithCategory[] }) {
  const states = useHadithPacks();
  const running = useDownloadAllRunning();
  const accent = useThemeColor("accent-strong");
  const progress = overallProgress(roots, states);
  const readyCount = roots.filter((root) => states[root.id]?.status === "ready").length;
  const allReady = roots.length > 0 && readyCount === roots.length;
  const anyDownloading = roots.some((root) => states[root.id]?.status === "downloading");
  const bytes = roots.reduce((sum, root) => {
    const state = states[root.id];
    return sum + (state?.status === "ready" ? state.bytes : 0);
  }, 0);
  const failed = roots.find((root) => states[root.id]?.status === "failed");

  return (
    <View className="gap-3 rounded-3xl border border-border bg-surface p-4 shadow-soft">
      <View className="flex-row items-center gap-3">
        <View className="size-10 items-center justify-center rounded-full bg-accent-soft">
          {allReady ? <Check size={20} color={accent} /> : <CloudDownload size={20} color={accent} />}
        </View>
        <View className="flex-1">
          <Text className="font-display-bold text-base text-fg">
            {allReady ? "كل الأحاديث محفوظة على الجهاز" : "تنزيل كل الأحاديث للاستخدام بدون إنترنت"}
          </Text>
          <Text className="font-sans text-xs leading-5 text-fg-muted">
            {allReady
              ? `${megabytes(bytes)} · تعمل الأحاديث وشروحها دون إنترنت`
              : running || anyDownloading
                ? `جارٍ التنزيل… ${toArabicDigits(Math.round(progress * 100))}٪ (${toArabicDigits(readyCount)} من ${toArabicDigits(roots.length)} موضوعات)`
                : readyCount
                  ? `${toArabicDigits(readyCount)} من ${toArabicDigits(roots.length)} موضوعات محفوظة · ${megabytes(bytes)}`
                  : "نحو ٤٬٣٠٠ حديث مع الشرح والفوائد، أو نزّل موضوعًا بعينه من القائمة."}
          </Text>
        </View>
      </View>
      {(running || anyDownloading) && <ProgressBar value={progress} />}
      {failed && !running && !anyDownloading ? (
        <Text className="font-sans text-xs text-danger">{(states[failed.id] as { message: string }).message}</Text>
      ) : null}
      {!allReady &&
        (running || anyDownloading ? (
          <Button size="sm" variant="outline" className="self-start" onPress={() => hadithPacks.cancelAll()}>
            إيقاف التنزيل
          </Button>
        ) : (
          <Button size="sm" variant="gold" icon={Download} className="self-start" onPress={() => void hadithPacks.downloadAll()}>
            {readyCount ? "تنزيل الباقي" : "تنزيل الكل"}
          </Button>
        ))}
    </View>
  );
}
