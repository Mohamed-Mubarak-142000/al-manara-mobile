import type { Track } from "@/features/audio/playerStore";

/**
 * The website's RADIO_STATION (features/audio/AudioProvider.tsx), with the relay first: radiojar
 * redirects to a plain-http server, which Android release builds refuse, so it is only the backup here.
 */
export const RADIO_STATION = {
  name: "إذاعة القرآن الكريم من القاهرة",
  streams: ["https://radio.xecod.com/station/quran-cairo", "https://stream.radiojar.com/8s5u5tpdtwzuv"],
  providerName: "إذاعة القرآن الكريم المصرية",
  providerUrl: "https://misrquran.gov.eg/",
} as const;

export const RADIO_TRACK: Track = {
  id: "radio",
  title: RADIO_STATION.name,
  artist: "بث مباشر",
  url: RADIO_STATION.streams[0],
  fallbackUrls: RADIO_STATION.streams.slice(1),
  live: true,
};
