// Per-weight subpath imports: the packages' index files would bundle every weight.
import { Alexandria_600SemiBold } from "@expo-google-fonts/alexandria/600SemiBold";
import { Alexandria_700Bold } from "@expo-google-fonts/alexandria/700Bold";
import { Alexandria_800ExtraBold } from "@expo-google-fonts/alexandria/800ExtraBold";
import { AmiriQuran_400Regular } from "@expo-google-fonts/amiri-quran/400Regular";
import { BalooBhaijaan2_600SemiBold } from "@expo-google-fonts/baloo-bhaijaan-2/600SemiBold";
import { BalooBhaijaan2_800ExtraBold } from "@expo-google-fonts/baloo-bhaijaan-2/800ExtraBold";
import { Cairo_400Regular } from "@expo-google-fonts/cairo/400Regular";
import { Cairo_500Medium } from "@expo-google-fonts/cairo/500Medium";
import { Cairo_600SemiBold } from "@expo-google-fonts/cairo/600SemiBold";
import { Cairo_700Bold } from "@expo-google-fonts/cairo/700Bold";
import { Cairo_800ExtraBold } from "@expo-google-fonts/cairo/800ExtraBold";

/**
 * Every family the design system names in src/global.css (--font-*), keyed by that exact name.
 * The website's fonts, except the Quran ones, which are its .woff2 files converted to .ttf.
 *
 * On Android the same files are also built into the app (the expo-font plugin in app.json, named by
 * file, so the keys here must stay equal to the file names): useFonts then finds them already loaded
 * on the first render and the splash doesn't wait. iOS and web still load them at runtime.
 */
export const APP_FONTS = {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_800ExtraBold,
  Alexandria_600SemiBold,
  Alexandria_700Bold,
  Alexandria_800ExtraBold,
  AmiriQuran_400Regular,
  BalooBhaijaan2_600SemiBold,
  BalooBhaijaan2_800ExtraBold,
  UthmanicHafs: require("@/assets/fonts/UthmanicHafs.ttf"),
};
