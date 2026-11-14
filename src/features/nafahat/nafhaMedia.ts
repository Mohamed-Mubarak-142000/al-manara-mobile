import { Directory, File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { Share } from "react-native";

import { NAFAHAT_TITLE, type Nafha } from "./nafahatApi";

const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

function extensionOf(url: string): string {
  return url.split("?")[0]?.split(".").pop()?.toLowerCase() ?? "bin";
}

/** The post's file in the cache folder, downloaded once and reused for share and save. */
async function localCopy(nafha: Nafha & { media_url: string }): Promise<File> {
  const dir = new Directory(Paths.cache, "nafahat");
  if (!dir.exists) dir.create({ intermediates: true });
  const file = new File(dir, `${nafha.id}.${extensionOf(nafha.media_url)}`);
  if (file.exists && file.size > 0) return file;
  return File.downloadFileAsync(nafha.media_url, file, { idempotent: true });
}

function shareText(nafha: Nafha): string {
  const link = SITE_URL ? `\n\n${SITE_URL}/nafahat#nafha-${nafha.id}` : "";
  return `${nafha.title}${nafha.body ? `\n\n${nafha.body}` : ""}\n\n— ${NAFAHAT_TITLE}${link}`;
}

/** Shares the image or video itself when there is one, else the text with the link. */
export async function shareNafha(nafha: Nafha): Promise<void> {
  const url = nafha.media_url;
  if (url && (await Sharing.isAvailableAsync())) {
    const file = await localCopy({ ...nafha, media_url: url });
    await Sharing.shareAsync(file.uri, { mimeType: MIME[extensionOf(file.uri)], dialogTitle: nafha.title });
    return;
  }
  await Share.share({ title: nafha.title, message: shareText(nafha) });
}

/** Saves the post's image or video to the phone's gallery (asks for permission the first time). */
export async function saveNafhaMedia(nafha: Nafha): Promise<"saved" | "denied"> {
  const url = nafha.media_url;
  if (!url) return "denied";
  const permission = await MediaLibrary.requestPermissionsAsync(true, [nafha.media_type === "video" ? "video" : "photo"]);
  if (!permission.granted) return "denied";
  const file = await localCopy({ ...nafha, media_url: url });
  await MediaLibrary.Asset.create(file.uri);
  return "saved";
}
