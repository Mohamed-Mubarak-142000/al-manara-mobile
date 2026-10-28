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
  Milestone,
  Mic,
  MicVocal,
  MoonStar,
  Plane,
  NotebookText,
  Radio,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Trees,
  type LucideIcon,
} from "lucide-react-native";

import type { SectionArt } from "./sectionArt";

/** The colour of a section's icon circle: the tile-* tokens in src/global.css. */
export type SectionTone = "blue" | "teal" | "clay" | "purple" | "green" | "gold" | "rose" | "sky";

export interface AppSection {
  label: string;
  description: string;
  icon: LucideIcon;
  /** Chosen so neighbours on Home and in each group differ. */
  tone: SectionTone;
  /** Its 3D illustration (sectionArt.ts). */
  art: SectionArt;
  /** Unset while the screen has not been built yet; the grids then leave the section out. */
  href?: Href;
}

/** The website's NAV_ITEMS and JOURNEY_ITEMS (src/components/site/nav.ts), with the same wording. */
export const APP_SECTIONS: readonly AppSection[] = [
  { label: "المصحف", icon: BookOpen, tone: "teal", art: "quran", description: "اقرأ القرآن الكريم في مصحف مصفّح", href: "/quran" },
  { label: "الاستماع", icon: Headphones, tone: "purple", art: "listen", description: "تلاوات لأكثر من مئتي قارئ", href: "/listen" },
  { label: "الإذاعة", icon: Radio, tone: "sky", art: "radio", description: "إذاعة القرآن الكريم بث مباشر", href: "/radio" },
  { label: "الأحاديث", icon: ScrollText, tone: "rose", art: "hadith", description: "أحاديث نبوية مع شرحها وفوائدها", href: "/hadith" },
  {
    label: "الأربعون النووية",
    icon: NotebookText,
    tone: "teal",
    art: "nawawi",
    description: "الأحاديث الأربعون بشرحها، باختبار وشهادة",
    href: "/nawawi",
  },
  {
    label: "ابتهالات",
    icon: MoonStar,
    tone: "blue",
    art: "ibtihalat",
    description: "ابتهالات كبار المبتهلين",
    href: { pathname: "/sounds/[category]", params: { category: "ibtihalat" } },
  },
  {
    label: "تواشيح",
    icon: MicVocal,
    tone: "purple",
    art: "tawasheeh",
    description: "تواشيح دينية بأصوات كبار المنشدين",
    href: { pathname: "/sounds/[category]", params: { category: "tawasheeh" } },
  },
  {
    label: "أدعية",
    icon: HandHeart,
    tone: "green",
    art: "duas",
    description: "أدعية وأذكار مسموعة",
    href: { pathname: "/sounds/[category]", params: { category: "duas" } },
  },
  {
    label: "دعاء ختم القرآن",
    icon: BookHeart,
    tone: "gold",
    art: "khatm-dua",
    description: "أدعية جامعة عند ختم القرآن",
    href: "/khatm-dua",
  },
  {
    label: "الرقية الشرعية",
    icon: ShieldCheck,
    tone: "clay",
    art: "ruqyah",
    description: "رقية من القرآن والسنة الصحيحة",
    href: "/ruqyah",
  },
  {
    label: "أذان",
    icon: Landmark,
    tone: "sky",
    art: "adhan",
    description: "الأذان بأصوات من العالم الإسلامي",
    href: { pathname: "/sounds/[category]", params: { category: "adhan" } },
  },
  { label: "المواقيت", icon: Clock, tone: "blue", art: "prayer", description: "مواقيت الصلاة واتجاه القبلة", href: "/prayer" },
  { label: "التقويم", icon: CalendarDays, tone: "clay", art: "calendar", description: "التقويم الهجري والميلادي", href: "/calendar" },
  { label: "الأذكار", icon: Sparkles, tone: "green", art: "adhkar", description: "أذكار وأدعية يومك", href: "/adhkar" },
  { label: "السبحة", icon: CircleDot, tone: "gold", art: "tasbih", description: "سبحة إلكترونية بأذكارك وعددك", href: "/tasbih" },
  { label: "العمرة والسفر", icon: Plane, tone: "sky", art: "umrah", description: "مناسك العمرة خطوة بخطوة وأدعية السفر", href: "/umrah" },
  {
    label: "السيرة النبوية",
    icon: Milestone,
    tone: "clay",
    art: "seerah",
    description: "سيرة النبي ﷺ فصولًا تفاعلية على الخريطة",
    href: "/seerah",
  },
  { label: "القصص", icon: Clapperboard, tone: "rose", art: "stories", description: "قصص الأنبياء المصوّرة", href: "/stories" },
  { label: "رحلتي", icon: BookOpenCheck, tone: "teal", art: "journey", description: "حفظك وتسميعك وإنجازاتك", href: "/journey" },
  { label: "خطة الحفظ", icon: CalendarRange, tone: "blue", art: "plan", description: "وردك اليومي من الحفظ والمراجعة", href: "/plan" },
  { label: "الختمة", icon: BookMarked, tone: "purple", art: "khatma", description: "اختم القرآن بوِرد يومي تختاره", href: "/khatma" },
  { label: "التسميع", icon: Mic, tone: "clay", art: "tasmee", description: "سمّع من حفظك بصوتك ونوقفك عند الخطأ", href: "/tasmee" },
  {
    label: "الاختبارات",
    icon: GraduationCap,
    tone: "gold",
    art: "exams",
    description: "اختبر حفظك جزءًا جزءًا واحصل على شهادة",
    href: "/exams",
  },
  {
    label: "المحفوظات",
    icon: Download,
    tone: "sky",
    art: "downloads",
    description: "التلاوات والأحاديث المنزّلة للاستماع والقراءة دون إنترنت",
    href: "/downloads",
  },
  { label: "الأطفال", icon: Trees, tone: "green", art: "kids", description: "حديقة القرآن للأطفال", href: "/kids" },
];

export interface SectionGroup {
  title: string;
  /** Labels from APP_SECTIONS, in grid order. */
  labels: readonly string[];
}

/** The "كل الأقسام" screen, one titled grid per group. Every built section appears exactly once. */
export const SECTION_GROUPS: readonly SectionGroup[] = [
  { title: "القرآن", labels: ["المصحف", "الاستماع", "الإذاعة", "التسميع"] },
  { title: "يومك", labels: ["المواقيت", "الأذكار", "السبحة", "العمرة والسفر", "الأحاديث", "الأربعون النووية", "التقويم"] },
  { title: "رحلتك", labels: ["رحلتي", "خطة الحفظ", "الختمة", "الاختبارات"] },
  { title: "أدعية وابتهالات", labels: ["ابتهالات", "تواشيح", "أدعية", "دعاء ختم القرآن", "الرقية الشرعية", "أذان"] },
  { title: "للعائلة", labels: ["السيرة النبوية", "القصص", "الأطفال"] },
  { title: "على جهازك", labels: ["المحفوظات"] },
];

/** Home's flat grid: the sections most people open, four rows of three; the rest are a tap away. */
export const HOME_SECTIONS: readonly string[] = [
  "المصحف",
  "الاستماع",
  "الأذكار",
  "المواقيت",
  "السبحة",
  "الرقية الشرعية",
  "الأحاديث",
  "الأربعون النووية",
  "الختمة",
  "الإذاعة",
  "أدعية",
  "التقويم",
];

/** The built sections for these labels, in order. */
export function sectionsFor(labels: readonly string[]): AppSection[] {
  return labels
    .map((label) => APP_SECTIONS.find((section) => section.label === label))
    .filter((section): section is AppSection => section?.href !== undefined);
}
