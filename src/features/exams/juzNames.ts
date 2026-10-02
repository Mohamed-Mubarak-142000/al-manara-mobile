import { toArabicDigits } from "@/core/text/arabic";

// The website's juzOrdinal() (features/certificates/Certificate.tsx).
const JUZ_ORDINALS = [
  "الأول",
  "الثاني",
  "الثالث",
  "الرابع",
  "الخامس",
  "السادس",
  "السابع",
  "الثامن",
  "التاسع",
  "العاشر",
  "الحادي عشر",
  "الثاني عشر",
  "الثالث عشر",
  "الرابع عشر",
  "الخامس عشر",
  "السادس عشر",
  "السابع عشر",
  "الثامن عشر",
  "التاسع عشر",
  "العشرين",
  "الحادي والعشرين",
  "الثاني والعشرين",
  "الثالث والعشرين",
  "الرابع والعشرين",
  "الخامس والعشرين",
  "السادس والعشرين",
  "السابع والعشرين",
  "الثامن والعشرين",
  "التاسع والعشرين",
  "الثلاثين",
];

export function juzOrdinal(juz: number): string {
  return JUZ_ORDINALS[juz - 1] ?? toArabicDigits(juz);
}

export const QUESTION_TITLES = {
  next: "ما الآية التي تلي قوله تعالى:",
  complete: "أكمل الآية:",
  missing: "ما الكلمة الناقصة في الآية؟",
  surah: "في أي سورة وردت هذه الآية؟",
} as const;
