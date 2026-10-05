import * as Notifications from "expo-notifications";
import Storage from "expo-sqlite/kv-store";
import { background, type BackgroundStatus } from "../modules/almanara-background";
import { disableOverlay, enableOverlay } from "@/features/notifications/BackgroundReminders";

jest.mock("../modules/almanara-background", () => ({
  background: { getStatus: jest.fn(), setOverlay: jest.fn(), openOverlaySettings: jest.fn() },
}));
jest.mock("expo-sqlite/kv-store", () => ({ __esModule: true, default: { setItemSync: jest.fn(), removeItemSync: jest.fn() } }));
jest.mock("expo-notifications", () => ({
  setNotificationChannelAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  AndroidImportance: { LOW: 2 },
}));
jest.mock("@/features/adhkar/adhkarReminders", () => ({ restoreAdhkarReminders: jest.fn() }));
jest.mock("@/theme/useThemeColor", () => ({ useThemeColor: jest.fn() }));

describe("overlay enable permissions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({ granted: true } as Notifications.NotificationPermissionsStatus);
    jest.mocked(background!.getStatus).mockReturnValue({ overlayAllowed: true } as BackgroundStatus);
  });
  it("creates the Android channel before requesting notifications", async () => {
    await enableOverlay("{}");
    expect(jest.mocked(Notifications.setNotificationChannelAsync).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(Notifications.requestPermissionsAsync).mock.invocationCallOrder[0],
    );
    expect(background!.setOverlay).toHaveBeenCalledWith(true, "{}");
  });
  it("does not start a foreground reminder when notifications are refused", async () => {
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({ granted: false } as Notifications.NotificationPermissionsStatus);
    await expect(enableOverlay("{}")).rejects.toThrow();
    expect(background!.setOverlay).not.toHaveBeenCalled();
    expect(background!.openOverlaySettings).not.toHaveBeenCalled();
  });
  it("records an explicit pending request but waits for overlay access", async () => {
    jest.mocked(background!.getStatus).mockReturnValue({ overlayAllowed: false } as BackgroundStatus);
    await enableOverlay("{}");
    expect(Storage.setItemSync).toHaveBeenCalledWith("al-manara:overlay-permission-pending:v1", "on");
    expect(background!.openOverlaySettings).toHaveBeenCalled();
    expect(background!.setOverlay).not.toHaveBeenCalled();
  });
  it("cancels the pending permission request when disabled", async () => {
    await disableOverlay();
    expect(Storage.removeItemSync).toHaveBeenCalledWith("al-manara:overlay-permission-pending:v1");
    expect(background!.setOverlay).toHaveBeenCalledWith(false, "{}");
  });
});
