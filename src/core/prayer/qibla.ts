/** The Kaaba, Makkah. */
export const KAABA = { latitude: 21.422487, longitude: 39.826206 };

const rad = (degrees: number) => (degrees * Math.PI) / 180;
const deg = (radians: number) => (radians * 180) / Math.PI;

/** Great-circle initial bearing from a point to the Kaaba, in degrees clockwise from true north (0…360). */
export function qiblaBearing(latitude: number, longitude: number): number {
  const φ1 = rad(latitude);
  const φ2 = rad(KAABA.latitude);
  const Δλ = rad(KAABA.longitude - longitude);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

/** Distance to the Kaaba in kilometres (haversine). */
export function distanceToKaaba(latitude: number, longitude: number): number {
  const φ1 = rad(latitude);
  const φ2 = rad(KAABA.latitude);
  const a = Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(rad(KAABA.longitude - longitude) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
