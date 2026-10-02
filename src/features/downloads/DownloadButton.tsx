import { Check, Download, RotateCcw } from "lucide-react-native";
import { Pressable, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useThemeColor } from "@/theme/useThemeColor";

import { downloads, useDownload } from "./downloadStore";

interface Downloadable {
  id: string;
  title: string;
  artist: string;
  url: string;
}

const R = 15;
const C = 2 * Math.PI * R;

/** Download → progress ring (tap to cancel) → check (long-press to delete). */
export function DownloadButton({ track, tone = "dark" }: { track: Downloadable; tone?: "light" | "dark" }) {
  const entry = useDownload(track.id);
  const primary = useThemeColor("primary");
  const muted = useThemeColor("fg-muted");
  const gold = useThemeColor("gold");
  const idle = tone === "light" ? "#fbf8f1" : muted;
  const done = tone === "light" ? gold : primary;

  if (entry?.status === "active") {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel="إلغاء التنزيل" hitSlop={8} onPress={() => downloads.cancel(track.id)}>
        <View className="size-9 items-center justify-center">
          <Svg width={36} height={36} viewBox="0 0 36 36" style={{ transform: [{ rotate: "-90deg" }] }}>
            <Circle
              cx={18}
              cy={18}
              r={R}
              stroke={tone === "light" ? "rgba(255,255,255,0.2)" : "rgba(104,118,110,0.25)"}
              strokeWidth={3}
              fill="none"
            />
            <Circle
              cx={18}
              cy={18}
              r={R}
              stroke={gold}
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - entry.progress)}
            />
          </Svg>
          <View className={`absolute size-2.5 rounded-[2px] ${tone === "light" ? "bg-white" : "bg-fg-muted"}`} />
        </View>
      </Pressable>
    );
  }

  if (entry?.status === "done") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="محفوظ على الجهاز، اضغط مطولًا للحذف"
        hitSlop={8}
        onLongPress={() => downloads.remove(track.id)}
        className="size-9 items-center justify-center"
      >
        <Check size={20} color={done} />
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={entry?.status === "failed" ? "إعادة محاولة التنزيل" : "تنزيل للاستماع دون إنترنت"}
      hitSlop={8}
      onPress={() => downloads.start(track)}
      className="size-9 items-center justify-center"
    >
      {entry?.status === "failed" ? <RotateCcw size={19} color={idle} /> : <Download size={20} color={idle} />}
    </Pressable>
  );
}
