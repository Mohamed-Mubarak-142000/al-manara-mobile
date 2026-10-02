import type { Href } from "expo-router";
import {
  BookMarked,
  BookOpen,
  CalendarDays,
  CalendarRange,
  Clock,
  GraduationCap,
  Headphones,
  Mic,
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
  { label: "الختمة", icon: BookMarked, description: "اختم القرآن بوِرد يومي تختاره", href: "/khatma" },
  { label: "الاستماع", icon: Headphones, description: "تلاوات لأكثر من مئتي قارئ", href: "/listen" },
  { label: "الإذاعة", icon: Radio, description: "إذاعة القرآن الكريم بث مباشر" },
  { label: "الأحاديث", icon: ScrollText, description: "أحاديث نبوية مع شرحها وفوائدها" },
  { label: "ابتهالات", icon: MoonStar, description: "ابتهالات كبار المبتهلين" },
  { label: "المواقيت", icon: Clock, description: "مواقيت الصلاة واتجاه القبلة", href: "/prayer" },
  { label: "التقويم", icon: CalendarDays, description: "التقويم الهجري والميلادي" },
  { label: "الأذكار", icon: Sparkles, description: "أذكار وأدعية يومك", href: "/adhkar" },
  { label: "خطة الحفظ", icon: CalendarRange, description: "وردك اليومي من الحفظ والمراجعة", href: "/plan" },
  { label: "التسميع", icon: Mic, description: "سمّع من حفظك بصوتك ونوقفك عند الخطأ", href: "/tasmee" },
  { label: "الاختبارات", icon: GraduationCap, description: "اختبر حفظك جزءًا جزءًا واحصل على شهادة", href: "/exams" },
  { label: "الأطفال", icon: Trees, description: "حديقة القرآن للأطفال" },
];
