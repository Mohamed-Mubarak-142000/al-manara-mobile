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

export function locationKey(location: UserLocation): string {
  return location.latitude !== undefined ? `${location.latitude},${location.longitude}` : `${location.city},${location.country}`;
}
