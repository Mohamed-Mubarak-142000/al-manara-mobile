/// <reference types="jest" />
import { DUAS } from "@/core/adhkar/duasData";
import { HADITHS, MEDINA_SECTIONS, MIQATS, TRAVEL_DUAS, UMRAH_STEPS, VERSES, type Block } from "@/core/umrah/umrahGuide";
import {
  DEFAULT_UMRAH,
  MAX_SCALE,
  MIN_SCALE,
  ROUNDS,
  goToStep,
  isRamalRound,
  normalizeUmrah,
  saiAtMarwa,
  setRounds,
  stepScale,
} from "@/core/umrah/umrahState";
import { globalAyahNumber } from "@/core/quran/ayahAudio";

describe("umrah guide content", () => {
  const blocks: Block[] = [...UMRAH_STEPS, ...MEDINA_SECTIONS].flatMap((section) => section.blocks);

  it("has the nine steps, from intention to shaving", () => {
    expect(UMRAH_STEPS.map((step) => step.id)).toEqual(["prepare", "ihram", "talbiya", "haram", "tawaf", "maqam", "sai", "halq", "done"]);
  });

  it("cites only duas, hadiths and verses that exist", () => {
    const duaIds = [...blocks.flatMap((block) => (block.kind === "dua" ? [block.id] : [])), ...TRAVEL_DUAS.map((dua) => dua.id)];
    for (const id of duaIds) expect(DUAS.some((dua) => dua.id === id)).toBe(true);
    for (const block of blocks) {
      if (block.kind === "evidence") for (const key of block.keys) expect(HADITHS[key]?.url).toMatch(/^https:\/\/hadeethenc\.com\//);
      if (block.kind === "verse") expect(VERSES[block.key]).toBeDefined();
    }
  });

  it("plays each verse by its own global ayah number", () => {
    for (const verse of Object.values(VERSES)) expect(verse.audio).toBe(globalAyahNumber(verse.surah, verse.ayah));
  });

  it("puts the tawaf and sa'i counters on their steps", () => {
    expect(UMRAH_STEPS.find((step) => step.id === "tawaf")!.blocks.some((block) => block.kind === "tawaf")).toBe(true);
    expect(UMRAH_STEPS.find((step) => step.id === "sai")!.blocks.some((block) => block.kind === "sai")).toBe(true);
    expect(MIQATS.map((miqat) => miqat.id)).toContain(DEFAULT_UMRAH.origin);
  });
});

describe("umrah progress", () => {
  it("marks the step being left as done when going on, not when going back", () => {
    const on = goToStep(DEFAULT_UMRAH, "ihram", true);
    expect(on).toMatchObject({ step: "ihram", done: ["prepare"] });
    expect(goToStep(on, "prepare", false)).toMatchObject({ step: "prepare", done: ["prepare"] });
    expect(goToStep(goToStep(on, "prepare", false), "ihram", true).done).toEqual(["prepare"]);
  });

  it("keeps the rounds within seven, ramal in the first three, sa'i ending at Marwa", () => {
    expect(setRounds(-1)).toBe(0);
    expect(setRounds(9)).toBe(ROUNDS);
    expect([0, 1, 2, 3].map(isRamalRound)).toEqual([true, true, true, false]);
    expect(saiAtMarwa(0)).toBe(false);
    expect(saiAtMarwa(1)).toBe(true);
    expect(saiAtMarwa(ROUNDS)).toBe(true);
  });

  it("steps the text size within its range", () => {
    expect(stepScale(1, 1)).toBe(1.1);
    expect(stepScale(MAX_SCALE, 1)).toBe(MAX_SCALE);
    expect(stepScale(MIN_SCALE, -1)).toBe(MIN_SCALE);
  });

  it("restores a saved count mid-tawaf and repairs a damaged save", () => {
    expect(normalizeUmrah({ ...DEFAULT_UMRAH, step: "tawaf", tawaf: 4 })).toMatchObject({ step: "tawaf", tawaf: 4 });
    expect(normalizeUmrah(null)).toEqual(DEFAULT_UMRAH);
    expect(normalizeUmrah({ step: "moon", done: ["prepare", "x", "prepare"], origin: "mars", tawaf: 12, sai: -2, scale: 9 })).toEqual({
      ...DEFAULT_UMRAH,
      done: ["prepare"],
      tawaf: ROUNDS,
      scale: MAX_SCALE,
    });
  });
});
