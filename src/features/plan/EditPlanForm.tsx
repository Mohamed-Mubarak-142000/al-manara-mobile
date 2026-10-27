import { useState } from "react";
import { Text, View } from "react-native";

import { PAGES_PER_DAY_OPTIONS, pagesLabel, unitsLabel } from "@/core/plan/schedule";
import { Button } from "@/components/ui/Button";

import { Chip, DaysPicker, FAR_OPTIONS, Field, PriorPicker, REVIEW_OPTIONS } from "./CreatePlanForm";
import { planActions } from "./planStore";
import type { TodayView } from "./view";

/**
 * Changes the running plan without starting over (the website's EditPlanForm): how much to memorize a
 * day, how many older pages to review, the days, and the surahs known from before — add one memorized
 * elsewhere and it joins the review rotation.
 */
export function EditPlanForm({ kind, settings, onDone }: { kind: TodayView["kind"]; settings: TodayView["settings"]; onDone: () => void }) {
  const [unitsPerDay, setUnitsPerDay] = useState(settings.unitsPerDay);
  const [farPages, setFarPages] = useState(settings.farPages);
  const [priorSurahs, setPriorSurahs] = useState(settings.priorSurahs);
  const [priorJuz, setPriorJuz] = useState(settings.priorJuz);
  const [newDays, setNewDays] = useState(settings.newDays);
  const [reviewDays, setReviewDays] = useState(settings.reviewDays);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const memorize = kind === "memorize";

  async function save() {
    setBusy(true);
    setError(null);
    const result = await planActions.update({ unitsPerDay, farPages, priorSurahs, priorJuz, newDays, reviewDays });
    setBusy(false);
    if (result.ok) onDone();
    else setError(result.error);
  }

  return (
    <View className="gap-5 rounded-3xl border border-border bg-surface p-5 shadow-card">
      <View>
        <Text accessibilityRole="header" className="font-sans-bold text-lg text-fg">
          تعديل الخطة
        </Text>
        <Text className="mt-1 font-sans text-sm leading-6 text-fg-muted">
          يبقى ما أنجزته في الخطة كما هو، وتسري التعديلات من وردك القادم.
        </Text>
      </View>
      {memorize && (
        <Field label="أحفظ في كل يوم حفظ">
          <View className="flex-row flex-wrap gap-2">
            {PAGES_PER_DAY_OPTIONS.map((units) => (
              <Chip key={units} label={unitsLabel(units)} active={unitsPerDay === units} onPress={() => setUnitsPerDay(units)} />
            ))}
          </View>
        </Field>
      )}
      <Field label={memorize ? "مراجعة ما حفظته سابقًا في كل يوم مراجعة" : "أراجع في كل يوم مراجعة"}>
        <View className="flex-row flex-wrap gap-2">
          {(memorize ? FAR_OPTIONS : REVIEW_OPTIONS).map((count) => (
            <Chip
              key={count}
              label={count === 0 ? "بدون" : count === 20 && !memorize ? "جزءًا كاملًا (٢٠ صفحة)" : pagesLabel(count)}
              active={farPages === count}
              onPress={() => setFarPages(count)}
            />
          ))}
        </View>
      </Field>
      <Field
        label={memorize ? "ما حفظته من قبل (يدخل في المراجعة)" : "ما تحفظه من القرآن"}
        hint="ما تضيفه هنا يدخل في مراجعة «البعيد» بالتناوب، ويُحسب محفوظًا في «رحلتي»."
      >
        <PriorPicker juz={priorJuz} surahs={priorSurahs} onJuz={setPriorJuz} onSurahs={setPriorSurahs} />
      </Field>
      {memorize && (
        <Field label="أيام الحفظ">
          <DaysPicker days={newDays} onChange={setNewDays} />
        </Field>
      )}
      <Field label="أيام المراجعة">
        <DaysPicker days={reviewDays} onChange={setReviewDays} />
      </Field>
      {error ? <Text className="font-sans text-sm text-danger">{error}</Text> : null}
      <View className="flex-row flex-wrap gap-3">
        <Button onPress={save} disabled={busy}>
          {busy ? "جارٍ الحفظ…" : "حفظ التعديلات"}
        </Button>
        <Button variant="ghost" onPress={onDone}>
          إلغاء
        </Button>
      </View>
    </View>
  );
}
