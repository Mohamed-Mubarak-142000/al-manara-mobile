// Ported from eslam-platform/src/features/kids/companion/companionLines.ts — keep in sync by hand.
import type { CompanionAnimal } from "@/lib/database.types";

export interface CompanionInfo {
  animal: CompanionAnimal;
  name: string;
  /** How the companion introduces itself on the welcome screen. */
  intro: string;
  color: string;
  shadow: string;
}

export const COMPANIONS: CompanionInfo[] = [
  { animal: "bear", name: "دُبدوب", intro: "أنا دبدوب، أحب العسل وأحب القرآن أكثر!", color: "#b07a4f", shadow: "#86562f" },
  { animal: "panda", name: "بَمبو", intro: "أنا بمبو، هيا نحفظ معًا بهدوء وفرح!", color: "#3d3d4a", shadow: "#22222b" },
  { animal: "rabbit", name: "أرنوب", intro: "أنا أرنوب، أقفز معك من سورة لسورة!", color: "#e86fa0", shadow: "#bd4c7b" },
  { animal: "fox", name: "ثعلوب", intro: "أنا ثعلوب الذكي، سأساعدك في كل خطوة!", color: "#f08a3c", shadow: "#c4651d" },
];

export function companionInfo(animal: CompanionAnimal): CompanionInfo {
  return COMPANIONS.find((entry) => entry.animal === animal) ?? COMPANIONS[0]!;
}

// Encouragement only: nothing here may scold, count mistakes or compare the child with anyone.
export const COMPANION_LINES = {
  greetMorning: ["صباح الخير يا بطل! ☀️", "صباح النور! جاهز لرحلة اليوم؟", "صباح جميل مع القرآن 🌼"],
  greetEvening: ["مساء الخير يا بطل! 🌙", "مساء النور! نكمل رحلتنا؟", "ما أجمل القرآن في المساء ✨"],
  greet: ["أهلًا بك! اشتقت إليك ❤️", "هيا نكمل رحلتنا مع القرآن 🌟", "يوم جديد ومغامرة جديدة!"],
  correct: ["ما شاء الله! 🌟", "أحسنت يا بطل!", "رائع! إجابة صحيحة 🎉", "بارك الله فيك!", "ممتاز! أنت نجم ⭐"],
  almost: ["قرّبت جدًا! ❤️ جرّب مرة ثانية", "لا بأس، نحاول معًا مرة أخرى", "فكّر قليلًا… أنت تقدر!", "محاولة جميلة! هيا مرة ثانية"],
  finish: ["ما شاء الله! أنهيتها كلها 🎉", "فخور بك جدًا! 🏆", "أنت بطل حقيقي!"],
  daily: ["أكملت تحدي اليوم! 🎁", "تحدي اليوم تم! أنت رائع"],
  chest: ["افتح الصندوق! ماذا بداخله؟ 🎁", "مفاجأة لك يا بطل!"],
  listening: ["أنا أسمعك… 👂", "اقرأ بهدوء، أنا معك"],
  locked: ["احفظ السورة التي قبلها لنفتح هذه معًا 🔓", "قريبًا نصل إليها! نكمل الطريق أولًا"],
} as const;

export type CompanionLineKind = keyof typeof COMPANION_LINES;

export function pickLine(kind: CompanionLineKind, seed: number): string {
  const lines = COMPANION_LINES[kind];
  return lines[Math.abs(Math.floor(seed)) % lines.length]!;
}
