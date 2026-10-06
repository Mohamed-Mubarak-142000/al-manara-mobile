import { cachedFetch } from "@/core/http";
import {
  DEFAULT_CALC_SETTINGS,
  aladhanParams,
  calcSettingsKey,
  normalizeCalcSettings,
  shiftClock,
  type PrayerCalcSettings,
} from "@/core/prayer/calculation";
import { calculatePrayerDay, calculatePrayerMonth, wallClock } from "@/core/prayer/localPrayerTimes";
import { resolvePlace, type UserLocation } from "@/core/prayer/location";
import { getPrayerDay, getPrayerMonth, type PrayerTimes } from "@/core/prayer/prayerTimesApi";
import { prayerMomentDate } from "@/features/prayer/prayerMomentDate";

jest.mock("@/core/http", () => ({ cachedFetch: jest.fn() }));

const cairo: UserLocation = { source: "timezone", label: "القاهرة", city: "Cairo", country: "Egypt" };
const riyadh: UserLocation = { source: "timezone", label: "الرياض", city: "Riyadh", country: "Saudi Arabia" };

function minutes(hhmm: string): number {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Within a minute or two of aladhan.com (rounding and city-centre coordinates differ slightly). */
function expectClose(actual: PrayerTimes, expected: PrayerTimes, tolerance = 2) {
  for (const key of Object.keys(expected) as (keyof PrayerTimes)[]) {
    expect(Math.abs(minutes(actual[key]) - minutes(expected[key]))).toBeLessThanOrEqual(tolerance);
  }
}

describe("on-device prayer times", () => {
  it("matches aladhan for Cairo, Egyptian method (6 Oct 2026)", () => {
    const day = calculatePrayerDay(cairo, new Date(2026, 9, 6))!;
    expect(day.timezone).toBe("Africa/Cairo");
    expect(day.source).toBe("device");
    expect(day.gregorianDate).toBe("06 Oct 2026");
    expectClose(day.times, { fajr: "05:25", sunrise: "06:51", dhuhr: "12:43", asr: "16:05", maghrib: "18:35", isha: "19:52" });
  });

  it("applies the madhab and the per-prayer offsets", () => {
    const settings: PrayerCalcSettings = {
      method: "Egyptian",
      madhab: "hanafi",
      offsets: { fajr: 2, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: -3 },
    };
    const day = calculatePrayerDay(cairo, new Date(2026, 9, 6), settings)!;
    expectClose(day.times, { fajr: "05:27", sunrise: "06:51", dhuhr: "12:43", asr: "16:55", maghrib: "18:35", isha: "19:49" });
  });

  it("matches aladhan for Riyadh, Umm al-Qura (15 Jan 2026)", () => {
    const day = calculatePrayerDay(riyadh, new Date(2026, 0, 15), { ...DEFAULT_CALC_SETTINGS, method: "UmmAlQura" })!;
    expectClose(day.times, { fajr: "05:17", sunrise: "06:40", dhuhr: "12:03", asr: "15:05", maghrib: "17:26", isha: "18:56" });
  });

  it("writes wall times that prayerMomentDate turns back into the same instants", () => {
    const [today] = calculatePrayerMonth(cairo, 2026, 7);
    const back = prayerMomentDate(2026, 7, 1, today!.times.maghrib, today!.timezone);
    expect(wallClock(back, "Africa/Cairo")).toBe(today!.times.maghrib);
  });

  it("fills a whole month", () => {
    const days = calculatePrayerMonth(cairo, 2026, 2);
    expect(days).toHaveLength(28);
    expect(days.map((day) => day.day)).toEqual(Array.from({ length: 28 }, (_, index) => index + 1));
  });

  it("uses the shared GPS position, and gives up on unknown cities", () => {
    expect(resolvePlace({ ...cairo, source: "geo", latitude: 31.2, longitude: 29.9 })).toMatchObject({ latitude: 31.2, longitude: 29.9 });
    expect(resolvePlace({ ...cairo, city: "Atlantis" })).toBeNull();
    expect(calculatePrayerMonth({ ...cairo, city: "Atlantis" }, 2026, 2)).toEqual([]);
  });
});

describe("calculation settings", () => {
  it("builds aladhan parameters, keeping the old URL when nothing is tuned", () => {
    expect(aladhanParams(DEFAULT_CALC_SETTINGS)).toBe("method=5");
    expect(
      aladhanParams({ method: "UmmAlQura", madhab: "hanafi", offsets: { fajr: 2, sunrise: 0, dhuhr: 1, asr: 0, maghrib: 3, isha: -3 } }),
    ).toBe("method=4&school=1&tune=0,2,0,1,0,3,0,-3,0");
  });

  it("normalises saved values", () => {
    expect(normalizeCalcSettings(null)).toEqual(DEFAULT_CALC_SETTINGS);
    const saved = normalizeCalcSettings({ method: "Nope", madhab: "x", offsets: { fajr: 99, isha: -45, asr: "3" } });
    expect(saved.method).toBe("Egyptian");
    expect(saved.madhab).toBe("shafi");
    expect(saved.offsets).toEqual({ fajr: 30, sunrise: 0, dhuhr: 0, asr: 3, maghrib: 0, isha: -30 });
    expect(calcSettingsKey(saved)).not.toBe(calcSettingsKey(DEFAULT_CALC_SETTINGS));
  });

  it("shifts clock times across midnight", () => {
    expect(shiftClock("04:05", -10)).toBe("03:55");
    expect(shiftClock("00:05", -10)).toBe("23:55");
  });
});

describe("API with on-device fallback", () => {
  beforeEach(() => jest.mocked(cachedFetch).mockReset());

  it("calculates locally when the network fails", async () => {
    jest.mocked(cachedFetch).mockRejectedValue(new Error("offline"));
    const day = await getPrayerDay(cairo, new Date(2026, 9, 6));
    expect(day?.source).toBe("device");
    expect(await getPrayerMonth(cairo, 2026, 10)).toHaveLength(31);
  });

  it("prefers the API and sends the settings", async () => {
    const raw = {
      timings: { Fajr: "05:25 (EET)", Sunrise: "06:51", Dhuhr: "12:43", Asr: "16:05", Maghrib: "18:35", Isha: "19:52" },
      date: { readable: "06 Oct 2026", gregorian: { day: "06" } },
      meta: { latitude: 30.0444, longitude: 31.2357, timezone: "Africa/Cairo" },
    };
    jest.mocked(cachedFetch).mockResolvedValue(new Response(JSON.stringify({ code: 200, data: raw })));
    const day = await getPrayerDay(cairo, new Date(2026, 9, 6), { ...DEFAULT_CALC_SETTINGS, madhab: "hanafi" });
    expect(day?.source).toBeUndefined();
    expect(day?.times.fajr).toBe("05:25");
    expect(jest.mocked(cachedFetch).mock.calls[0]![0]).toContain("method=5&school=1");
  });
});
