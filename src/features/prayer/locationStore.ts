import * as Location from "expo-location";
import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";

import { CITY_CHOICES, locationFromTimezone, type UserLocation } from "@/core/prayer/location";

const STORAGE_KEY = "al-manara:location:v1";

let cached: UserLocation | null = null;
const listeners = new Set<() => void>();

function read(): UserLocation {
  if (cached) return cached;
  try {
    const raw = Storage.getItemSync(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as UserLocation;
      if (typeof parsed.label === "string" && typeof parsed.city === "string") {
        cached = parsed;
        return parsed;
      }
    }
  } catch {
    // Corrupt or unavailable storage: derive it again.
  }
  cached = locationFromTimezone();
  return cached;
}

function write(location: UserLocation) {
  cached = location;
  try {
    Storage.setItemSync(STORAGE_KEY, JSON.stringify(location));
  } catch {
    // Keep the in-memory value only.
  }
  listeners.forEach((notify) => notify());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The user's location for prayer times: their timezone's city until they pick a city or share their location. */
export function useUserLocation(): UserLocation {
  return useSyncExternalStore(subscribe, read);
}

export type GeolocateResult = "ok" | "denied" | "error";

/** Explicit, user-initiated: asks for permission, then remembers the coordinates on this device. */
export async function requestPreciseLocation(): Promise<GeolocateResult> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return "denied";
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const base = read();
    write({
      source: "geo",
      label: "موقعك الحالي",
      city: base.city,
      country: base.country,
      latitude: Number(position.coords.latitude.toFixed(4)),
      longitude: Number(position.coords.longitude.toFixed(4)),
    });
    return "ok";
  } catch {
    return "error";
  }
}

/** The current location outside React (settings sync). */
export function readUserLocation(): UserLocation {
  return read();
}

/** Restores a location saved on the account (another phone, or before a reinstall). */
export function restoreUserLocation(location: UserLocation) {
  if (typeof location?.label !== "string" || typeof location.city !== "string") return;
  write(location);
}

export function chooseCity(city: string) {
  const choice = CITY_CHOICES.find((entry) => entry.city === city);
  if (choice) write({ source: "timezone", ...choice });
}

export function resetToTimezoneLocation() {
  write(locationFromTimezone());
}
