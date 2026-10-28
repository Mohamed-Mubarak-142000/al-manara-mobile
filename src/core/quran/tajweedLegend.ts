/*
 * The tajweed mushaf's colour key, as the King Fahd Complex prints it. The colours are the coloured page
 * fonts' own (V4 COLRv1, their CPAL palettes 0 and 1), so the key matches the page on light and dark
 * themes alike. The website has the same list (features/quran/tajweedLegend.ts) — keep in sync by hand.
 */

export interface TajweedLegendEntry {
  label: string;
  explanation: string;
  /** Palette 0, drawn on the light page themes. */
  light: string;
  /** Palette 1, drawn on the dark ones. */
  dark: string;
}

export const TAJWEED_LEGEND: readonly TajweedLegendEntry[] = [
  { label: "مد ٦ حركات لزومًا", explanation: "المد اللازم، يُمد ست حركات.", light: "#b50000", dark: "#e30000" },
  { label: "مد واجب ٤ أو ٥ حركات", explanation: "المد المتصل والمنفصل، يُمد أربع أو خمس حركات.", light: "#f40000", dark: "#ff5e8e" },
  { label: "مد ٢ أو ٤ أو ٦ جوازًا", explanation: "المد العارض للسكون عند الوقف.", light: "#ff7b00", dark: "#ff8e3b" },
  { label: "مد حركتان", explanation: "المد الطبيعي، حركتان.", light: "#ce9e00", dark: "#ffc1e0" },
  {
    label: "إخفاء، ومواضع الغنة (حركتان)",
    explanation: "الغنة في الإخفاء والإدغام بغنة والإقلاب والنون والميم المشددتين.",
    light: "#09b000",
    dark: "#26b55d",
  },
  { label: "إدغام، وما لا يُلفظ", explanation: "حرف يُدغم فيما بعده أو يُكتب ولا يُنطق.", light: "#a5a5a5", dark: "#9d9999" },
  { label: "تفخيم الراء", explanation: "راء تُنطق مفخّمة.", light: "#3f48e6", dark: "#3c84d5" },
  { label: "قلقلة", explanation: "حروف «قطب جد» الساكنة تُنطق بنبرة.", light: "#2fadff", dark: "#00deff" },
];
