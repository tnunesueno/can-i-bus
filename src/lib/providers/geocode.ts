import { getGoogleMapsApiKey } from "../env";
import type { Coordinates } from "../types";

type AddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type GoogleGeocodeResult = {
  formatted_address?: string;
  address_components?: AddressComponent[];
  geometry?: { location?: { lat: number; lng: number } };
  types?: string[];
};

type GoogleGeocodeResponse = {
  status: string;
  error_message?: string;
  results?: GoogleGeocodeResult[];
};

const LABEL_TYPES = [
  "establishment",
  "point_of_interest",
  "university",
  "neighborhood",
  "sublocality",
  "locality",
];

function shortLabel(result: GoogleGeocodeResult): string {
  const components = result.address_components ?? [];
  for (const type of LABEL_TYPES) {
    const match = components.find((component) => component.types.includes(type));
    if (match) return match.long_name;
  }
  return result.formatted_address?.split(",")[0] ?? "Your location";
}

async function geocodeRequest(
  params: URLSearchParams,
): Promise<GoogleGeocodeResponse> {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error(`Geocoding API HTTP ${response.status}`);
  }
  return (await response.json()) as GoogleGeocodeResponse;
}

export async function reverseGeocode(
  location: Coordinates,
): Promise<string> {
  const params = new URLSearchParams({
    latlng: `${location.latitude},${location.longitude}`,
    key: getGoogleMapsApiKey(),
  });
  const data = await geocodeRequest(params);
  if (data.status === "ZERO_RESULTS" || !data.results?.[0]) {
    return "Your location";
  }
  if (data.status !== "OK") {
    throw new Error(data.error_message || `Geocoding API ${data.status}`);
  }
  return shortLabel(data.results[0]);
}

export async function forwardGeocode(
  query: string,
): Promise<{ coordinates: Coordinates; label: string } | null> {
  const params = new URLSearchParams({
    address: query,
    key: getGoogleMapsApiKey(),
  });
  const data = await geocodeRequest(params);
  if (data.status === "ZERO_RESULTS" || !data.results?.[0]?.geometry?.location) {
    return null;
  }
  if (data.status !== "OK") {
    throw new Error(data.error_message || `Geocoding API ${data.status}`);
  }

  const result = data.results[0];
  return {
    coordinates: {
      latitude: result.geometry!.location!.lat,
      longitude: result.geometry!.location!.lng,
    },
    label: shortLabel(result),
  };
}
