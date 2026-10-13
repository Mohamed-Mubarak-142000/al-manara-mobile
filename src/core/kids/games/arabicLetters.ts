// Ported from eslam-platform/src/features/kids/games/arabicLetters.ts — keep in sync by hand.
export interface ArabicLetter {
  letter: string;
  name: string;
  exampleWord: string;
}

// Editorial content for the letter-matching game — review with the platform owner before expanding.
export const ARABIC_LETTERS: readonly ArabicLetter[] = [
  { letter: "ا", name: "ألف", exampleWord: "أسد" },
  { letter: "ب", name: "باء", exampleWord: "بيت" },
  { letter: "ت", name: "تاء", exampleWord: "تفاح" },
  { letter: "ث", name: "ثاء", exampleWord: "ثعلب" },
  { letter: "ج", name: "جيم", exampleWord: "جمل" },
  { letter: "ح", name: "حاء", exampleWord: "حصان" },
  { letter: "خ", name: "خاء", exampleWord: "خروف" },
  { letter: "د", name: "دال", exampleWord: "دب" },
  { letter: "ذ", name: "ذال", exampleWord: "ذئب" },
  { letter: "ر", name: "راء", exampleWord: "رمان" },
  { letter: "ز", name: "زاي", exampleWord: "زرافة" },
  { letter: "س", name: "سين", exampleWord: "سمكة" },
  { letter: "ش", name: "شين", exampleWord: "شمس" },
  { letter: "ص", name: "صاد", exampleWord: "صقر" },
  { letter: "ض", name: "ضاد", exampleWord: "ضفدع" },
  { letter: "ط", name: "طاء", exampleWord: "طائرة" },
  { letter: "ظ", name: "ظاء", exampleWord: "ظبي" },
  { letter: "ع", name: "عين", exampleWord: "عنب" },
  { letter: "غ", name: "غين", exampleWord: "غزال" },
  { letter: "ف", name: "فاء", exampleWord: "فيل" },
  { letter: "ق", name: "قاف", exampleWord: "قمر" },
  { letter: "ك", name: "كاف", exampleWord: "كتاب" },
  { letter: "ل", name: "لام", exampleWord: "ليمون" },
  { letter: "م", name: "ميم", exampleWord: "موز" },
  { letter: "ن", name: "نون", exampleWord: "نحلة" },
  { letter: "ه", name: "هاء", exampleWord: "هدهد" },
  { letter: "و", name: "واو", exampleWord: "وردة" },
  { letter: "ي", name: "ياء", exampleWord: "يد" },
];
