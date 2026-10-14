import type { ImageSourcePropType } from "react-native";

/**
 * A 3D illustration per section (assets/images/sections, Fluent Emoji — MIT, see its LICENSE.md), used on
 * the section tiles and Home's quick actions instead of line icons.
 */
export const SECTION_ART = {
  quran: require("@/assets/images/sections/quran.png"),
  listen: require("@/assets/images/sections/listen.png"),
  radio: require("@/assets/images/sections/radio.png"),
  hadith: require("@/assets/images/sections/hadith.png"),
  nawawi: require("@/assets/images/sections/nawawi.png"),
  ibtihalat: require("@/assets/images/sections/ibtihalat.png"),
  tawasheeh: require("@/assets/images/sections/tawasheeh.png"),
  duas: require("@/assets/images/sections/duas.png"),
  "khatm-dua": require("@/assets/images/sections/khatm-dua.png"),
  ruqyah: require("@/assets/images/sections/ruqyah.png"),
  adhan: require("@/assets/images/sections/adhan.png"),
  prayer: require("@/assets/images/sections/prayer.png"),
  calendar: require("@/assets/images/sections/calendar.png"),
  adhkar: require("@/assets/images/sections/adhkar.png"),
  tasbih: require("@/assets/images/sections/tasbih.png"),
  stories: require("@/assets/images/sections/stories.png"),
  journey: require("@/assets/images/sections/journey.png"),
  plan: require("@/assets/images/sections/plan.png"),
  khatma: require("@/assets/images/sections/khatma.png"),
  tasmee: require("@/assets/images/sections/tasmee.png"),
  exams: require("@/assets/images/sections/exams.png"),
  downloads: require("@/assets/images/sections/downloads.png"),
  kids: require("@/assets/images/sections/kids.png"),
  qibla: require("@/assets/images/sections/qibla.png"),
} satisfies Record<string, ImageSourcePropType>;

export type SectionArt = keyof typeof SECTION_ART;
