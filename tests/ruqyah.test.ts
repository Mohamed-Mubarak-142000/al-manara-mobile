/// <reference types="jest" />
import { alafasyAyahUrl, globalAyahNumber } from "@/core/quran/ayahAudio";
import { RUQYAH_QURAN, RUQYAH_SUNNAH } from "@/core/ruqyah/ruqyahData";
import { isPassageTrack, passageTracks } from "@/features/ruqyah/ruqyahTracks";

// Hoisted above the imports by jest: the ayah packs read the device's files and storage.
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock("expo-file-system", () => require("./fsMock").fileSystem);
jest.mock("expo-sqlite/kv-store", () => ({
  __esModule: true,
  default: { getItemSync: () => null, setItemSync: () => {} },
}));

describe("ruqyah content", () => {
  it("has every ayah of each passage, numbered as the app's ayah audio counts them", () => {
    expect(RUQYAH_QURAN.length).toBeGreaterThan(10);
    for (const passage of RUQYAH_QURAN) {
      expect(passage.ayahs.map((ayah) => ayah.numberInSurah)).toEqual(
        Array.from({ length: passage.to - passage.from + 1 }, (_, index) => passage.from + index),
      );
      for (const ayah of passage.ayahs) {
        expect(ayah.number).toBe(globalAyahNumber(passage.surah, ayah.numberInSurah));
        expect(ayah.text.trim()).not.toBe("");
      }
    }
  });

  it("gives each hadith its grade, attribution and HadeethEnc link", () => {
    expect(new Set(RUQYAH_SUNNAH.map((hadith) => hadith.id)).size).toBe(RUQYAH_SUNNAH.length);
    for (const hadith of RUQYAH_SUNNAH) {
      expect(hadith.grade).not.toBe("");
      expect(hadith.attribution).not.toBe("");
      expect(hadith.url).toMatch(/^https:\/\/hadeethenc\.com\//);
    }
  });
});

describe("ruqyah tracks", () => {
  const find = (id: string) => RUQYAH_QURAN.find((passage) => passage.id === id)!;

  it("queues Alafasy ayah by ayah, a passage marked three times read three times", () => {
    const kursi = passageTracks(find("kursi"));
    expect(kursi).toHaveLength(1);
    expect(kursi[0]!.url).toBe(alafasyAyahUrl(262));
    const falaq = passageTracks(find("falaq"));
    expect(falaq).toHaveLength(15);
    expect(falaq.map((track) => track.id).slice(4, 6)).toEqual(["ruqyah-falaq-0-5", "ruqyah-falaq-1-1"]);
  });

  it("tells passages apart even when one id starts with another's", () => {
    const start = find("baqarah-start");
    expect(isPassageTrack("ruqyah-baqarah-start-0-3", start)).toBe(true);
    expect(isPassageTrack("ruqyah-baqarah-end-0-285", start)).toBe(false);
    expect(isPassageTrack(null, start)).toBe(false);
  });
});
