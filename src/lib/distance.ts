import type { Coordinates } from "./types";

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function kmToMiles(km: number): number {
  return km * 0.621371;
}

export function searchRadiusMeters(maxMinutes: number): number {
  const meters = maxMinutes * 800;
  return Math.min(Math.max(meters, 3000), 50_000);
}

/** Distance-only performance filter. Never used for ranking. */
export function isObviouslyUnreachable(
  origin: Coordinates,
  destination: Coordinates,
  maxMinutes: number,
): boolean {
  const km = haversineKm(origin, destination);
  const optimisticKmPerMin = 50 / 60;
  const slack = 1.2;
  return km > optimisticKmPerMin * maxMinutes * slack;
}
