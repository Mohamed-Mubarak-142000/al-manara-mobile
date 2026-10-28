// Renders the seerah's sounds into WAV files (assets/audio/seerah-*.wav). The website synthesizes
// the same sounds live with WebAudio (eslam-platform src/features/seerah/seerahSound.ts); the app
// plays them from files instead. Two kinds:
//
// - Ambience loops (wind, crickets, waves, crowd, birds): eight seconds each, their tails crossfaded
//   into their heads so they loop without a seam.
// - Effects: a breath of air between beats, a chime, a wrong answer, a swish of sand, camel bells, a
//   rumble, a gust of wind, a short fanfare.
//
// No recordings, nothing to license, no music. Run: node scripts/build-seerah-sfx.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const RATE = 16000;
const LOOP = 8;
const FADE = 0.5;

/** The same noise every build: a seeded generator instead of Math.random. */
function random(seed) {
  let state = seed;
  return () => (state = (state * 16807) % 2147483647) / 2147483647;
}

function white(length, seed) {
  const next = random(seed);
  return Float32Array.from({ length }, () => next() * 2 - 1);
}

/** Brown noise: white noise integrated, deeper, for wind and sea. */
function brown(length, seed) {
  const source = white(length, seed);
  let last = 0;
  return source.map((value) => (last = (last + 0.02 * value) / 1.02) * 3.5);
}

/** An RBJ biquad, its cutoff allowed to move sample by sample. */
function biquad(input, type, frequencyAt, q = 0.707) {
  const out = new Float32Array(input.length);
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let index = 0; index < input.length; index++) {
    const w = (2 * Math.PI * frequencyAt(index / RATE)) / RATE;
    const alpha = Math.sin(w) / (2 * q);
    const cos = Math.cos(w);
    let b0, b1, b2;
    if (type === "lowpass") [b0, b1, b2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
    else [b0, b1, b2] = [alpha, 0, -alpha];
    const a0 = 1 + alpha,
      a1 = -2 * cos,
      a2 = 1 - alpha;
    const x = input[index];
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    [x2, x1, y2, y1] = [x1, x, y1, y];
    out[index] = y;
  }
  return out;
}

/** A soft tone added into a buffer: quick attack, exponential tail. */
function tone(buffer, frequency, at, length, level, sweep) {
  const start = Math.floor(at * RATE);
  let phase = 0;
  for (let index = 0; index < length * RATE && start + index < buffer.length; index++) {
    const t = index / RATE;
    const f = sweep ? sweep(t) : frequency;
    phase += (2 * Math.PI * f) / RATE;
    const envelope = Math.min(1, t / 0.008) * Math.exp((-t * 5) / length);
    buffer[start + index] += Math.sin(phase) * level * envelope;
  }
}

/** Renders LOOP + FADE seconds and folds the tail over the head, so the loop has no seam. */
function loop(render) {
  const total = Math.ceil((LOOP + FADE) * RATE);
  const raw = render(total);
  const length = LOOP * RATE;
  const fade = FADE * RATE;
  const out = raw.slice(0, length);
  for (let index = 0; index < fade; index++) {
    const mix = index / fade;
    out[index] = raw[index] * mix + raw[length + index] * (1 - mix);
  }
  return out;
}

const AMBIENCE = {
  wind: () =>
    loop((total) => {
      const noise = brown(total, 11);
      // The low-pass opens and closes twice a loop: gusts.
      const filtered = biquad(noise, "lowpass", (t) => 420 + 220 * Math.sin((2 * Math.PI * t * 2) / LOOP));
      return filtered.map((value) => value * 0.9);
    }),
  waves: () =>
    loop((total) => {
      const filtered = biquad(brown(total, 23), "lowpass", () => 800);
      // Two swells a loop, each rising and falling.
      return filtered.map((value, index) => value * (0.55 + 0.45 * Math.sin((2 * Math.PI * (index / RATE) * 2) / LOOP)) * 1.1);
    }),
  crowd: () =>
    loop((total) => {
      const filtered = biquad(white(total, 37), "bandpass", () => 620, 0.9);
      return filtered.map((value, index) => {
        const t = index / RATE;
        return value * (0.6 + 0.25 * Math.sin((2 * Math.PI * t * 3) / LOOP) + 0.15 * Math.sin((2 * Math.PI * t * 5) / LOOP)) * 2.2;
      });
    }),
  crickets: () =>
    loop((total) => {
      const buffer = new Float32Array(total);
      const next = random(53);
      for (let at = 0; at < total / RATE; at += 0.24) {
        if (next() > 0.55) continue;
        const pitch = 4200 + next() * 600;
        for (let pulse = 0; pulse < 3; pulse++) tone(buffer, pitch, at + pulse * 0.045, 0.03, 0.18);
      }
      return buffer;
    }),
  birds: () =>
    loop((total) => {
      const buffer = new Float32Array(total);
      const next = random(71);
      for (let at = 0.3; at < total / RATE; at += 1.4) {
        if (next() > 0.5) continue;
        const base = 2400 + next() * 900;
        const notes = 2 + Math.floor(next() * 2);
        for (let note = 0; note < notes; note++) {
          tone(buffer, base, at + note * 0.14, 0.12, 0.2, (t) =>
            t < 0.06 ? base * (1 + (0.35 * t) / 0.06) : base * (1.35 - (0.25 * (t - 0.06)) / 0.06),
          );
        }
      }
      return buffer;
    }),
};

function effect(seconds, render) {
  const buffer = new Float32Array(Math.ceil(seconds * RATE));
  render(buffer);
  return buffer;
}

const EFFECTS = {
  /** A breath of air as the story moves on a beat. */
  pass: () => {
    const noise = white(Math.ceil(0.55 * RATE), 7);
    const filtered = biquad(noise, "lowpass", (t) => 300 + 900 * Math.sin((Math.PI * t) / 0.55));
    return filtered.map((value, index) => value * Math.sin((Math.PI * index) / filtered.length) ** 2 * 0.8);
  },
  chime: () =>
    effect(1.4, (buffer) => {
      tone(buffer, 880, 0, 1.2, 0.3);
      tone(buffer, 1318.5, 0.06, 0.9, 0.15);
    }),
  wrong: () => effect(0.45, (buffer) => tone(buffer, 240, 0, 0.35, 0.3, (t) => 240 - 70 * Math.min(1, t / 0.3))),
  swish: () => {
    const filtered = biquad(white(Math.ceil(0.3 * RATE), 13), "bandpass", () => 2400, 1);
    return filtered.map((value, index) => value * Math.sin((Math.PI * index) / filtered.length) * 0.9);
  },
  bells: () =>
    effect(2.2, (buffer) => {
      const next = random(29);
      for (let ring = 0; ring < 6; ring++) {
        const at = ring * 0.32 + next() * 0.05;
        tone(buffer, 1650 + next() * 120, at, 0.35, 0.12);
        tone(buffer, 2480 + next() * 160, at, 0.25, 0.06);
      }
    }),
  rumble: () => {
    const filtered = biquad(brown(Math.ceil(1.3 * RATE), 31), "lowpass", () => 160);
    return filtered.map((value, index) => {
      const t = index / RATE;
      return value * Math.min(1, t / 0.15) * Math.exp(-Math.max(0, t - 0.15) * 3.5) * 2.4;
    });
  },
  gust: () => {
    const filtered = biquad(brown(Math.ceil(2.6 * RATE), 41), "lowpass", (t) =>
      t < 1 ? 300 + 1100 * t : Math.max(300, 1400 - (1100 * (t - 1)) / 1.4),
    );
    return filtered.map((value, index) => value * Math.sin((Math.PI * index) / filtered.length) ** 1.5 * 1.6);
  },
  fanfare: () =>
    effect(1.5, (buffer) => {
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => tone(buffer, frequency, index * 0.13, index === 3 ? 0.9 : 0.25, 0.22));
    }),
};

/** Peaks brought to a common level, so no sound jumps out over the others. */
function normalize(samples, peak) {
  const max = samples.reduce((top, value) => Math.max(top, Math.abs(value)), 0) || 1;
  return samples.map((value) => (value / max) * peak);
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

const PEAKS = {
  wind: 0.5,
  waves: 0.55,
  crowd: 0.35,
  crickets: 0.3,
  birds: 0.35,
  pass: 0.3,
  chime: 0.45,
  wrong: 0.4,
  swish: 0.35,
  bells: 0.4,
  rumble: 0.6,
  gust: 0.6,
  fanfare: 0.45,
};

for (const [name, render] of Object.entries({ ...AMBIENCE, ...EFFECTS })) {
  const file = fileURLToPath(new URL(`../assets/audio/seerah-${name}.wav`, import.meta.url));
  writeFileSync(file, toWav(normalize(render(), PEAKS[name])));
  console.log(`seerah-${name}.wav`);
}
