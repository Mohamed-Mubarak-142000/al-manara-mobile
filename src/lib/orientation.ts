import * as Device from "expo-device";
import * as ScreenOrientation from "expo-screen-orientation";

/**
 * Phones stay upright; tablets and foldables turn freely.
 * The manifest no longer pins portrait: Play flags that for large screens and Android 16 ignores it there anyway.
 */
export function lockPhonePortrait() {
  if (Device.deviceType !== Device.DeviceType.PHONE) return;
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
}
