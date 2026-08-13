export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type Place = {
  id: string;
  name: string;
  category?: string;
  latitude: number;
  longitude: number;
  address?: string;
  rating?: number;
  imageUrl?: string;
  openNow?: boolean;
};

export type TransitMode =
  | "WALK"
  | "BUS"
  | "SUBWAY"
  | "TRAIN"
  | "TRAM"
  | "FERRY";

export type TransitLeg = {
  mode: TransitMode;
  durationMinutes: number;
  routeName?: string;
  departureStop?: string;
  arrivalStop?: string;
  departureTime?: string;
  arrivalTime?: string;
  /** Decoded path for this leg, when available. */
  path?: Coordinates[];
};

export type TransitRoute = {
  durationMinutes: number;
  walkingMinutes: number;
  transitMinutes: number;
  transfers: number;
  departureTime?: string;
  arrivalTime?: string;
  legs: TransitLeg[];
  /** Full journey path for map overlay. */
  overviewPath?: Coordinates[];
};

export type SearchResult = {
  place: Place;
  route: TransitRoute;
  distanceMiles: number;
};

export type SearchStreamEvent =
  | { type: "candidates"; places: Place[]; originLabel?: string }
  | { type: "result"; place: Place; route: TransitRoute; distanceMiles: number }
  | { type: "done" }
  | {
      type: "error";
      message: string;
      code:
        | "no_places"
        | "no_reachable"
        | "transit_unavailable"
        | "bad_request";
    };

export interface PlaceProvider {
  searchPlaces(
    query: string,
    location: Coordinates,
    maxMinutes?: number,
  ): Promise<Place[]>;
}

export interface TransitRouter {
  getRoute(
    origin: Coordinates,
    destination: Coordinates,
    departureTime: Date,
  ): Promise<TransitRoute | null>;
}
