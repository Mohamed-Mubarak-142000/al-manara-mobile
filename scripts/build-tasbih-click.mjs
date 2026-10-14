// Renders the tasbih's bead click (assets/audio/tasbih-click.wav): a short, woody knock, like two beads
// meeting — a bright tick over a soft low thump, gone in about 60 ms so fast taps never blur together.
// Run: node scripts/build-tasbih-click.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const RATE = 44100;
const LENGTH = 0.06;

// A fixed seed, so rebuilding gives the same file.
let seed = 7;
const noise = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return (seed / 0x7fffffff) * 2 - 1;
};

const samples = new Float32Array(Math.ceil(LENGTH * RATE));
for (let i = 0; i < samples.length; i++) {
  const t = i / RATE;
  const tick = Math.sin(2 * Math.PI * 2400 * t) * Math.exp(-t / 0.006) * 0.55;
  const body = Math.sin(2 * Math.PI * 900 * t) * Math.exp(-t / 0.012) * 0.35;
  const thump = Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t / 0.02) * 0.3;
  const grain = noise() * Math.exp(-t / 0.002) * 0.25;
  // A 1 ms fade-in, so the click has no pop of its own.
  samples[i] = (tick + body + thump + grain) * Math.min(1, t / 0.001);
}

const data = Buffer.alloc(samples.length * 2);
samples.forEach((value, index) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32767), index * 2));
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(RATE, 24);
header.writeUInt32LE(RATE * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(data.length, 40);

const file = fileURLToPath(new URL("../assets/audio/tasbih-click.wav", import.meta.url));
writeFileSync(file, Buffer.concat([header, data]));
console.log("assets/audio/tasbih-click.wav");
