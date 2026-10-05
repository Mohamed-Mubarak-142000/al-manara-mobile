// Run with FFMPEG_BIN pointing to an installed ffmpeg (or ffmpeg on PATH).
import { mkdir, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const directory = await mkdtemp(join(tmpdir(), "almanara-adhan-"));
try {
  const response = await fetch("https://upload.wikimedia.org/wikipedia/commons/b/b0/Beautiful_adhan.ogg");
  if (!response.ok) throw new Error(`Audio download failed: ${response.status}`);
  const source = join(directory, "adhan.ogg");
  await writeFile(source, Buffer.from(await response.arrayBuffer()));
  await mkdir("assets/audio", { recursive: true });
  const result = spawnSync(
    process.env.FFMPEG_BIN || "ffmpeg",
    [
      "-y",
      "-i",
      source,
      "-t",
      "28",
      "-vn",
      "-ac",
      "1",
      "-ar",
      "22050",
      "-c:a",
      "pcm_s16le",
      "-af",
      "afade=t=out:st=27:d=1",
      "assets/audio/adhan_short.wav",
    ],
    { stdio: "inherit" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("ffmpeg failed");
} finally {
  await rm(directory, { recursive: true, force: true });
}
