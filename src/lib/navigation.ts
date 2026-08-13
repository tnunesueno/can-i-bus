import type { Coordinates } from "./types";

export function googleMapsTransitUrl(
  origin: Coordinates,
  destination: Coordinates,
): string {
  const params = new URLSearchParams({
    api: "1",
    origin: `${origin.latitude},${origin.longitude}`,
    destination: `${destination.latitude},${destination.longitude}`,
    travelmode: "transit",
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function appleMapsTransitUrl(
  origin: Coordinates,
  destination: Coordinates,
): string {
  const params = new URLSearchParams({
    saddr: `${origin.latitude},${origin.longitude}`,
    daddr: `${destination.latitude},${destination.longitude}`,
    dirflg: "r",
  });
  return `https://maps.apple.com/?${params.toString()}`;
}
