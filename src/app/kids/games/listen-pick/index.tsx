import { KidsSurahPicker } from "@/features/kids/ui/KidsSurahPicker";

/** The website's /kids/games/listen-pick: pick a surah for the listen-and-pick game. */
export default function KidsListenPickPickerScreen() {
  return <KidsSurahPicker hrefBase="/kids/games/listen-pick" title="اسمع واختر" subtitle="اختر سورة، واسمع آياتها، وابحث عن الآية التي سمعتها" showProgress={false} />;
}
