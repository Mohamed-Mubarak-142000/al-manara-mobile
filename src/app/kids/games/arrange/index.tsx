import { KidsSurahPicker } from "@/features/kids/ui/KidsSurahPicker";

/** The website's /kids/games/arrange: pick a surah for the word-arranging game. */
export default function KidsArrangePickerScreen() {
  return <KidsSurahPicker hrefBase="/kids/games/arrange" title="رتّب الآية" subtitle="اختر سورة ورتّب كلمات آياتها" showProgress={false} />;
}
