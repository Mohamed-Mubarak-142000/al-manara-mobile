import { Check, Download, RotateCcw } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useThemeColor } from "@/theme/useThemeColor";

import { downloads, useDownload } from "./downloadStore";

interface Downloadable {
  id: string;
  title: string;
  artist: string;
  url: string;
  fallbackUrls?: string[];
}

export type DownloadTone = "light" | "dark";

const R = 15;
const C = 2 * Math.PI * R;

/** How long "can't be saved" stays visible before the button goes away. */
const UNSUPPORTED_NOTICE_MS = 3500;

/** A short note in place of the button, then nothing: the recording can't be saved. */
function UnsupportedNotice({ tone }: { tone: DownloadTone }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), UNSUPPORTED_NOTICE_MS);
    return () => clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return (
    <Text
      accessibilityLiveRegion="polite"
      className={`max-w-24 text-center font-sans text-[10px] leading-4 ${tone === "light" ? "text-white/70" : "text-fg-muted"}`}
    >
      لا يمكن حفظ هذا التسجيل
    </Text>
  );
}

/** The colors every download control shares: idle icon, saved check, progress. */
export function useDownloadColors(tone: DownloadTone, tint?: string) {
  const primary = useThemeColor("primary");
  const muted = useThemeColor("fg-muted");
  const gold = useThemeColor("gold");
  const heroFg = useThemeColor("hero-fg");
  return {
    idle: tint ?? (tone === "light" ? heroFg : muted),
    done: tint ?? (tone === "light" ? gold : primary),
    progress: gold,
    track: tone === "light" ? "rgba(255,255,255,0.2)" : "rgba(104,118,110,0.25)",
  };
}

/** The in-progress state: a ring filling up around a stop square; tap to cancel. */
export function DownloadProgressRing({
  progress,
  tone,
  tint,
  onCancel,
}: {
  progress: number;
  tone: DownloadTone;
  tint?: string;
  onCancel: () => void;
}) {
  const colors = useDownloadColors(tone, tint);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="إلغاء التنزيل"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      hitSlop={8}
      onPress={onCancel}
    >
      <View className="size-9 items-center justify-center">
        <Svg width={36} height={36} viewBox="0 0 36 36" style={{ transform: [{ rotate: "-90deg" }] }}>
          <Circle cx={18} cy={18} r={R} stroke={colors.track} strokeWidth={3} fill="none" />
          <Circle
            cx={18}
            cy={18}
            r={R}
            stroke={colors.progress}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
          />
        </Svg>
        <View
          className={`absolute size-2.5 rounded-[2px] ${tint ? "" : tone === "light" ? "bg-hero-fg" : "bg-fg-muted"}`}
          style={tint ? { backgroundColor: tint } : undefined}
        />
      </View>
    </Pressable>
  );
}

/**
 * Download → progress ring (tap to cancel) → check (long-press to delete). `tint` overrides the icon
 * color on surfaces with their own palette (the mushaf's reader themes).
 */
export function DownloadButton({ track, tone = "dark", tint }: { track: Downloadable; tone?: DownloadTone; tint?: string }) {
  const entry = useDownload(track.id);
  const colors = useDownloadColors(tone, tint);

  if (entry?.status === "unsupported") return <UnsupportedNotice tone={tone} />;

  if (entry?.status === "active") {
    return <DownloadProgressRing progress={entry.progress} tone={tone} tint={tint} onCancel={() => downloads.cancel(track.id)} />;
  }

  if (entry?.status === "done") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="محفوظ"
        accessibilityHint="محفوظ على الجهاز للاستماع دون إنترنت، اضغط مطولًا للحذف"
        hitSlop={8}
        onLongPress={() => downloads.remove(track.id)}
        className="size-9 items-center justify-center"
      >
        <Check size={20} color={colors.done} />
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={entry?.status === "failed" ? `إعادة تنزيل ${track.title}` : `تنزيل ${track.title}`}
      accessibilityHint="للاستماع دون إنترنت"
      hitSlop={8}
      onPress={() => downloads.start(track)}
      className="size-9 items-center justify-center"
    >
      {entry?.status === "failed" ? <RotateCcw size={19} color={colors.idle} /> : <Download size={20} color={colors.idle} />}
    </Pressable>
  );
}
