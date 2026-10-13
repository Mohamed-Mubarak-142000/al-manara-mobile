// Renders the kids area's game sounds into small WAV files (assets/audio/kids-*.wav).
// The website synthesizes the same notes with WebAudio at play time (features/kids/sfx.ts); the app
// plays them from files instead. Run: node scripts/build-kids-sfx.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const RATE = 22050;
const GAIN = 0.12 * 2.2; // The website's gain, a little louder for phone speakers.

/** The website's sfx notes: [frequency, start, duration] per sound, and the oscillator type. */
const SOUNDS = {
  tap: { type: "triangle", notes: [[660, 0, 0.08]] },
  correct: {
    type: "triangle",
    notes: [
      [523, 0, 0.12],
      [784, 0.1, 0.2],
    ],
  },
  wrong: { type: "sine", notes: [[220, 0, 0.18]] },
  flip: { type: "triangle", notes: [[440, 0, 0.06]] },
  win: {
    type: "triangle",
    notes: [
      [523, 0, 0.14],
      [659, 0.12, 0.14],
      [784, 0.24, 0.14],
      [1047, 0.36, 0.3],
    ],
  },
};

function wave(type, phase) {
  const x = phase - Math.floor(phase);
  if (type === "sine") return Math.sin(2 * Math.PI * x);
  // Triangle, like the OscillatorNode's.
  return 4 * Math.abs(x - 0.5) - 1;
}

/** exponentialRampToValueAtTime 0.0001 → gain over 20 ms, then back to 0.0001 at the end. */
function envelope(t, duration) {
  const floor = 0.0001;
  if (t < 0) return 0;
  if (t < 0.02) return floor * Math.pow(GAIN / floor, t / 0.02);
  if (t < duration) return GAIN * Math.pow(floor / GAIN, (t - 0.02) / (duration - 0.02));
  return 0;
}

function render({ type, notes }) {
  const length = Math.max(...notes.map(([, start, duration]) => start + duration)) + 0.05;
  const samples = new Float32Array(Math.ceil(length * RATE));
  for (const [frequency, start, duration] of notes) {
    for (let i = Math.floor(start * RATE); i < samples.length; i++) {
      const t = i / RATE - start;
      if (t > duration) break;
      samples[i] += wave(type, frequency * t) * envelope(t, duration);
    }
  }
  return samples;
}

function toWav(samples) {
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
  return Buffer.concat([header, data]);
}

for (const [name, sound] of Object.entries(SOUNDS)) {
  const file = fileURLToPath(new URL(`../assets/audio/kids-${name}.wav`, import.meta.url));
  writeFileSync(file, toWav(render(sound)));
  console.log(`assets/audio/kids-${name}.wav`);
}
