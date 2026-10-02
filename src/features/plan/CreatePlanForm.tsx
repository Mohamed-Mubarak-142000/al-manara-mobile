import { Check, Repeat, Sprout, X } from "lucide-react-native";
import { useMemo, useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ALL_DAYS, PAGES_PER_DAY_OPTIONS, WEEKDAY_NAMES, WEEK_ORDER, pagesLabel, unitsLabel } from "@/core/plan/schedule";
import { toArabicDigits } from "@/core/text/arabic";
import { normalizeArabic } from "@/core/text/normalizeArabic";
import { Button } from "@/components/ui/Button";
import { SearchField } from "@/components/ui/SearchField";
import { getSurahs } from "@/features/mushaf/mushaf";
import { useThemeColor } from "@/theme/useThemeColor";

import { planActions, type NewPlan } from "./planStore";

const FAR_OPTIONS = [0, 1, 2, 3, 5, 10, 20];
const REVIEW_OPTIONS = [1, 2, 3, 4, 5, 10, 20];
const JUZ = Array.from({ length: 30 }, (_, index) => index + 1);

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`rounded-full border px-3.5 py-2 ${active ? "border-primary bg-primary" : "border-border bg-surface"}`}
    >
      <Text className={`font-sans-bold text-sm ${active ? "text-on-primary" : "text-fg"}`}>{label}</Text>
    </Pressable>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="font-sans-bold text-sm text-fg">{label}</Text>
      {children}
      {hint ? <Text className="font-sans text-xs leading-5 text-fg-muted">{hint}</Text> : null}
    </View>
  );
}

function DaysPicker({ days, onChange }: { days: number[]; onChange: (days: number[]) => void }) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {WEEK_ORDER.map((day) => {
        const on = days.includes(day);
        return (
          <Pressable
            key={day}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(on ? days.filter((entry) => entry !== day) : [...days, day])}
            className={`rounded-full border px-3 py-1.5 ${on ? "border-primary bg-primary-soft" : "border-border bg-surface"}`}
          >
            <Text className={`font-sans-bold text-xs ${on ? "text-primary" : "text-fg-muted"}`}>{WEEKDAY_NAMES[day]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Whole juz by tap, or surahs from a searchable list: what the learner already knows. */
function PriorPicker({
  juz,
  surahs,
  onJuz,
  onSurahs,
}: {
  juz: number[];
  surahs: number[];
  onJuz: (juz: number[]) => void;
  onSurahs: (surahs: number[]) => void;
}) {
  const insets = useSafeAreaInsets();
  const primary = useThemeColor("primary");
  const muted = useThemeColor("fg-muted");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const list = useMemo(() => {
    const needle = normalizeArabic(query.trim());
    return getSurahs().filter((surah) => !needle || normalizeArabic(surah.name).includes(needle));
  }, [query]);
  const toggle = <T,>(values: T[], value: T) => (values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value]);

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-1.5">
        {JUZ.map((number) => {
          const on = juz.includes(number);
          return (
            <Pressable
              key={number}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`الجزء ${number}`}
              onPress={() => onJuz(toggle(juz, number))}
              className={`size-10 items-center justify-center rounded-xl border ${on ? "border-primary bg-primary" : "border-border bg-surface"}`}
            >
              <Text className={`font-display-bold text-sm ${on ? "text-on-primary" : "text-fg"}`}>{toArabicDigits(number)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Button variant="outline" size="sm" className="self-start" onPress={() => setOpen(true)}>
        {surahs.length ? `السور المختارة: ${toArabicDigits(surahs.length)}` : "اختر سورًا بعينها"}
      </Button>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }}>
          <View className="flex-row items-center justify-between px-4 pb-3">
            <Text className="font-display-bold text-xl text-fg">السور التي تحفظها</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="إغلاق" onPress={() => setOpen(false)} hitSlop={10}>
              <X size={24} color={muted} />
            </Pressable>
          </View>
          <View className="px-4 pb-3">
            <SearchField value={query} onChangeText={setQuery} placeholder="ابحث عن سورة" />
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }} keyboardShouldPersistTaps="handled">
            {list.map((surah) => {
              const on = surahs.includes(surah.number);
              return (
                <Pressable
                  key={surah.number}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => onSurahs(toggle(surahs, surah.number))}
                  className={`flex-row items-center justify-between rounded-2xl border px-4 py-3 ${on ? "border-primary bg-primary-soft" : "border-border bg-surface"}`}
                >
                  <Text className="font-display-bold text-base text-fg">
                    {toArabicDigits(surah.number)}. سورة {surah.name}
                  </Text>
                  {on && <Check size={18} color={primary} />}
                </Pressable>
              );
            })}
          </ScrollView>
          <View className="px-4 pt-3">
            <Button onPress={() => setOpen(false)}>تم</Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** The website's CreatePlanForm: new memorization, or consolidating what is already memorized. */
export function CreatePlanForm() {
  const onPrimary = useThemeColor("on-primary");
  const accent = useThemeColor("accent-strong");
  const [kind, setKind] = useState<NewPlan["kind"]>("memorize");
  const [startJuz, setStartJuz] = useState(30);
  const [endJuz, setEndJuz] = useState(30);
  const [unitsPerDay, setUnitsPerDay] = useState(2);
  const [farPages, setFarPages] = useState(2);
  const [priorJuz, setPriorJuz] = useState<number[]>([]);
  const [priorSurahs, setPriorSurahs] = useState<number[]>([]);
  const [newDays, setNewDays] = useState<number[]>([...ALL_DAYS]);
  const [reviewDays, setReviewDays] = useState<number[]>([...ALL_DAYS]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    const result = await planActions.create({
      kind,
      startJuz,
      endJuz,
      unitsPerDay,
      farPages: kind === "review" ? Math.max(1, farPages) : farPages,
      priorJuz,
      priorSurahs,
      newDays,
      reviewDays,
    });
    setBusy(false);
    if (!result.ok) setError(result.error);
  }

  const kinds: [NewPlan["kind"], string, string, typeof Sprout][] = [
    ["memorize", "حفظ جديد", "أحفظ أجزاءً جديدة مع مراجعة ما أحفظه.", Sprout],
    ["review", "تثبيت الحفظ", "أحفظ سورًا أو أجزاءً من قبل وأريد تثبيتها بالمراجعة.", Repeat],
  ];

  return (
    <View className="gap-5">
      {kinds.map(([value, title, text, Icon]) => {
        const active = kind === value;
        return (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => {
              setKind(value);
              if (value === "review" && farPages === 0) setFarPages(2);
            }}
            className={`flex-row items-start gap-3 rounded-3xl border p-4 ${active ? "border-primary bg-primary-soft" : "border-border bg-surface"}`}
          >
            <View className={`size-10 items-center justify-center rounded-2xl ${active ? "bg-primary" : "bg-accent-soft"}`}>
              <Icon size={20} color={active ? onPrimary : accent} />
            </View>
            <View className="flex-1">
              <Text className="font-display-bold text-base text-fg">{title}</Text>
              <Text className="mt-0.5 font-sans text-xs leading-5 text-fg-muted">{text}</Text>
            </View>
          </Pressable>
        );
      })}

      {kind === "memorize" ? (
        <>
          <Field label="من الجزء">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {JUZ.map((juz) => (
                <Chip
                  key={juz}
                  label={toArabicDigits(juz)}
                  active={startJuz === juz}
                  onPress={() => {
                    setStartJuz(juz);
                    if (endJuz < juz) setEndJuz(juz);
                  }}
                />
              ))}
            </ScrollView>
          </Field>
          <Field label="إلى الجزء">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {JUZ.filter((juz) => juz >= startJuz).map((juz) => (
                <Chip key={juz} label={toArabicDigits(juz)} active={endJuz === juz} onPress={() => setEndJuz(juz)} />
              ))}
            </ScrollView>
          </Field>
          <Field label="أحفظ في كل يوم حفظ">
            <View className="flex-row flex-wrap gap-2">
              {PAGES_PER_DAY_OPTIONS.map((units) => (
                <Chip key={units} label={unitsLabel(units)} active={unitsPerDay === units} onPress={() => setUnitsPerDay(units)} />
              ))}
            </View>
          </Field>
          <Field label="مراجعة ما حفظته سابقًا في كل يوم مراجعة" hint="إلى جانب مراجعة ما حفظته في آخر ٥ أيام حفظ تلقائيًا.">
            <View className="flex-row flex-wrap gap-2">
              {FAR_OPTIONS.map((count) => (
                <Chip
                  key={count}
                  label={count === 0 ? "بدون" : pagesLabel(count)}
                  active={farPages === count}
                  onPress={() => setFarPages(count)}
                />
              ))}
            </View>
          </Field>
          <Field label="أجزاء أو سور حفظتها من قبل (اختياري)" hint="تدخل في مراجعة «البعيد» من اليوم الأول، وتُحسب محفوظةً في رحلتك.">
            <PriorPicker juz={priorJuz} surahs={priorSurahs} onJuz={setPriorJuz} onSurahs={setPriorSurahs} />
          </Field>
          <Field label="أيام الحفظ">
            <DaysPicker days={newDays} onChange={setNewDays} />
          </Field>
        </>
      ) : (
        <>
          <Field label="ما تحفظه من القرآن" hint="تُحسب محفوظةً في رحلتك، ويُفتح لك اختبار أجزائها.">
            <PriorPicker juz={priorJuz} surahs={priorSurahs} onJuz={setPriorJuz} onSurahs={setPriorSurahs} />
          </Field>
          <Field label="أراجع في كل يوم مراجعة">
            <View className="flex-row flex-wrap gap-2">
              {REVIEW_OPTIONS.map((count) => (
                <Chip
                  key={count}
                  label={count === 20 ? "جزءًا كاملًا (٢٠ صفحة)" : pagesLabel(count)}
                  active={farPages === count}
                  onPress={() => setFarPages(count)}
                />
              ))}
            </View>
          </Field>
        </>
      )}
      <Field label="أيام المراجعة">
        <DaysPicker days={reviewDays} onChange={setReviewDays} />
      </Field>

      {error ? <Text className="font-sans text-sm text-danger">{error}</Text> : null}
      <Button size="lg" onPress={submit} disabled={busy}>
        {busy ? "جارٍ الحفظ…" : "ابدأ الخطة"}
      </Button>
    </View>
  );
}
