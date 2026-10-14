/// <reference types="jest" />
import {
  DEFAULT_TASBIH,
  MAX_CUSTOM,
  applyTasbih,
  currentDhikr,
  localDate,
  normalizeTasbih,
  parseTarget,
  sessionOf,
  tapCompletesRound,
  todayCount,
  type TasbihState,
} from "@/core/tasbih/tasbih";
import { PRESET_ADHKAR } from "@/core/tasbih/tasbihData";

describe("electronic tasbih", () => {
  const now = new Date(2026, 9, 13, 9, 30);
  const tap = (state: TasbihState, times = 1, at = now) => {
    let next = state;
    for (let i = 0; i < times; i += 1) next = applyTasbih(next, { type: "tap" }, at);
    return next;
  };

  it("starts on the first preset with its usual target", () => {
    expect(currentDhikr(DEFAULT_TASBIH).id).toBe(PRESET_ADHKAR[0]!.id);
    expect(sessionOf(DEFAULT_TASBIH, currentDhikr(DEFAULT_TASBIH))).toEqual({ count: 0, rounds: 0, target: 33 });
  });

  it("counts taps, and a full round adds a round and starts again at zero", () => {
    const almost = tap(DEFAULT_TASBIH, 32);
    expect(sessionOf(almost, currentDhikr(almost)).count).toBe(32);
    expect(tapCompletesRound(almost)).toBe(true);
    const done = tap(almost);
    expect(sessionOf(done, currentDhikr(done))).toMatchObject({ count: 0, rounds: 1 });
    expect(done.total).toBe(33);
    expect(todayCount(done, now)).toBe(33);
  });

  it("counts on with no rounds when the target is open", () => {
    const open = applyTasbih(DEFAULT_TASBIH, { type: "target", target: 0 });
    const counted = tap(open, 50);
    expect(tapCompletesRound(counted)).toBe(false);
    expect(sessionOf(counted, currentDhikr(counted))).toMatchObject({ count: 50, rounds: 0, target: 0 });
  });

  it("keeps a separate count per dhikr, and resets only the current one", () => {
    const first = tap(DEFAULT_TASBIH, 5);
    const second = tap(applyTasbih(first, { type: "select", id: "hamd" }), 3);
    expect(second.sessions.subhan!.count).toBe(5);
    expect(second.sessions.hamd!.count).toBe(3);
    const reset = applyTasbih(second, { type: "reset" });
    expect(reset.sessions.hamd).toMatchObject({ count: 0, rounds: 0 });
    expect(reset.sessions.subhan!.count).toBe(5);
    expect(reset.total).toBe(8);
  });

  it("starts today's count over on a new day", () => {
    const yesterday = tap(DEFAULT_TASBIH, 10, new Date(2026, 9, 12, 22));
    expect(todayCount(yesterday, now)).toBe(0);
    expect(tap(yesterday, 1, now).today).toEqual({ date: localDate(now), count: 1 });
  });

  it("adds, selects and deletes the user's own adhkar", () => {
    const added = applyTasbih(DEFAULT_TASBIH, { type: "add", id: "custom-1", text: "  سبحان الله وبحمده  ", target: 7 });
    expect(currentDhikr(added)).toEqual({ id: "custom-1", text: "سبحان الله وبحمده", target: 7 });
    expect(applyTasbih(added, { type: "add", id: "custom-2", text: "   ", target: 0 })).toBe(added);
    const removed = applyTasbih(tap(added, 2), { type: "remove", id: "custom-1" });
    expect(removed.custom).toHaveLength(0);
    expect(removed.sessions["custom-1"]).toBeUndefined();
    expect(currentDhikr(removed).id).toBe(PRESET_ADHKAR[0]!.id);
    expect(applyTasbih(DEFAULT_TASBIH, { type: "select", id: "missing" })).toBe(DEFAULT_TASBIH);
  });

  it("keeps at most fifty own adhkar", () => {
    let state = DEFAULT_TASBIH;
    for (let i = 0; i < MAX_CUSTOM + 5; i += 1) state = applyTasbih(state, { type: "add", id: `c${i}`, text: `ذكر ${i}`, target: 0 });
    expect(state.custom).toHaveLength(MAX_CUSTOM);
    expect(state.custom[0]!.id).toBe(`c${MAX_CUSTOM + 4}`);
  });

  it("reads typed targets in Arabic or Latin digits", () => {
    expect(parseTarget("٣٣")).toBe(33);
    expect(parseTarget("۱۰۰")).toBe(100);
    expect(parseTarget(" 250 ")).toBe(250);
    expect(parseTarget("999999")).toBe(100_000);
    expect(parseTarget("0")).toBeNull();
    expect(parseTarget("abc")).toBeNull();
  });

  it("turns the click sound off and on, and keeps a saved choice", () => {
    const off = applyTasbih(DEFAULT_TASBIH, { type: "sound" });
    expect(off.sound).toBe(false);
    expect(applyTasbih(off, { type: "sound" }).sound).toBe(true);
    expect(normalizeTasbih({ ...DEFAULT_TASBIH, sound: false }).sound).toBe(false);
  });

  it("repairs a damaged save instead of crashing", () => {
    expect(normalizeTasbih(null)).toEqual(DEFAULT_TASBIH);
    const repaired = normalizeTasbih({
      dhikrId: "hamd",
      sessions: { hamd: { count: -3, rounds: 2.5, target: 33 }, bad: null },
      custom: [
        { id: "x", text: "" },
        { id: "y", text: "ذكر", target: 10 },
      ],
      theme: "neon",
      vibrate: "yes",
      total: 12,
      today: { date: "2026-10-13", count: 4 },
    });
    expect(repaired).toEqual({
      dhikrId: "hamd",
      sessions: { hamd: { count: 0, rounds: 0, target: 33 } },
      custom: [{ id: "y", text: "ذكر", target: 10 }],
      theme: "emerald",
      vibrate: true,
      // Saves from before the click sound start with it on.
      sound: true,
      total: 12,
      today: { date: "2026-10-13", count: 4 },
    });
  });
});
