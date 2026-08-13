import { CANDIDATE_LIMIT } from "../constants";
import { searchRadiusMeters } from "../distance";
import { getGoogleMapsApiKey } from "../env";
import { formatCategory } from "../format";
import type { Coordinates, Place, PlaceProvider } from "../types";

const GENERIC_TYPES = new Set([
  "point_of_interest",
  "establishment",
  "premise",
  "geocode",
  "political",
  "plus_code",
]);

type GooglePlacesResponse = {
  status: string;
  error_message?: string;
  results?: Array<{
    place_id: string;
    name: string;
    formatted_address?: string;
    vicinity?: string;
    rating?: number;
    types?: string[];
    opening_hours?: { open_now?: boolean };
    geometry?: { location?: { lat: number; lng: number } };
  }>;
};

function pickCategory(types?: string[]): string | undefined {
  const match = types?.find((type) => !GENERIC_TYPES.has(type));
  return match ? formatCategory(match) : undefined;
}

export class GooglePlacesProvider implements PlaceProvider {
  async searchPlaces(
    query: string,
    location: Coordinates,
    maxMinutes = 20,
  ): Promise<Place[]> {
    const key = getGoogleMapsApiKey();
    const params = new URLSearchParams({
      query,
      location: `${location.latitude},${location.longitude}`,
      radius: String(searchRadiusMeters(maxMinutes)),
      key,
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      throw new Error(`Places API HTTP ${response.status}`);
    }

    const data = (await response.json()) as GooglePlacesResponse;

    if (data.status === "ZERO_RESULTS") {
      return [];
    }

    if (data.status !== "OK") {
      throw new Error(data.error_message || `Places API ${data.status}`);
    }

    return (data.results ?? [])
      .filter((result) => result.geometry?.location)
      .slice(0, CANDIDATE_LIMIT)
      .map((result) => ({
        id: result.place_id,
        name: result.name,
        category: pickCategory(result.types),
        latitude: result.geometry!.location!.lat,
        longitude: result.geometry!.location!.lng,
        address: result.formatted_address ?? result.vicinity,
        rating: result.rating,
        openNow: result.opening_hours?.open_now,
      }));
  }
}

export const placeProvider = new GooglePlacesProvider();
