/// <reference types="jest" />
import { ADHAN_SCREEN_FRESH_MS, adhanScreenPath, isFreshAdhan, parseAdhanScreen } from "@/core/prayer/adhanScreen";

describe("the adhan screen route", () => {
  const at = Date.parse("2026-10-28T15:12:00Z");

  it("carries the prayer and its time there and back", () => {
    const path = adhanScreenPath({ prayer: "asr", at, iftar: false });
    expect(path).toBe(`adhan-now?prayer=asr&at=${at}`);
    const params = Object.fromEntries(new URLSearchParams(path.split("?")[1]));
    expect(parseAdhanScreen(params)).toEqual({ prayer: "asr", at, iftar: false });
  });

  it("marks Ramadan's Maghrib as the iftar, and only Maghrib", () => {
    expect(adhanScreenPath({ prayer: "maghrib", at, iftar: true })).toContain("iftar=1");
    expect(parseAdhanScreen({ prayer: "maghrib", at: String(at), iftar: "1" })?.iftar).toBe(true);
    expect(parseAdhanScreen({ prayer: "isha", at: String(at), iftar: "1" })?.iftar).toBe(false);
  });

  it("names no prayer for a bad or missing one", () => {
    expect(parseAdhanScreen({ prayer: "sunrise", at: String(at) })).toBeNull();
    expect(parseAdhanScreen({ prayer: "fajr", at: "soon" })).toBeNull();
    expect(parseAdhanScreen({})).toBeNull();
  });

  it("says 'now' only within half an hour of the prayer", () => {
    const moment = { prayer: "fajr" as const, at, iftar: false };
    expect(isFreshAdhan(moment, at + 5 * 60_000)).toBe(true);
    expect(isFreshAdhan(moment, at + ADHAN_SCREEN_FRESH_MS + 1)).toBe(false);
  });
});
