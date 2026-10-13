import { KidsSurahPicker } from "@/features/kids/ui/KidsSurahPicker";

/** The website's /kids/games/ayah-order: pick a surah for the ayah-order game. */
export default function KidsAyahOrderPickerScreen() {
  return <KidsSurahPicker hrefBase="/kids/games/ayah-order" title="رتّب الآيات" subtitle="اختر سورة، ورتّب آياتها كما في المصحف" showProgress={false} />;
}
