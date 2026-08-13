import type { Coordinates } from "./types";

export function googleMapsDirectionsUrl(
  origin: Coordinates,
  destination: Coordinates,
  travelMode: "transit" | "walking" = "transit",
): string {
  const params = new URLSearchParams({
    api: "1",
    origin: `${origin.latitude},${origin.longitude}`,
    destination: `${destination.latitude},${destination.longitude}`,
    travelmode: travelMode,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function appleMapsDirectionsUrl(
  origin: Coordinates,
  destination: Coordinates,
  travelMode: "transit" | "walking" = "transit",
): string {
  const params = new URLSearchParams({
    saddr: `${origin.latitude},${origin.longitude}`,
    daddr: `${destination.latitude},${destination.longitude}`,
    dirflg: travelMode === "walking" ? "w" : "r",
  });
  return `https://maps.apple.com/?${params.toString()}`;
}
