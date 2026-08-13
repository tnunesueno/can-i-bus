import { COORD_PRECISION, ROUTE_CACHE_TTL_MS } from "./constants";
import type { Coordinates, TransitRoute } from "./types";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export function createTtlCache<T>(ttlMs: number) {
  const store = new Map<string, CacheEntry<T>>();

  return {
    get(key: string): T | undefined {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key: string, value: T) {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
  };
}

function roundCoord(value: number): string {
  return value.toFixed(COORD_PRECISION);
}

export function routeCacheKey(
  origin: Coordinates,
  destination: Coordinates,
): string {
  const bucket = Math.floor(Date.now() / ROUTE_CACHE_TTL_MS);
  return [
    roundCoord(origin.latitude),
    roundCoord(origin.longitude),
    roundCoord(destination.latitude),
    roundCoord(destination.longitude),
    bucket,
  ].join("|");
}

export const routeCache = createTtlCache<TransitRoute | null>(ROUTE_CACHE_TTL_MS);
