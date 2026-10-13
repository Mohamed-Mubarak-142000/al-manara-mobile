// Ported from eslam-platform/src/features/kids/rewards/catalog.ts — keep in sync by hand.
// Cosmetic rewards only: they dress the companion or decorate the garden, never unlock Quran content.

export type CompanionSlot = "head" | "face" | "neck" | "back";

export interface CompanionItem {
  id: string;
  kind: "companion";
  slot: CompanionSlot;
  name: string;
  emoji: string;
  price: number;
}

export interface GardenItem {
  id: string;
  kind: "garden";
  name: string;
  emoji: string;
  price: number;
}

export type RewardItem = CompanionItem | GardenItem;

export const REWARD_ITEMS: RewardItem[] = [
  { id: "cap", kind: "companion", slot: "head", name: "قبعة الرحلة", emoji: "🧢", price: 20 },
  { id: "flower-crown", kind: "companion", slot: "head", name: "إكليل الزهور", emoji: "🌸", price: 30 },
  { id: "crown", kind: "companion", slot: "head", name: "تاج الحافظ", emoji: "👑", price: 60 },
  { id: "glasses", kind: "companion", slot: "face", name: "نظارة القارئ", emoji: "👓", price: 25 },
  { id: "scarf", kind: "companion", slot: "neck", name: "وشاح دافئ", emoji: "🧣", price: 20 },
  { id: "bowtie", kind: "companion", slot: "neck", name: "ربطة أنيقة", emoji: "🎀", price: 15 },
  { id: "backpack", kind: "companion", slot: "back", name: "حقيبة المغامر", emoji: "🎒", price: 35 },
  { id: "cape", kind: "companion", slot: "back", name: "عباءة البطل", emoji: "🦸", price: 50 },
  { id: "balloons", kind: "garden", name: "بالونات", emoji: "🎈", price: 20 },
  { id: "butterflies", kind: "garden", name: "فراشات", emoji: "🦋", price: 20 },
  { id: "lantern", kind: "garden", name: "فانوس", emoji: "🏮", price: 25 },
  { id: "kite", kind: "garden", name: "طائرة ورقية", emoji: "🪁", price: 25 },
  { id: "bench", kind: "garden", name: "مقعد خشبي", emoji: "🪑", price: 30 },
  { id: "lights", kind: "garden", name: "زينة النجوم", emoji: "✨", price: 35 },
  { id: "ducks", kind: "garden", name: "بركة البط", emoji: "🦆", price: 40 },
  { id: "rainbow", kind: "garden", name: "قوس قزح", emoji: "🌈", price: 60 },
];

const BY_ID = new Map(REWARD_ITEMS.map((item) => [item.id, item]));

export function getRewardItem(id: string): RewardItem | undefined {
  return BY_ID.get(id);
}
