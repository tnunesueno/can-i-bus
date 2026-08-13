import { ROUTE_CONCURRENCY } from "./constants";
import { routeCache, routeCacheKey } from "./cache";
import {
  haversineKm,
  isObviouslyUnreachable,
  kmToMiles,
} from "./distance";
import { placeProvider } from "./providers/places";
import { transitRouter } from "./providers/transit";
import type {
  Coordinates,
  Place,
  SearchResult,
  TransitRoute,
} from "./types";

export class TransitUnavailableError extends Error {
  constructor(message = "Transit service unavailable") {
    super(message);
    this.name = "TransitUnavailableError";
  }
}

export type RunSearchParams = {
  query: string;
  origin: Coordinates;
  maxMinutes: number;
  originLabel?: string;
};

export type SearchEventHandlers = {
  onCandidates: (places: Place[], originLabel?: string) => void;
  onResult: (result: SearchResult) => void;
};

async function mapPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      await fn(items[current]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
}

async function getCachedRoute(
  origin: Coordinates,
  destination: Coordinates,
  departureTime: Date,
): Promise<TransitRoute | null> {
  const key = routeCacheKey(origin, destination);
  const cached = routeCache.get(key);
  if (cached !== undefined) return cached;

  const route = await transitRouter.getRoute(origin, destination, departureTime);
  routeCache.set(key, route);
  return route;
}

export async function runSearch(
  params: RunSearchParams,
  handlers: SearchEventHandlers,
): Promise<{ candidateCount: number; reachableCount: number }> {
  const places = await placeProvider.searchPlaces(
    params.query,
    params.origin,
    params.maxMinutes,
  );

  if (places.length === 0) {
    return { candidateCount: 0, reachableCount: 0 };
  }

  handlers.onCandidates(places, params.originLabel);

  const candidates = places.filter(
    (place) =>
      !isObviouslyUnreachable(params.origin, place, params.maxMinutes),
  );

  const departureTime = new Date();
  let reachableCount = 0;
  let routingErrors = 0;

  await mapPool(candidates, ROUTE_CONCURRENCY, async (place) => {
    try {
      const route = await getCachedRoute(
        params.origin,
        { latitude: place.latitude, longitude: place.longitude },
        departureTime,
      );
      if (!route || route.durationMinutes > params.maxMinutes) return;
      reachableCount += 1;
      handlers.onResult({
        place,
        route,
        distanceMiles: kmToMiles(haversineKm(params.origin, place)),
      });
    } catch {
      routingErrors += 1;
    }
  });

  if (
    candidates.length > 0 &&
    reachableCount === 0 &&
    routingErrors === candidates.length
  ) {
    throw new TransitUnavailableError();
  }

  return { candidateCount: places.length, reachableCount };
}
