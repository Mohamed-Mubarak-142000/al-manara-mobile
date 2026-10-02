import type { Href } from "expo-router";
import {
  BookOpen,
  CalendarDays,
  Clock,
  Headphones,
  MoonStar,
  Radio,
  ScrollText,
  Sparkles,
  Trees,
  type LucideIcon,
} from "lucide-react-native";

export interface AppSection {
  label: string;
  description: string;
  icon: LucideIcon;
  /** Unset while the screen has not been built yet; the card then shows "قريبًا". */
  href?: Href;
}

/** The website's NAV_ITEMS (src/components/site/nav.ts), in the same order and wording. */
export const APP_SECTIONS: readonly AppSection[] = [
  { label: "المصحف", icon: BookOpen, description: "اقرأ القرآن الكريم في مصحف مصفّح", href: "/quran" },
  { label: "الاستماع", icon: Headphones, description: "تلاوات لأكثر من مئتي قارئ", href: "/listen" },
  { label: "الإذاعة", icon: Radio, description: "إذاعة القرآن الكريم بث مباشر" },
  { label: "الأحاديث", icon: ScrollText, description: "أحاديث نبوية مع شرحها وفوائدها" },
  { label: "ابتهالات", icon: MoonStar, description: "ابتهالات كبار المبتهلين" },
  { label: "المواقيت", icon: Clock, description: "مواقيت الصلاة واتجاه القبلة", href: "/prayer" },
  { label: "التقويم", icon: CalendarDays, description: "التقويم الهجري والميلادي" },
  { label: "الأذكار", icon: Sparkles, description: "أذكار وأدعية يومك", href: "/adhkar" },
  { label: "الأطفال", icon: Trees, description: "حديقة القرآن للأطفال" },
];
