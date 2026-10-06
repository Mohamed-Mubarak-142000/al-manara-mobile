import { TOAST_ADHKAR } from "@/core/adhkar/toastAdhkar";
import { INITIAL_TASBIH, applyTasbih, currentDhikr, hourIndex, isComplete, normalizeTasbih, rotatingDhikr } from "@/widgets/tasbih";

const mockStore = new Map<string, string>();
jest.mock("expo-sqlite/kv-store", () => ({
  __esModule: true,
  default: { getItemSync: (key: string) => mockStore.get(key) ?? null, setItemSync: (key: string, value: string) => mockStore.set(key, value) },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const shortcuts = require("../plugins/withAppShortcuts");

describe("tasbih widget", () => {
  const now = new Date(2026, 9, 6, 10, 15);

  it("rotates the dhikr every hour", () => {
    const later = new Date(now.getTime() + 3_600_000);
    expect(rotatingDhikr(later).id).not.toBe(rotatingDhikr(now).id);
    expect(currentDhikr(INITIAL_TASBIH, now)).toBe(rotatingDhikr(now));
  });

  it("counts taps and keeps the counted dhikr past the hour", () => {
    let state = applyTasbih(INITIAL_TASBIH, "TASBIH_TAP", now);
    state = applyTasbih(state, "TASBIH_TAP", now);
    expect(state.count).toBe(2);
    expect(currentDhikr(state, new Date(now.getTime() + 5 * 3_600_000)).id).toBe(rotatingDhikr(now).id);
  });

  it("starts a new round on the next dhikr after reaching the target", () => {
    const done = { ...INITIAL_TASBIH, id: TOAST_ADHKAR[0]!.id, count: 33, hour: hourIndex(now) };
    expect(isComplete(done)).toBe(true);
    const next = applyTasbih(done, "TASBIH_TAP", now);
    expect(next.count).toBe(0);
    expect(currentDhikr(next, now).id).toBe(TOAST_ADHKAR[1]!.id);
  });

  it("resets and toggles the target", () => {
    const counting = { ...INITIAL_TASBIH, id: TOAST_ADHKAR[2]!.id, count: 12, hour: hourIndex(now) };
    expect(applyTasbih(counting, "TASBIH_RESET", now)).toMatchObject({ count: 0, id: TOAST_ADHKAR[2]!.id });
    expect(applyTasbih(counting, "TASBIH_TARGET", now).target).toBe(100);
    expect(applyTasbih({ ...counting, target: 100 }, "TASBIH_TARGET", now).target).toBe(33);
  });

  it("repairs bad saved state", () => {
    expect(normalizeTasbih(null)).toEqual(INITIAL_TASBIH);
    expect(normalizeTasbih({ count: -3, target: 7 as never, id: 5 as never })).toEqual(INITIAL_TASBIH);
  });
});

describe("continue-reading link", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { redirectSystemPath } = require("@/app/+native-intent") as typeof import("@/app/+native-intent");

  it("opens the last-read page", () => {
    mockStore.set("al-manara:reader:v1", JSON.stringify({ lastRead: { page: 42, surah: 3, ayah: 7, at: 1 } }));
    expect(redirectSystemPath({ path: "almanara://continue", initial: true })).toBe("/mushaf?page=42");
    expect(redirectSystemPath({ path: "/continue", initial: false })).toBe("/mushaf?page=42");
  });

  it("falls back to the mushaf and leaves other links alone", () => {
    mockStore.clear();
    expect(redirectSystemPath({ path: "almanara://continue", initial: true })).toBe("/mushaf");
    expect(redirectSystemPath({ path: "almanara://adhkar", initial: true })).toBe("almanara://adhkar");
    expect(redirectSystemPath({ path: "/continued-story", initial: true })).toBe("/continued-story");
  });
});

describe("launcher shortcuts plugin", () => {
  it("targets the main activity with VIEW links and string labels", () => {
    const xml: string = shortcuts.shortcutsXml("com.almanara.app");
    expect(xml).toContain('android:targetClass="com.almanara.app.MainActivity"');
    expect(xml).toContain('android:action="android.intent.action.VIEW"');
    for (const uri of ["almanara://continue", "almanara://adhkar", "almanara://qibla", "almanara://radio"]) {
      expect(xml).toContain(`android:data="${uri}"`);
    }
    expect(xml).toContain('android:shortcutShortLabel="@string/shortcut_continue_short"');
    expect(shortcuts.stringsXml()).toContain('<string name="shortcut_continue_short">أكمل القراءة</string>');
  });
});
