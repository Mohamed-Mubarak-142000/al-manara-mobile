import { KidsSurahPicker } from "@/features/kids/ui/KidsSurahPicker";

/** The website's /kids/games/tajweed: pick a surah for the tajweed colouring game. */
export default function KidsTajweedPickerScreen() {
  return (
    <KidsSurahPicker
      hrefBase="/kids/games/tajweed"
      title="لوّن التجويد"
      subtitle="اختر سورة لتكتشف أحكام التجويد فيها"
      showProgress={false}
    />
  );
}
