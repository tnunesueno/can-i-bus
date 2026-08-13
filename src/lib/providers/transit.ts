import { getGoogleMapsApiKey } from "../env";
import { decodePolyline } from "../polyline";
import type {
  Coordinates,
  TransitLeg,
  TransitMode,
  TransitRoute,
  TransitRouter,
} from "../types";

type GoogleLatLng = { lat: number; lng: number };

type GoogleTransitLine = {
  short_name?: string;
  name?: string;
  vehicle?: { type?: string; name?: string };
};

type GoogleStep = {
  travel_mode?: string;
  duration?: { value?: number };
  html_instructions?: string;
  start_location?: GoogleLatLng;
  end_location?: GoogleLatLng;
  polyline?: { points?: string };
  transit_details?: {
    line?: GoogleTransitLine;
    departure_stop?: { name?: string };
    arrival_stop?: { name?: string };
    departure_time?: { value?: number; text?: string };
    arrival_time?: { value?: number; text?: string };
  };
};

type GoogleLeg = {
  duration?: { value?: number };
  departure_time?: { value?: number };
  arrival_time?: { value?: number };
  start_address?: string;
  end_address?: string;
  steps?: GoogleStep[];
};

type GoogleDirectionsResponse = {
  status: string;
  error_message?: string;
  routes?: Array<{
    legs?: GoogleLeg[];
    overview_polyline?: { points?: string };
  }>;
};

const FATAL_STATUSES = new Set([
  "REQUEST_DENIED",
  "OVER_QUERY_LIMIT",
  "UNKNOWN_ERROR",
  "INVALID_REQUEST",
]);

function toIso(unixSeconds?: number): string | undefined {
  if (!unixSeconds) return undefined;
  return new Date(unixSeconds * 1000).toISOString();
}

function minutesFromSeconds(seconds?: number): number {
  if (seconds == null || seconds < 0) return 0;
  return Math.round(seconds / 60);
}

function mapVehicleType(type?: string): TransitMode {
  switch (type) {
    case "SUBWAY":
    case "METRO_RAIL":
      return "SUBWAY";
    case "TRAIN":
    case "HEAVY_RAIL":
    case "COMMUTER_TRAIN":
    case "HIGH_SPEED_TRAIN":
    case "LONG_DISTANCE_TRAIN":
      return "TRAIN";
    case "TRAM":
    case "LIGHT_RAIL":
    case "RAIL":
    case "MONORAIL":
    case "CABLE_CAR":
    case "FUNICULAR":
    case "GONDOLA_LIFT":
      return "TRAM";
    case "FERRY":
      return "FERRY";
    default:
      return "BUS";
  }
}

function enrichWalkingStops(legs: TransitLeg[]): TransitLeg[] {
  return legs.map((leg, index) => {
    if (leg.mode !== "WALK") return leg;

    const previous = legs[index - 1];
    const next = legs[index + 1];

    return {
      ...leg,
      departureStop: leg.departureStop ?? previous?.arrivalStop,
      arrivalStop: leg.arrivalStop ?? next?.departureStop,
    };
  });
}

function stepPath(step: GoogleStep): Coordinates[] | undefined {
  if (!step.polyline?.points) return undefined;
  const path = decodePolyline(step.polyline.points);
  return path.length > 0 ? path : undefined;
}

function mapRoute(
  leg: GoogleLeg,
  overviewEncoded?: string,
): TransitRoute | null {
  if (!leg.duration?.value || !leg.steps?.length) return null;

  const mapped: TransitLeg[] = [];
  let walkingMinutes = 0;
  let transitMinutes = 0;
  let transitVehicles = 0;

  for (const step of leg.steps) {
    const durationMinutes = minutesFromSeconds(step.duration?.value);
    const path = stepPath(step);

    if (step.travel_mode === "WALKING") {
      walkingMinutes += durationMinutes;
      mapped.push({
        mode: "WALK",
        durationMinutes,
        path,
      });
      continue;
    }

    if (step.travel_mode !== "TRANSIT") continue;

    transitVehicles += 1;
    transitMinutes += durationMinutes;
    const details = step.transit_details;
    mapped.push({
      mode: mapVehicleType(details?.line?.vehicle?.type),
      durationMinutes,
      routeName:
        details?.line?.short_name ||
        details?.line?.name ||
        details?.line?.vehicle?.name,
      departureStop: details?.departure_stop?.name,
      arrivalStop: details?.arrival_stop?.name,
      departureTime: toIso(details?.departure_time?.value),
      arrivalTime: toIso(details?.arrival_time?.value),
      path,
    });
  }

  const overviewPath = overviewEncoded
    ? decodePolyline(overviewEncoded)
    : mapped.flatMap((item) => item.path ?? []);

  return {
    durationMinutes: minutesFromSeconds(leg.duration.value),
    walkingMinutes,
    transitMinutes,
    transfers: Math.max(0, transitVehicles - 1),
    departureTime: toIso(leg.departure_time?.value),
    arrivalTime: toIso(leg.arrival_time?.value),
    legs: enrichWalkingStops(mapped),
    overviewPath: overviewPath.length > 0 ? overviewPath : undefined,
  };
}

export class GoogleTransitRouter implements TransitRouter {
  async getRoute(
    origin: Coordinates,
    destination: Coordinates,
    departureTime: Date,
  ): Promise<TransitRoute | null> {
    const key = getGoogleMapsApiKey();
    const departureUnix = Math.floor(departureTime.getTime() / 1000);
    const params = new URLSearchParams({
      origin: `${origin.latitude},${origin.longitude}`,
      destination: `${destination.latitude},${destination.longitude}`,
      mode: "transit",
      departure_time: String(departureUnix),
      key,
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?${params}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      throw new Error(`Directions API HTTP ${response.status}`);
    }

    const data = (await response.json()) as GoogleDirectionsResponse;

    if (data.status === "ZERO_RESULTS" || data.status === "NOT_FOUND") {
      return null;
    }

    if (FATAL_STATUSES.has(data.status) || data.status !== "OK") {
      throw new Error(data.error_message || `Directions API ${data.status}`);
    }

    const googleRoute = data.routes?.[0];
    const googleLeg = googleRoute?.legs?.[0];
    if (!googleLeg) return null;

    const route = mapRoute(googleLeg, googleRoute?.overview_polyline?.points);
    if (!route) return null;

    if (!route.departureTime) {
      route.departureTime = departureTime.toISOString();
    }
    if (!route.arrivalTime) {
      route.arrivalTime = new Date(
        departureTime.getTime() + route.durationMinutes * 60_000,
      ).toISOString();
    }

    return route;
  }
}

export const transitRouter = new GoogleTransitRouter();
