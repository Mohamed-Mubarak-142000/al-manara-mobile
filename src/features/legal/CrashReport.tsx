import Constants from "expo-constants";
import * as Device from "expo-device";
import { Bug, ChevronDown, ChevronLeft } from "lucide-react-native";
import { useState } from "react";
import { Platform, Pressable, Share, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import {
  buildCrashReportText,
  clearCrashLog,
  parseNativeReport,
  readCrashLog,
  type CrashEntry,
  type NativeReport,
} from "@/lib/crashLog";
import { useThemeColor } from "@/theme/useThemeColor";

import { background } from "../../../modules/almanara-background";

const REASONS: Record<string, string> = {
  LOW_MEMORY: "نفاد الذاكرة",
  CRASH: "عطل",
  CRASH_NATIVE: "عطل في النظام",
  ANR: "توقف عن الاستجابة",
  USER_REQUESTED: "أغلقه المستخدم",
  USER_STOPPED: "إيقاف إجباري",
  PERMISSION_CHANGE: "تغيّر إذن من الإعدادات",
  SIGNALED: "أوقفه النظام",
  EXIT_SELF: "خروج ذاتي",
  EXCESSIVE_RESOURCE_USAGE: "استهلاك مفرط",
  FREEZER: "تجميد في الخلفية",
  PACKAGE_UPDATED: "تحديث التطبيق",
  PACKAGE_STATE_CHANGE: "تغيّر حالة التطبيق",
  DEPENDENCY_DIED: "توقف خدمة مرتبطة",
  INITIALIZATION_FAILURE: "فشل التشغيل",
};

const KINDS: Record<CrashEntry["kind"], string> = {
  fatal: "خطأ قاتل",
  error: "خطأ",
  promise: "وعد مرفوض",
  boundary: "خطأ في الشاشة",
};

function arabicTime(at: number): string {
  try {
    return new Date(at).toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  } catch {
    return new Date(at).toISOString().slice(0, 16).replace("T", " ");
  }
}

function readNative(): NativeReport {
  try {
    return parseNativeReport(background?.getCrashReports?.());
  } catch {
    return { native: [], exits: [] };
  }
}

function Item({ time, title, detail }: { time: string; title: string; detail?: string }) {
  return (
    <View className="gap-0.5 border-b border-border py-2">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="font-sans-bold text-xs text-fg">{title}</Text>
        <Text className="font-sans text-[11px] text-fg-muted">{time}</Text>
      </View>
      {detail ? (
        <Text className="font-sans text-[11px] text-fg-muted" numberOfLines={2} style={{ writingDirection: "ltr", textAlign: "left" }}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

/** تقرير الأعطال: recent errors, native crashes and why Android ended the app, to share with us. */
export function CrashReport() {
  const muted = useThemeColor("fg-muted");
  const primary = useThemeColor("primary");
  const [open, setOpen] = useState(false);
  const [js, setJs] = useState<CrashEntry[]>([]);
  const [native, setNative] = useState<NativeReport>({ native: [], exits: [] });

  function toggle() {
    if (!open) {
      setJs(readCrashLog());
      setNative(readNative());
    }
    setOpen(!open);
  }

  function share() {
    const text = buildCrashReportText(
      {
        appVersion: Constants.expoConfig?.version ?? "?",
        os: `${Platform.OS} ${Platform.OS === "android" ? `API ${Platform.Version}` : Platform.Version}${Device.osVersion ? ` (${Device.osVersion})` : ""}`,
        device: [Device.manufacturer, Device.modelName].filter(Boolean).join(" ") || "?",
        now: Date.now(),
      },
      js,
      native,
    );
    void Share.share({ message: text }).catch(() => {});
  }

  function clear() {
    clearCrashLog();
    try {
      background?.clearCrashReports?.();
    } catch {
      // Older APK.
    }
    setJs([]);
    setNative({ native: [], exits: [] });
  }

  const empty = js.length === 0 && native.native.length === 0 && native.exits.length === 0;

  return (
    <View className="overflow-hidden rounded-3xl border border-border bg-surface">
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={toggle} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
        <View className="flex-row items-center gap-3 px-4 py-3.5">
          <View className="size-9 items-center justify-center rounded-xl bg-primary-soft">
            <Bug size={18} color={primary} />
          </View>
          <View className="flex-1">
            <Text className="font-display-bold text-[15px] text-fg">تقرير الأعطال</Text>
            <Text className="font-sans text-xs text-fg-muted">إن أُغلق التطبيق فجأة، أرسل لنا هذا التقرير</Text>
          </View>
          {open ? <ChevronDown size={18} color={muted} /> : <ChevronLeft size={18} color={muted} />}
        </View>
      </Pressable>

      {open && (
        <View className="gap-3 border-t border-border px-4 pb-4 pt-2">
          {empty ? (
            <Text className="py-2 font-sans text-xs text-fg-muted">لا توجد أعطال مسجّلة.</Text>
          ) : (
            <View>
              {native.exits.map((e) => (
                <Item key={`x${e.at}`} time={arabicTime(e.at)} title={`إغلاق: ${REASONS[e.reason] ?? e.reason}`} detail={e.description || undefined} />
              ))}
              {native.native.map((c) => (
                <Item key={`n${c.at}`} time={arabicTime(c.at)} title="عطل في التطبيق" detail={c.message} />
              ))}
              {js.map((e) => (
                <Item key={`j${e.at}${e.kind}`} time={arabicTime(e.at)} title={KINDS[e.kind] ?? e.kind} detail={`${e.route} · ${e.message}`} />
              ))}
            </View>
          )}
          <View className="flex-row gap-3">
            <Button size="sm" className="flex-1" onPress={share}>
              مشاركة التقرير
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onPress={clear} disabled={empty}>
              مسح
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}
