// Ported from eslam-platform/src/features/kids/kidsSurahs.ts — keep in sync by hand.
// Al-Fatiha, then all of Juz Amma (An-Nas 114 → An-Naba 78), for children's memorization and games.
// Ordered from the end of the Mushaf, where the shortest and simplest surahs are, toward An-Naba.
// This is also the order of the stations on the journey map.
export const KIDS_SURAH_IDS: readonly number[] = [1, ...Array.from({ length: 114 - 78 + 1 }, (_, index) => 114 - index)];
