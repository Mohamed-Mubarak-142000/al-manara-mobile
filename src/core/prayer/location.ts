// Ported from eslam-platform/src/features/prayer/location.ts — the pure part only.
// Persistence and the location store live in src/features/prayer/locationStore.ts.

export interface UserLocation {
  source: "timezone" | "geo";
  label: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

// Timezone → nearest major city, so prayer times work before (or without) location permission.
const TIMEZONE_CITIES: Record<string, Omit<UserLocation, "source">> = {
  "Africa/Cairo": { label: "القاهرة", city: "Cairo", country: "Egypt" },
  "Asia/Riyadh": { label: "الرياض", city: "Riyadh", country: "Saudi Arabia" },
  "Asia/Dubai": { label: "دبي", city: "Dubai", country: "United Arab Emirates" },
  "Asia/Kuwait": { label: "الكويت", city: "Kuwait City", country: "Kuwait" },
  "Asia/Qatar": { label: "الدوحة", city: "Doha", country: "Qatar" },
  "Asia/Bahrain": { label: "المنامة", city: "Manama", country: "Bahrain" },
  "Asia/Muscat": { label: "مسقط", city: "Muscat", country: "Oman" },
  "Asia/Amman": { label: "عمّان", city: "Amman", country: "Jordan" },
  "Asia/Baghdad": { label: "بغداد", city: "Baghdad", country: "Iraq" },
  "Asia/Beirut": { label: "بيروت", city: "Beirut", country: "Lebanon" },
  "Asia/Damascus": { label: "دمشق", city: "Damascus", country: "Syria" },
  "Asia/Gaza": { label: "غزة", city: "Gaza", country: "Palestine" },
  "Asia/Hebron": { label: "الخليل", city: "Hebron", country: "Palestine" },
  "Asia/Aden": { label: "عدن", city: "Aden", country: "Yemen" },
  "Africa/Khartoum": { label: "الخرطوم", city: "Khartoum", country: "Sudan" },
  "Africa/Tripoli": { label: "طرابلس", city: "Tripoli", country: "Libya" },
  "Africa/Tunis": { label: "تونس", city: "Tunis", country: "Tunisia" },
  "Africa/Algiers": { label: "الجزائر", city: "Algiers", country: "Algeria" },
  "Africa/Casablanca": { label: "الدار البيضاء", city: "Casablanca", country: "Morocco" },
  "Africa/Nouakchott": { label: "نواكشوط", city: "Nouakchott", country: "Mauritania" },
  "Europe/Istanbul": { label: "إسطنبول", city: "Istanbul", country: "Turkey" },
  "Europe/London": { label: "لندن", city: "London", country: "United Kingdom" },
  "Europe/Paris": { label: "باريس", city: "Paris", country: "France" },
  "Europe/Berlin": { label: "برلين", city: "Berlin", country: "Germany" },
  "America/New_York": { label: "نيويورك", city: "New York", country: "United States" },
};

const FALLBACK = TIMEZONE_CITIES["Africa/Cairo"]!;

export function locationFromTimezone(): UserLocation {
  let zone = "";
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    // No Intl timezone data: fall back to Cairo.
  }
  return { source: "timezone", ...(TIMEZONE_CITIES[zone] ?? FALLBACK) };
}

export const CITY_CHOICES: readonly Omit<UserLocation, "source">[] = Object.values(TIMEZONE_CITIES);

// App-only: city centres, so prayer times can be calculated on the device (offline) for a chosen city.
const CITY_COORDINATES: Record<string, readonly [latitude: number, longitude: number]> = {
  Cairo: [30.0444, 31.2357],
  Riyadh: [24.7136, 46.6753],
  Dubai: [25.2048, 55.2708],
  "Kuwait City": [29.3759, 47.9774],
  Doha: [25.2854, 51.531],
  Manama: [26.2285, 50.586],
  Muscat: [23.588, 58.3829],
  Amman: [31.9454, 35.9284],
  Baghdad: [33.3152, 44.3661],
  Beirut: [33.8938, 35.5018],
  Damascus: [33.5138, 36.2765],
  Gaza: [31.5017, 34.4668],
  Hebron: [31.5326, 35.0998],
  Aden: [12.7855, 45.0187],
  Khartoum: [15.5007, 32.5599],
  Tripoli: [32.8872, 13.1913],
  Tunis: [36.8065, 10.1815],
  Algiers: [36.7538, 3.0588],
  Casablanca: [33.5731, -7.5898],
  Nouakchott: [18.0735, -15.9582],
  Istanbul: [41.0082, 28.9784],
  London: [51.5074, -0.1278],
  Paris: [48.8566, 2.3522],
  Berlin: [52.52, 13.405],
  "New York": [40.7128, -74.006],
};

function deviceTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

export interface ResolvedPlace {
  latitude: number;
  longitude: number;
  /** IANA zone the prayer clock times are written in. */
  timezone: string;
}

/**
 * Coordinates and timezone for an on-device calculation: the shared GPS position in the phone's zone,
 * or a known city's centre in that city's zone. Null when the city isn't one we know.
 */
export function resolvePlace(location: UserLocation): ResolvedPlace | null {
  const cityZone = Object.entries(TIMEZONE_CITIES).find(([, entry]) => entry.city === location.city)?.[0] ?? null;
  if (location.latitude !== undefined && location.longitude !== undefined) {
    const timezone = deviceTimezone() ?? cityZone;
    return timezone ? { latitude: location.latitude, longitude: location.longitude, timezone } : null;
  }
  const coordinates = CITY_COORDINATES[location.city];
  if (!coordinates || !cityZone) return null;
  return { latitude: coordinates[0], longitude: coordinates[1], timezone: cityZone };
}

export function locationKey(location: UserLocation): string {
  return location.latitude !== undefined ? `${location.latitude},${location.longitude}` : `${location.city},${location.country}`;
}
