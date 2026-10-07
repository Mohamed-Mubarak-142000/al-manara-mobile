import type { Href } from "expo-router";
import {
  BookMarked,
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  CalendarRange,
  Clapperboard,
  Clock,
  Download,
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
  type LucideIcon,
} from "lucide-react-native";

export interface AppSection {
  label: string;
  description: string;
  icon: LucideIcon;
  /** Unset while the screen has not been built yet; the home grid then leaves the section out. */
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
  { label: "المحفوظات", icon: Download, description: "التلاوات والأحاديث المنزّلة للاستماع والقراءة دون إنترنت", href: "/downloads" },
  // The website's "الأطفال" (حديقة القرآن للأطفال) comes back here, with its href, once the screen exists.
];

export interface SectionGroup {
  title: string;
  /** Labels from APP_SECTIONS: one row of the home grid. */
  labels: readonly string[];
}

/** The home "أقسام المنارة" grid, one titled group per row. Every built section appears exactly once. */
export const SECTION_GROUPS: readonly SectionGroup[] = [
  { title: "القرآن", labels: ["المصحف", "الاستماع", "الإذاعة", "التسميع"] },
  { title: "يومك", labels: ["المواقيت", "الأذكار", "الأحاديث", "التقويم"] },
  { title: "رحلتك", labels: ["رحلتي", "خطة الحفظ", "الختمة", "الاختبارات"] },
  { title: "صوتيات", labels: ["ابتهالات", "تواشيح", "أدعية", "أذان"] },
  { title: "للعائلة", labels: ["القصص"] },
  { title: "على جهازك", labels: ["المحفوظات"] },
];
