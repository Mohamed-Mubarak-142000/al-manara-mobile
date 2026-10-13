import type { Href } from "expo-router";
import {
  BookHeart,
  BookMarked,
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  CalendarRange,
  CircleDot,
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
  ShieldCheck,
  Sparkles,
  Trees,
  type LucideIcon,
} from "lucide-react-native";

/** The colour of a section's icon circle: the tile-* tokens in src/global.css. */
export type SectionTone = "blue" | "teal" | "clay" | "purple" | "green" | "gold" | "rose" | "sky";

export interface AppSection {
  label: string;
  description: string;
  icon: LucideIcon;
  /** Chosen so neighbours on Home and in each group differ. */
  tone: SectionTone;
  /** Unset while the screen has not been built yet; the grids then leave the section out. */
  href?: Href;
}

/** The website's NAV_ITEMS and JOURNEY_ITEMS (src/components/site/nav.ts), with the same wording. */
export const APP_SECTIONS: readonly AppSection[] = [
  { label: "المصحف", icon: BookOpen, tone: "teal", description: "اقرأ القرآن الكريم في مصحف مصفّح", href: "/quran" },
  { label: "الاستماع", icon: Headphones, tone: "purple", description: "تلاوات لأكثر من مئتي قارئ", href: "/listen" },
  { label: "الإذاعة", icon: Radio, tone: "sky", description: "إذاعة القرآن الكريم بث مباشر", href: "/radio" },
  { label: "الأحاديث", icon: ScrollText, tone: "rose", description: "أحاديث نبوية مع شرحها وفوائدها", href: "/hadith" },
  {
    label: "ابتهالات",
    icon: MoonStar,
    tone: "blue",
    description: "ابتهالات كبار المبتهلين",
    href: { pathname: "/sounds/[category]", params: { category: "ibtihalat" } },
  },
  {
    label: "تواشيح",
    icon: MicVocal,
    tone: "purple",
    description: "تواشيح دينية بأصوات كبار المنشدين",
    href: { pathname: "/sounds/[category]", params: { category: "tawasheeh" } },
  },
  {
    label: "أدعية",
    icon: HandHeart,
    tone: "green",
    description: "أدعية وأذكار مسموعة",
    href: { pathname: "/sounds/[category]", params: { category: "duas" } },
  },
  { label: "دعاء ختم القرآن", icon: BookHeart, tone: "gold", description: "أدعية جامعة عند ختم القرآن", href: "/khatm-dua" },
  { label: "الرقية الشرعية", icon: ShieldCheck, tone: "clay", description: "رقية من القرآن والسنة الصحيحة", href: "/ruqyah" },
  {
    label: "أذان",
    icon: Landmark,
    tone: "sky",
    description: "الأذان بأصوات من العالم الإسلامي",
    href: { pathname: "/sounds/[category]", params: { category: "adhan" } },
  },
  { label: "المواقيت", icon: Clock, tone: "blue", description: "مواقيت الصلاة واتجاه القبلة", href: "/prayer" },
  { label: "التقويم", icon: CalendarDays, tone: "clay", description: "التقويم الهجري والميلادي", href: "/calendar" },
  { label: "الأذكار", icon: Sparkles, tone: "green", description: "أذكار وأدعية يومك", href: "/adhkar" },
  { label: "السبحة", icon: CircleDot, tone: "gold", description: "سبحة إلكترونية بأذكارك وعددك", href: "/tasbih" },
  { label: "القصص", icon: Clapperboard, tone: "rose", description: "قصص الأنبياء المصوّرة", href: "/stories" },
  { label: "رحلتي", icon: BookOpenCheck, tone: "teal", description: "حفظك وتسميعك وإنجازاتك", href: "/journey" },
  { label: "خطة الحفظ", icon: CalendarRange, tone: "blue", description: "وردك اليومي من الحفظ والمراجعة", href: "/plan" },
  { label: "الختمة", icon: BookMarked, tone: "purple", description: "اختم القرآن بوِرد يومي تختاره", href: "/khatma" },
  { label: "التسميع", icon: Mic, tone: "clay", description: "سمّع من حفظك بصوتك ونوقفك عند الخطأ", href: "/tasmee" },
  { label: "الاختبارات", icon: GraduationCap, tone: "gold", description: "اختبر حفظك جزءًا جزءًا واحصل على شهادة", href: "/exams" },
  {
    label: "المحفوظات",
    icon: Download,
    tone: "sky",
    description: "التلاوات والأحاديث المنزّلة للاستماع والقراءة دون إنترنت",
    href: "/downloads",
  },
  { label: "الأطفال", icon: Trees, tone: "green", description: "حديقة القرآن للأطفال", href: "/kids" },
];

export interface SectionGroup {
  title: string;
  /** Labels from APP_SECTIONS, in grid order. */
  labels: readonly string[];
}

/** The "كل الأقسام" screen, one titled grid per group. Every built section appears exactly once. */
export const SECTION_GROUPS: readonly SectionGroup[] = [
  { title: "القرآن", labels: ["المصحف", "الاستماع", "الإذاعة", "التسميع"] },
  { title: "يومك", labels: ["المواقيت", "الأذكار", "السبحة", "الأحاديث", "التقويم"] },
  { title: "رحلتك", labels: ["رحلتي", "خطة الحفظ", "الختمة", "الاختبارات"] },
  { title: "أدعية وابتهالات", labels: ["ابتهالات", "تواشيح", "أدعية", "دعاء ختم القرآن", "الرقية الشرعية", "أذان"] },
  { title: "للعائلة", labels: ["القصص", "الأطفال"] },
  { title: "على جهازك", labels: ["المحفوظات"] },
];

/** Home's flat grid: the sections most people open, three rows of three; the rest are a tap away. */
export const HOME_SECTIONS: readonly string[] = [
  "المصحف",
  "الاستماع",
  "الأذكار",
  "المواقيت",
  "السبحة",
  "الرقية الشرعية",
  "الأحاديث",
  "الإذاعة",
  "الختمة",
];

/** The built sections for these labels, in order. */
export function sectionsFor(labels: readonly string[]): AppSection[] {
  return labels
    .map((label) => APP_SECTIONS.find((section) => section.label === label))
    .filter((section): section is AppSection => section?.href !== undefined);
}
