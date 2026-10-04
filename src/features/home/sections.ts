import type { Href } from "expo-router";
import {
  BookMarked,
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  CalendarRange,
  Clapperboard,
  Clock,
  GraduationCap,
  HandHeart,
  Headphones,
  Landmark,
  Mic,
  MicVocal,
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

/** The website's NAV_ITEMS and JOURNEY_ITEMS (src/components/site/nav.ts), with the same wording. */
export const APP_SECTIONS: readonly AppSection[] = [
  { label: "المصحف", icon: BookOpen, description: "اقرأ القرآن الكريم في مصحف مصفّح", href: "/quran" },
  { label: "الاستماع", icon: Headphones, description: "تلاوات لأكثر من مئتي قارئ", href: "/listen" },
  { label: "الإذاعة", icon: Radio, description: "إذاعة القرآن الكريم بث مباشر", href: "/radio" },
  { label: "الأحاديث", icon: ScrollText, description: "أحاديث نبوية مع شرحها وفوائدها", href: "/hadith" },
  {
    label: "ابتهالات",
    icon: MoonStar,
    description: "ابتهالات كبار المبتهلين",
    href: { pathname: "/sounds/[category]", params: { category: "ibtihalat" } },
  },
  {
    label: "تواشيح",
    icon: MicVocal,
    description: "تواشيح دينية بأصوات كبار المنشدين",
    href: { pathname: "/sounds/[category]", params: { category: "tawasheeh" } },
  },
  {
    label: "أدعية",
    icon: HandHeart,
    description: "أدعية وأذكار مسموعة",
    href: { pathname: "/sounds/[category]", params: { category: "duas" } },
  },
  {
    label: "أذان",
    icon: Landmark,
    description: "الأذان بأصوات من العالم الإسلامي",
    href: { pathname: "/sounds/[category]", params: { category: "adhan" } },
  },
  { label: "المواقيت", icon: Clock, description: "مواقيت الصلاة واتجاه القبلة", href: "/prayer" },
  { label: "التقويم", icon: CalendarDays, description: "التقويم الهجري والميلادي", href: "/calendar" },
  { label: "الأذكار", icon: Sparkles, description: "أذكار وأدعية يومك", href: "/adhkar" },
  { label: "القصص", icon: Clapperboard, description: "قصص الأنبياء المصوّرة", href: "/stories" },
  { label: "رحلتي", icon: BookOpenCheck, description: "حفظك وتسميعك وإنجازاتك", href: "/journey" },
  { label: "خطة الحفظ", icon: CalendarRange, description: "وردك اليومي من الحفظ والمراجعة", href: "/plan" },
  { label: "الختمة", icon: BookMarked, description: "اختم القرآن بوِرد يومي تختاره", href: "/khatma" },
  { label: "التسميع", icon: Mic, description: "سمّع من حفظك بصوتك ونوقفك عند الخطأ", href: "/tasmee" },
  { label: "الاختبارات", icon: GraduationCap, description: "اختبر حفظك جزءًا جزءًا واحصل على شهادة", href: "/exams" },
  { label: "الأطفال", icon: Trees, description: "حديقة القرآن للأطفال" },
];
