/// <reference types="jest" />
jest.mock("expo-sqlite/kv-store", () => ({ __esModule: true, default: { getItemSync: jest.fn(() => null), setItemSync: jest.fn() } }));

import { LOOP_GUARD_MS, MAX_AGE_MS, buildHref, decideRestore, isRestorable, isUserLaunchUrl, shouldSave } from "@/lib/navRestore";

const NOW = 1_800_000_000_000;
const base = { now: NOW, launchedByLink: false, onboardingDone: true, lastRestoreAt: null };

describe("decideRestore", () => {
  it("restores a recent screen", () => {
    expect(decideRestore({ ...base, saved: { href: "/hadith/12?q=x", at: NOW - 60_000 } })).toBe("/hadith/12?q=x");
  });

  it("ignores old or future-dated routes", () => {
    expect(decideRestore({ ...base, saved: { href: "/mushaf", at: NOW - MAX_AGE_MS } })).toBeNull();
    expect(decideRestore({ ...base, saved: { href: "/mushaf", at: NOW - MAX_AGE_MS + 1 } })).toBe("/mushaf");
    expect(decideRestore({ ...base, saved: { href: "/mushaf", at: NOW + 5_000 } })).toBeNull();
  });

  it("lets a deep link, shortcut or notification win", () => {
    expect(decideRestore({ ...base, launchedByLink: true, saved: { href: "/mushaf", at: NOW - 1000 } })).toBeNull();
  });

  it("waits for onboarding and needs a saved route", () => {
    expect(decideRestore({ ...base, onboardingDone: false, saved: { href: "/mushaf", at: NOW - 1000 } })).toBeNull();
    expect(decideRestore({ ...base, saved: null })).toBeNull();
  });

  it("does not loop back into a screen that was just restored", () => {
    const saved = { href: "/mushaf", at: NOW - 1000 };
    expect(decideRestore({ ...base, saved, lastRestoreAt: NOW - 5_000 })).toBeNull();
    expect(decideRestore({ ...base, saved, lastRestoreAt: NOW - LOOP_GUARD_MS })).toBe("/mushaf");
  });

  it("skips Home, auth, onboarding and modal routes", () => {
    for (const href of ["/", "/onboarding", "/login", "/register?x=1", "/verify", "/forgot-password", "/reset-password", "/auth/callback", "/player", "/share-card"]) {
      expect(decideRestore({ ...base, saved: { href, at: NOW - 1000 } })).toBeNull();
    }
  });
});

describe("route helpers", () => {
  it("knows what is restorable and what to save", () => {
    expect(isRestorable("/adhkar")).toBe(true);
    expect(isRestorable("/listen/5/")).toBe(true);
    expect(isRestorable("mushaf")).toBe(false);
    expect(shouldSave("/")).toBe(true);
    expect(shouldSave("/player")).toBe(false);
    expect(shouldSave("/hadith/3")).toBe(true);
  });

  it("drops params that fill dynamic segments", () => {
    expect(buildHref("/hadith/12", { id: "12", q: "صلاة" }, ["hadith", "[id]"])).toBe("/hadith/12?q=%D8%B5%D9%84%D8%A7%D8%A9");
    expect(buildHref("/mushaf", { page: "5" }, ["mushaf"])).toBe("/mushaf?page=5");
    expect(buildHref("/a/b/c", { rest: ["b", "c"] }, ["a", "[...rest]"])).toBe("/a/b/c");
    expect(buildHref("/", {}, [])).toBe("/");
  });

  it("ignores the dev-client launch URL", () => {
    expect(isUserLaunchUrl(null)).toBe(false);
    expect(isUserLaunchUrl("exp+almanara://expo-development-client/?url=http%3A%2F%2F10.0.0.2%3A8081")).toBe(false);
    expect(isUserLaunchUrl("almanara://adhkar")).toBe(true);
  });
});
