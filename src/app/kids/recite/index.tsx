import { KidsSurahPicker } from "@/features/kids/ui/KidsSurahPicker";

/** The website's /kids/recite: pick a surah to recite. */
export default function KidsRecitePickerScreen() {
  return <KidsSurahPicker hrefBase="/kids/recite" art="🎤" title="سمّعني" subtitle="اختر سورة واقرأها بصوتك، ورفيقك يسمعك" />;
}
