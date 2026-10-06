/// <reference types="jest" />
import {
  createAutoAdvance,
  dayKey,
  indexFromOffset,
  liveSponsors,
  nextIndex,
  parseSponsorCache,
} from "@/features/home/SponsorRotation";

const sponsor = (id: string, starts_on?: string, ends_on?: string) => ({
  id,
  name: id,
  message: "m",
  link_url: null,
  logo_url: null,
  starts_on,
  ends_on,
});

describe("sponsor carousel indexes", () => {
  it("advances and loops back to the first slide", () => {
    expect(nextIndex(0, 3)).toBe(1);
    expect(nextIndex(1, 3)).toBe(2);
    expect(nextIndex(2, 3)).toBe(0);
  });

  it("stays put with fewer than two slides and clamps stale indexes", () => {
    expect(nextIndex(0, 1)).toBe(0);
    expect(nextIndex(0, 0)).toBe(0);
    expect(nextIndex(7, 3)).toBe(0); // past the end after the list shrank: last → first
    expect(nextIndex(-2, 3)).toBe(1);
  });

  it("maps offsets to slides, mirrored (negative) offsets included", () => {
    expect(indexFromOffset(0, 300, 3)).toBe(0);
    expect(indexFromOffset(310, 300, 3)).toBe(1);
    expect(indexFromOffset(-600, 300, 3)).toBe(2);
    expect(indexFromOffset(5000, 300, 3)).toBe(2);
    expect(indexFromOffset(100, 0, 3)).toBe(0);
  });
});

describe("sponsor cache", () => {
  it("keeps only sponsors running today (inclusive)", () => {
    const list = [sponsor("a", "2026-10-01", "2026-10-06"), sponsor("b", "2026-10-07", "2026-10-30"), sponsor("c", "2026-09-01", "2026-10-05"), sponsor("d")];
    expect(liveSponsors(list, "2026-10-06").map((item) => item.id)).toEqual(["a", "d"]);
  });

  it("parses only well-formed entries", () => {
    expect(parseSponsorCache(null)).toEqual([]);
    expect(parseSponsorCache("{bad")).toEqual([]);
    expect(parseSponsorCache(JSON.stringify({ id: "x" }))).toEqual([]);
    expect(parseSponsorCache(JSON.stringify([sponsor("a"), { id: 1 }, null])).map((item) => item.id)).toEqual(["a"]);
  });

  it("formats the local day", () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("auto-advance timer", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const setup = () => {
    const onAdvance = jest.fn();
    const timer = createAutoAdvance({ intervalMs: 5000, resumeAfterMs: 3000, onAdvance, blocked: ["unmeasured"] });
    return { onAdvance, timer };
  };

  it("waits until unblocked, then ticks every interval", () => {
    const { onAdvance, timer } = setup();
    jest.advanceTimersByTime(20000);
    expect(onAdvance).not.toHaveBeenCalled();
    timer.update({ unmeasured: false, unfocused: false });
    jest.advanceTimersByTime(4999);
    expect(onAdvance).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(onAdvance).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(10000);
    expect(onAdvance).toHaveBeenCalledTimes(3);
    timer.dispose();
  });

  it("pauses while unfocused, backgrounded or with reduce motion", () => {
    const { onAdvance, timer } = setup();
    timer.update({ unmeasured: false });
    for (const reason of ["unfocused", "background", "reduceMotion"]) {
      timer.update({ [reason]: true });
      jest.advanceTimersByTime(30000);
      expect(onAdvance).not.toHaveBeenCalled();
      expect(timer.isRunning()).toBe(false);
      timer.update({ [reason]: false });
      expect(timer.isRunning()).toBe(true);
    }
    // Restarting gives the slide a full interval.
    jest.advanceTimersByTime(5000);
    expect(onAdvance).toHaveBeenCalledTimes(1);
    timer.dispose();
  });

  it("stops on touch and resumes the interval 3s after release", () => {
    const { onAdvance, timer } = setup();
    timer.update({ unmeasured: false });
    jest.advanceTimersByTime(4000);
    timer.touchStart();
    jest.advanceTimersByTime(20000);
    expect(onAdvance).not.toHaveBeenCalled();
    timer.touchEnd();
    jest.advanceTimersByTime(3000 + 4999);
    expect(onAdvance).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(onAdvance).toHaveBeenCalledTimes(1);
    timer.dispose();
  });

  it("a new touch during the cool-down keeps it paused", () => {
    const { onAdvance, timer } = setup();
    timer.update({ unmeasured: false });
    timer.touchStart();
    timer.touchEnd();
    jest.advanceTimersByTime(2000);
    timer.touchStart();
    jest.advanceTimersByTime(20000);
    expect(onAdvance).not.toHaveBeenCalled();
    timer.touchEnd();
    jest.advanceTimersByTime(8000);
    expect(onAdvance).toHaveBeenCalledTimes(1);
    timer.dispose();
  });

  it("does not resume after release while still blocked, and never ticks after dispose", () => {
    const { onAdvance, timer } = setup();
    timer.update({ unmeasured: false });
    timer.touchStart();
    timer.update({ unfocused: true });
    timer.touchEnd();
    jest.advanceTimersByTime(30000);
    expect(onAdvance).not.toHaveBeenCalled();
    timer.update({ unfocused: false });
    timer.dispose();
    jest.advanceTimersByTime(30000);
    expect(onAdvance).not.toHaveBeenCalled();
  });
});
