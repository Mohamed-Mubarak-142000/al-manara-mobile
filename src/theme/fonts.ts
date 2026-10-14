// Per-weight subpath imports: the packages' index files would bundle every weight.
import { AmiriQuran_400Regular } from "@expo-google-fonts/amiri-quran/400Regular";
import { BalooBhaijaan2_600SemiBold } from "@expo-google-fonts/baloo-bhaijaan-2/600SemiBold";
import { BalooBhaijaan2_800ExtraBold } from "@expo-google-fonts/baloo-bhaijaan-2/800ExtraBold";
import { IBMPlexSansArabic_400Regular } from "@expo-google-fonts/ibm-plex-sans-arabic/400Regular";
import { IBMPlexSansArabic_500Medium } from "@expo-google-fonts/ibm-plex-sans-arabic/500Medium";
import { IBMPlexSansArabic_600SemiBold } from "@expo-google-fonts/ibm-plex-sans-arabic/600SemiBold";
import { IBMPlexSansArabic_700Bold } from "@expo-google-fonts/ibm-plex-sans-arabic/700Bold";

/**
 * Every family the design system names in src/global.css (--font-*), keyed by that exact name.
 * One calm sans (IBM Plex Sans Arabic) for all text and headings; the Quran keeps its own fonts (its .woff2
 * files converted to .ttf), and the kids' area its rounded Baloo.
 *
 * On Android the same files are also built into the app (the expo-font plugin in app.json, named by
 * file, so the keys here must stay equal to the file names): useFonts then finds them already loaded
 * on the first render and the splash doesn't wait. iOS and web still load them at runtime.
 */
export const APP_FONTS = {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
  AmiriQuran_400Regular,
  BalooBhaijaan2_600SemiBold,
  BalooBhaijaan2_800ExtraBold,
  UthmanicHafs: require("@/assets/fonts/UthmanicHafs.ttf"),
};

/** For props that take a family name rather than a className (navigators, SVG text, widgets). */
export const FONT_BOLD = "IBMPlexSansArabic_700Bold";
