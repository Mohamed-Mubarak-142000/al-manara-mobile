import { KidsSurahPicker } from "@/features/kids/ui/KidsSurahPicker";

/** The website's /kids/learn: pick a surah to learn. */
export default function KidsLearnPickerScreen() {
  return (
    <KidsSurahPicker
      hrefBase="/kids/learn"
      art="📖"
      title="اختر سورة لتتعلّمها"
      subtitle="استمع لكل آية مع الشيخ وردّدها، ثم انجح في اختبار السورة لتفتح التالية."
      levels
    />
  );
}
