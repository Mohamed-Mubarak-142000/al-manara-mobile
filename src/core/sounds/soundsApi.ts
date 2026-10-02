// Ported from eslam-platform/src/features/sounds/soundsApi.ts — keep in sync by hand; Next-only caching swapped for cachedFetch.
import { cachedFetch } from "@/core/http";
import { normalizeArabic } from "@/core/text/normalizeArabic";

/**
 * Ibtihalat, tawasheeh, duas and adhan, grouped by munshid. The Egyptian Quran Radio's own library
 * (API.misrquran.gov.eg) comes first; hand-picked Internet Archive collections add what it lacks.
 * Radio recordings are HLS streams resolved through /api/sounds/media; archive.org serves plain mp3s.
 */

export type SoundCategoryKey = "ibtihalat" | "tawasheeh" | "duas" | "adhan";

interface ArchiveSource {
  id: string;
  label: string;
  /** Every file is by this munshid; otherwise each title is matched against the known names. */
  artist?: string;
}

export interface SoundCategory {
  key: SoundCategoryKey;
  href: `/${SoundCategoryKey}`;
  label: string;
  title: string;
  description: string;
  /** The radio library's tag ids for this category. */
  radioTags: readonly string[];
  archive: readonly ArchiveSource[];
}

export const SOUND_CATEGORIES: Record<SoundCategoryKey, SoundCategory> = {
  ibtihalat: {
    key: "ibtihalat",
    href: "/ibtihalat",
    label: "ابتهالات",
    title: "ابتهالات كبار المبتهلين",
    description: "ابتهالات النقشبندي وطوبار ومحمد عمران والفشني والبهتيمي وعشرات المبتهلين، من مكتبة إذاعة القرآن الكريم.",
    radioTags: ["3e64b599-6a90-4c12-93e1-936e15789d79"],
    archive: [
      { id: "Ebtihalet_uP_bY_mUSLEm", label: "ابتهالات نادرة" },
      { id: "2071215", label: "كبار المبتهلين في السبعينات والثمانينات" },
    ],
  },
  tawasheeh: {
    key: "tawasheeh",
    href: "/tawasheeh",
    label: "تواشيح",
    title: "تواشيح دينية",
    description:
      "تواشيح النقشبندي والفشني وعبد السميع بيومي والإسكندراني وسيد عطية ندا وطوبار والبهتيمي ومحمد عمران وغيرهم، من مكتبة إذاعة القرآن الكريم وتسجيلات نادرة.",
    radioTags: ["b8ecd205-87c2-47a2-b3a9-fefd0804e30a"],
    archive: [
      { id: "Naqshabandee", label: "تواشيح النقشبندي", artist: "سيد النقشبندي" },
      { id: "Sheikh-Sayed-Al-Naqshbandi-Ibtihalat", label: "سيد النقشبندي", artist: "سيد النقشبندي" },
      { id: "Sheikh-Taha-Al-Fashni-Ibtihalat", label: "طه الفشني", artist: "طه الفشني" },
      { id: "Sheikh-Abdulsameem-Bayoumi-Ibtihalat", label: "عبد السميع بيومي", artist: "عبد السميع بيومي" },
      { id: "iskandrany_201705", label: "إبراهيم الإسكندراني", artist: "إبراهيم الإسكندراني" },
      { id: "s-nada", label: "سيد عطية ندا", artist: "سيد عطية ندا" },
      { id: "Tobar1", label: "نصر الدين طوبار", artist: "نصر الدين طوبار" },
      { id: "bahtimi_202509", label: "كامل يوسف البهتيمي", artist: "كامل يوسف البهتيمي" },
      { id: "3baqera_omran", label: "محمد عمران", artist: "محمد عمران" },
      { id: "Mohamed-Omran-and-Said-Hafez-Ibtihalat", label: "محمد عمران وسعيد حافظ", artist: "محمد عمران وسعيد حافظ" },
      { id: "Sheikh-Saeed-Hafez-Ibtihalat", label: "سعيد حافظ", artist: "سعيد حافظ" },
      { id: "3baqera", label: "محمد الطوخي", artist: "محمد الطوخي" },
      { id: "3baqera_helbawy", label: "محمد الهلباوي", artist: "محمد الهلباوي" },
      { id: "3baqera_a-mahmoud", label: "علي محمود", artist: "علي محمود" },
      { id: "3baqera_mamdouh", label: "ممدوح عبد الجليل", artist: "ممدوح عبد الجليل" },
      { id: "Sheikh-Wahid-Al-Sharqawi-Ibtihalat", label: "وحيد الشرقاوي", artist: "وحيد الشرقاوي" },
      { id: "3baqera_fayoumy", label: "محمد الفيومي", artist: "محمد الفيومي" },
      { id: "20240309_20240309_0237", label: "حسن قاسم", artist: "حسن قاسم" },
      { id: "20230916_20230916_1515", label: "عبد التواب البساتيني", artist: "عبد التواب البساتيني" },
      { id: "3baqera_ammar", label: "صلاح عمار", artist: "صلاح عمار" },
      { id: "Tawashih", label: "تواشيح ومدائح نبوية" },
      { id: "a214aaaaaaaaaaaaaaaaa", label: "مختارات لكبار المبتهلين" },
    ],
  },
  duas: {
    key: "duas",
    href: "/duas",
    label: "أدعية",
    title: "أدعية وأذكار مسموعة",
    description: "أدعية وأذكار من إذاعة القرآن الكريم، وأدعية القنوت وختم القرآن بأصوات أئمة الحرمين وكبار القرّاء.",
    radioTags: ["6b29fc40-ca47-1067-b31d-00dd010662da"],
    archive: [
      { id: "Islamic_Tape-258_uP_bY_mUSLEm", label: "الشيخ محمد متولي الشعراوي", artist: "محمد متولي الشعراوي" },
      { id: "Du3a_uP_bY_mUSLEm", label: "أدعية القنوت وختم القرآن" },
    ],
  },
  adhan: {
    key: "adhan",
    href: "/adhan",
    label: "أذان",
    title: "الأذان بأصوات كبار القرّاء",
    description: "أذان الفجر وباقي الصلوات بأصوات قرّاء الإذاعة المصرية، وأذان الحرمين ومساجد العالم الإسلامي.",
    radioTags: ["1d6f1e7d-bd9b-4b2f-82aa-2c15d00165f9", "9e3bc976-72bc-4c2e-8142-efc9e8e4f39d"],
    archive: [{ id: "Islamic_Tape-34_uP_bY_mUSLEm", label: "أذان من العالم الإسلامي" }],
  },
};

export interface SoundArtist {
  id: string;
  name: string;
  image: string | null;
  count: number;
}

export interface SoundTrack {
  id: string;
  title: string;
  artistId: string;
  /** Seconds; 0 when the source doesn't say. */
  duration: number;
  src: string;
  /** An HLS stream rather than a plain audio file. */
  hls: boolean;
}

export interface SoundLibrary {
  /** Most recordings first. */
  artists: SoundArtist[];
  tracks: SoundTrack[];
}

const RADIO_API = "https://API.misrquran.gov.eg/api";
const ARCHIVE_METADATA = "https://archive.org/metadata";
const ARCHIVE_DOWNLOAD = "https://archive.org/download";
const RADIO_REVALIDATE_SECONDS = 60 * 60 * 24;
const ARCHIVE_REVALIDATE_SECONDS = 60 * 60 * 24 * 30;

// Latin-1 decoded UTF-8 (Ã, Ø, Ù…): some uploads have garbled titles, so the file name is used instead.
const MOJIBAKE = /[À-ÿ]{2,}/;
const ARABIC = /[؀-ۿ]/;
const INVISIBLE = /[​-‏‪-‮﻿]/g;
const TITLE_PREFIX = /^(المبتهل|القارئ|الشيخ|الإذاعي|المنشد)\s+/;

function tidy(text: string): string {
  return text.replace(INVISIBLE, "").replace(/\s+/g, " ").trim();
}

/** The name without "المبتهل" / "القارئ" / "الشيخ", for matching and initials. */
export function bareArtistName(name: string): string {
  return tidy(name).replace(TITLE_PREFIX, "");
}

/** Turns an archive upload's title or file name into a readable Arabic title. */
export function cleanSoundTitle(file: { name: string; title?: string }): string {
  const fromTitle = file.title && ARABIC.test(file.title) && !MOJIBAKE.test(file.title) ? file.title : "";
  const fromName = file.name
    .split("/")
    .pop()!
    .replace(/\.mp3$/i, "");
  const raw = fromTitle || (ARABIC.test(fromName) ? fromName : file.title || fromName);
  return tidy(
    raw
      .replace(/_?up_by_muslem(\.ettounssi)?/gi, "")
      .replace(/www\.[^\s]+/gi, "")
      .replace(/-?\d{6,}/g, "")
      .replace(/^\s*\d{1,3}\s*[-–.)]+\s*/, "")
      .replace(/\s*[—-]?\s*ابتهال نادر\s*\.*\s*حصريًا/g, "")
      .replace(/فيديو\s+/g, "")
      .replace(/ـ+/g, "")
      .replace(/\s*(--|\/\/|\||\s-\s)\s*/g, " — ")
      .replace(/([؀-ۿ])-([؀-ۿ\d])/g, "$1 — $2")
      .replace(/[_]+/g, " ")
      .replace(/^[\s—-]+|[\s—-]+$/g, ""),
  );
}

// A title segment that only repeats the page's own category, an honorific left alone, or a channel plug.
const FILLER_SEGMENT = /^[اإ]?بتهال(ات)?( نادر)?$|^تو[ا]?شي?ح$|^(لل|ال)?(شيخ|مبتهل|قارئ|منشد)$|^اشترك/;

/** Drops the munshid's name (however the upload spells it) from a title already grouped under him. */
export function withoutArtistName(title: string, artist: string): string {
  // Spaces are optional between every letter: uploads write "عبدالسميع" and "و سعيد" as often as not.
  const loose = (text: string) =>
    [...text.replace(/\s+/g, "")]
      .map((char) => (/[اأإآ]/.test(char) ? "[اأإآ]" : /[يى]/.test(char) ? "[يى]" : /[ةه]/.test(char) ? "[ةه]" : char))
      .join("\\s*");
  const full = bareArtistName(artist);
  const surname = full.split(" ").pop()!;
  const honorific = "(لل|ال|أل)(شيخ|مبتهل|قارئ|منشد)[\\s.]+";
  const name = new RegExp(`(${honorific})?${loose(full)}(\\s*و\\s*بطانته)?`, "g");
  // "الشيخ طوبار": the surname alone counts only after an honorific, so ordinary words aren't taken for it.
  const bySurname = surname.length >= 5 && surname !== full ? new RegExp(`${honorific}${loose(surname)}`, "g") : null;
  const stripped = title
    .replace(name, " — ")
    .replace(bySurname ?? /$^/, " — ")
    .replace(/^\d{1,3}\s+/, "")
    .split(/\s*—\s*/)
    .map((segment) => segment.replace(/\s+[اإ]بتهال$/, "").replace(/^[\s.]+|[\s.]+$/g, ""))
    .filter((segment) => segment && !FILLER_SEGMENT.test(segment))
    .join(" — ");
  return stripped.length > 1 ? stripped : title;
}

function parseDuration(length: string | undefined): number {
  if (!length) return 0;
  if (length.includes(":")) return length.split(":").reduce((total, part) => total * 60 + (Number(part) || 0), 0);
  return Math.round(Number(length) || 0);
}

interface RawRadioRecording {
  id: string;
  title: string;
  imgUrl: string | null;
  pioneerId: string | null;
  pioneerName: string | null;
  mediaService: { audioRef: string | null; durationInSec: number | null } | null;
}

interface RawArchiveFile {
  name: string;
  source?: string;
  format?: string;
  title?: string;
  length?: string;
}

async function getRadioRecordings(tagId: string): Promise<RawRadioRecording[]> {
  try {
    const params = `firstItemId=${tagId}&secondItemId=&pageSize=1000&pageNumber=1&name=`;
    const response = await cachedFetch(`${RADIO_API}/AudioRecordings/GetAllFilteredAudioRecord?${params}`, RADIO_REVALIDATE_SECONDS);
    if (!response.ok) return [];
    const data = (await response.json()) as { data?: RawRadioRecording[] };
    return data.data ?? [];
  } catch {
    return [];
  }
}

async function getArchiveFiles(id: string): Promise<RawArchiveFile[]> {
  try {
    const response = await cachedFetch(`${ARCHIVE_METADATA}/${id}/files`, ARCHIVE_REVALIDATE_SECONDS);
    if (!response.ok) return [];
    const data = (await response.json()) as { result?: RawArchiveFile[] };
    return (data.result ?? []).filter((file) => file.source === "original" && /mp3/i.test(file.format ?? "") && /\.mp3$/i.test(file.name));
  } catch {
    return [];
  }
}

/** Every recording of a category from whichever sources answered, grouped by munshid. */
export async function getSoundLibrary(category: SoundCategoryKey): Promise<SoundLibrary> {
  const { radioTags, archive } = SOUND_CATEGORIES[category];
  const [radio, archiveFiles] = await Promise.all([
    Promise.all(radioTags.map(getRadioRecordings)).then((lists) => lists.flat()),
    Promise.all(archive.map((source) => getArchiveFiles(source.id))),
  ]);

  const artists = new Map<string, SoundArtist>();
  const tracks: SoundTrack[] = [];
  const addArtist = (id: string, name: string, image: string | null) => {
    const artist = artists.get(id) ?? { id, name: tidy(name), image, count: 0 };
    artist.image ??= image;
    artist.count += 1;
    artists.set(id, artist);
    return artist.id;
  };

  const seen = new Set<string>();
  for (const recording of radio) {
    const ref = recording.mediaService?.audioRef;
    if (!ref || !/^\d+$/.test(ref) || seen.has(recording.id)) continue;
    seen.add(recording.id);
    tracks.push({
      id: `radio:${recording.id}`,
      title: tidy(recording.title) || tidy(recording.pioneerName ?? ""),
      artistId: addArtist(recording.pioneerId ?? "radio", recording.pioneerName ?? "إذاعة القرآن الكريم", recording.imgUrl),
      duration: recording.mediaService?.durationInSec ?? 0,
      src: `/api/sounds/media/${ref}`,
      hls: true,
    });
  }

  // Archive files join a radio munshid when their title names one, so each voice stays in one place.
  const known = [...artists.values()].map((artist) => ({ id: artist.id, key: normalizeArabic(bareArtistName(artist.name)) }));
  const matchArtist = (text: string) => {
    const haystack = normalizeArabic(text);
    return known.find((artist) => artist.key.length > 4 && haystack.includes(artist.key))?.id;
  };

  archive.forEach((source, index) => {
    for (const file of archiveFiles[index] ?? []) {
      const cleaned = cleanSoundTitle(file);
      const title = source.artist ? withoutArtistName(cleaned, source.artist) : cleaned;
      if (title.length < 2) continue;
      const artistId = matchArtist(source.artist ?? title) ?? (source.artist ? `archive:${source.artist}` : `archive:${source.id}`);
      addArtist(artistId, source.artist ?? source.label, null);
      tracks.push({
        id: `archive:${source.id}/${file.name}`,
        title,
        artistId,
        duration: parseDuration(file.length),
        src: `${ARCHIVE_DOWNLOAD}/${source.id}/${file.name.split("/").map(encodeURIComponent).join("/")}`,
        hls: false,
      });
    }
  });

  return { artists: [...artists.values()].sort((a, b) => b.count - a.count), tracks };
}

/** The HLS playlist of one radio recording, or null when the radio doesn't know it. */
export async function getRadioMediaUrl(ref: string): Promise<string | null> {
  try {
    const response = await cachedFetch(`${RADIO_API}/MediaService/GetVideoHlsUrl?videoRefno=${encodeURIComponent(ref)}`, 60 * 60 * 24 * 7);
    if (!response.ok) return null;
    const data = (await response.json()) as { response?: { result?: string; video_url?: string } };
    const url = data.response?.video_url;
    return data.response?.result === "OK" && url?.startsWith("https://") ? url : null;
  } catch {
    return null;
  }
}
