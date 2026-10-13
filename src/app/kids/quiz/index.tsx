import { KidsSurahPicker } from "@/features/kids/ui/KidsSurahPicker";

/** The website's /kids/quiz: pick a surah to test. */
export default function KidsQuizPickerScreen() {
  return <KidsSurahPicker hrefBase="/kids/quiz" title="اختبر نفسك" subtitle="انجح في اختبار السورة لتفتح السورة التالية." levels />;
}
