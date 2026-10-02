// Ported from eslam-platform/src/lib/arabic.ts — keep in sync by hand.
const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

export function toArabicDigits(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => ARABIC_DIGITS[Number(digit)] ?? digit);
}

export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "٠٠:٠٠";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const core = `${pad2(minutes)}:${pad2(seconds)}`;
  return toArabicDigits(hours > 0 ? `${hours}:${core}` : core);
}
