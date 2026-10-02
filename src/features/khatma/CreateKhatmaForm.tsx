import { CalendarClock, ListOrdered } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { PER_SESSION_OPTIONS, UNIT_TOTALS, amountLabel, pagesForDuration, pagesInJuz } from "@/core/khatma/schedule";
import { ALL_DAYS, WEEKDAY_NAMES, WEEK_ORDER, finishDay, planDay, shiftDay } from "@/core/plan/schedule";
import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import type { KhatmaUnit } from "@/lib/database.types";
import { useThemeColor } from "@/theme/useThemeColor";

import { khatma, type NewKhatma } from "./khatmaStore";

type Mode = NewKhatma["mode"];

const UNIT_NAMES: Record<KhatmaUnit, string> = { pages: "صفحات", hizb: "أحزاب", juz: "أجزاء", surah: "سور" };
const QUICK_DURATIONS: [label: string, days: number][] = [
  ["أسبوع", 7],
  ["١٥ يومًا", 15],
  ["شهر", 30],
  ["شهران", 60],
];
const DATE_FORMAT = new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export function formatDay(day: string): string {
  try {
    return DATE_FORMAT.format(new Date(`${day}T00:00:00Z`));
  } catch {
    return day;
  }
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`rounded-full border px-4 py-2 ${active ? "border-primary bg-primary" : "border-border bg-surface"}`}
    >
      <Text className={`font-sans-bold text-sm ${active ? "text-on-primary" : "text-fg"}`}>{label}</Text>
    </Pressable>
  );
}

function ModeOption({
  active,
  onPress,
  icon,
  title,
  text,
}: {
  active: boolean;
  onPress: () => void;
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`flex-row items-start gap-3 rounded-3xl border p-4 ${active ? "border-primary bg-primary-soft" : "border-border bg-surface"}`}
    >
      <View className={`size-10 items-center justify-center rounded-2xl ${active ? "bg-primary" : "bg-accent-soft"}`}>{icon}</View>
      <View className="flex-1">
        <Text className="font-display-bold text-base text-fg">{title}</Text>
        <Text className="mt-0.5 font-sans text-xs leading-5 text-fg-muted">{text}</Text>
      </View>
    </Pressable>
  );
}

/** The website's CreateKhatmaForm: a daily amount or a finish date, plus reading days, with a live preview. */
export function CreateKhatmaForm() {
  const onPrimary = useThemeColor("on-primary");
  const accent = useThemeColor("accent-strong");
  const [mode, setMode] = useState<Mode>("amount");
  const [unit, setUnit] = useState<KhatmaUnit>("juz");
  const [perSession, setPerSession] = useState(1);
  const [days, setDays] = useState<number[]>([...ALL_DAYS]);
  const [targetDay, setTargetDay] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = planDay();

  const sessions = Math.ceil(UNIT_TOTALS[unit] / perSession);
  const finish = finishDay(sessions, days, today, false);
  const durationPages = targetDay ? pagesForDuration(today, targetDay, days) : null;
  const juzHint = durationPages ? pagesInJuz(durationPages) : null;

  async function submit() {
    setBusy(true);
    setError(null);
    const result = await khatma.create({ mode, unit, perSession, targetDay, days });
    setBusy(false);
    if (!result.ok) setError(result.error);
  }

  return (
    <View className="gap-4">
      <ModeOption
        active={mode === "amount"}
        onPress={() => setMode("amount")}
        icon={<ListOrdered size={20} color={mode === "amount" ? onPrimary : accent} />}
        title="أقرأ كل يوم مقدارًا"
        text="صفحات أو أحزابًا أو أجزاءً أو سورًا، ونحسب لك موعد الختم."
      />
      <ModeOption
        active={mode === "duration"}
        onPress={() => setMode("duration")}
        icon={<CalendarClock size={20} color={mode === "duration" ? onPrimary : accent} />}
        title="أختم في مدة"
        text="اختر متى تريد أن تختم، ونقسم لك المصحف على أيامك."
      />

      {mode === "amount" ? (
        <>
          <Text className="font-sans-bold text-sm text-fg">أقرأ بـ</Text>
          <View className="flex-row flex-wrap gap-2">
            {(Object.keys(UNIT_NAMES) as KhatmaUnit[]).map((key) => (
              <Chip
                key={key}
                label={UNIT_NAMES[key]}
                active={unit === key}
                onPress={() => {
                  setUnit(key);
                  setPerSession(PER_SESSION_OPTIONS[key][0]!);
                }}
              />
            ))}
          </View>
          <Text className="font-sans-bold text-sm text-fg">مقدار كل يوم</Text>
          <View className="flex-row flex-wrap gap-2">
            {PER_SESSION_OPTIONS[unit].map((count) => (
              <Chip key={count} label={amountLabel(unit, count)} active={perSession === count} onPress={() => setPerSession(count)} />
            ))}
          </View>
        </>
      ) : (
        <>
          <Text className="font-sans-bold text-sm text-fg">أختم خلال</Text>
          <View className="flex-row flex-wrap gap-2">
            {QUICK_DURATIONS.map(([label, count]) => {
              const day = shiftDay(today, count - 1);
              return <Chip key={label} label={label} active={targetDay === day} onPress={() => setTargetDay(day)} />;
            })}
          </View>
        </>
      )}

      <Text className="font-sans-bold text-sm text-fg">أيام القراءة</Text>
      <View className="flex-row flex-wrap gap-2">
        {WEEK_ORDER.map((day) => {
          const on = days.includes(day);
          return (
            <Pressable
              key={day}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => setDays(on ? days.filter((entry) => entry !== day) : [...days, day])}
              className={`rounded-full border px-3 py-1.5 ${on ? "border-primary bg-primary-soft" : "border-border bg-surface"}`}
            >
              <Text className={`font-sans-bold text-xs ${on ? "text-primary" : "text-fg-muted"}`}>{WEEKDAY_NAMES[day]}</Text>
            </Pressable>
          );
        })}
      </View>

      <View className="rounded-2xl bg-accent-soft p-4">
        <Text className="font-sans text-sm leading-6 text-accent-strong">
          {mode === "amount"
            ? finish
              ? `تختم بإذن الله يوم ${formatDay(finish)} (${toArabicDigits(sessions)} يوم قراءة).`
              : "اختر يومًا واحدًا على الأقل للقراءة."
            : durationPages
              ? `وردك اليومي ${amountLabel("pages", durationPages)}${juzHint ? ` (${juzHint})` : ""}، وتختم يوم ${formatDay(targetDay)}.`
              : "اختر مدة الختمة."}
        </Text>
      </View>

      {error ? <Text className="font-sans text-sm text-danger">{error}</Text> : null}
      <Button size="lg" onPress={submit} disabled={busy}>
        {busy ? "جارٍ الحفظ…" : "ابدأ الختمة"}
      </Button>
    </View>
  );
}
