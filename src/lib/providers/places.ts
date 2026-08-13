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

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.types",
  "places.primaryType",
  "places.primaryTypeDisplayName",
  "places.currentOpeningHours",
].join(",");

type PlacesNewPlace = {
  id?: string;
  name?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  types?: string[];
  primaryType?: string;
  primaryTypeDisplayName?: { text?: string };
  currentOpeningHours?: { openNow?: boolean };
};

type PlacesNewResponse = {
  places?: PlacesNewPlace[];
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

function pickCategory(place: PlacesNewPlace): string | undefined {
  if (place.primaryTypeDisplayName?.text) {
    return place.primaryTypeDisplayName.text;
  }
  if (place.primaryType && !GENERIC_TYPES.has(place.primaryType)) {
    return formatCategory(place.primaryType);
  }
  const match = place.types?.find((type) => !GENERIC_TYPES.has(type));
  return match ? formatCategory(match) : undefined;
}

function placeId(place: PlacesNewPlace): string | undefined {
  if (place.id) return place.id;
  if (place.name?.startsWith("places/")) {
    return place.name.slice("places/".length);
  }
  return place.name;
}

export class GooglePlacesProvider implements PlaceProvider {
  async searchPlaces(
    query: string,
    location: Coordinates,
    maxMinutes = 20,
  ): Promise<Place[]> {
    const key = getGoogleMapsApiKey();
    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify({
          textQuery: query,
          pageSize: CANDIDATE_LIMIT,
          locationBias: {
            circle: {
              center: {
                latitude: location.latitude,
                longitude: location.longitude,
              },
              radius: searchRadiusMeters(maxMinutes),
            },
          },
        }),
      },
    );

    const data = (await response.json()) as PlacesNewResponse;

    if (!response.ok || data.error) {
      throw new Error(
        data.error?.message || `Places API HTTP ${response.status}`,
      );
    }

    return (data.places ?? [])
      .filter(
        (place) =>
          place.location?.latitude != null &&
          place.location?.longitude != null &&
          placeId(place) &&
          place.displayName?.text,
      )
      .slice(0, CANDIDATE_LIMIT)
      .map((place) => ({
        id: placeId(place)!,
        name: place.displayName!.text!,
        category: pickCategory(place),
        latitude: place.location!.latitude!,
        longitude: place.location!.longitude!,
        address: place.formattedAddress,
        rating: place.rating,
        openNow: place.currentOpeningHours?.openNow,
      }));
  }
}

export const placeProvider = new GooglePlacesProvider();
