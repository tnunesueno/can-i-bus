export const DEFAULT_MAX_MINUTES = 20;
export const MAX_TIME_OPTIONS = [10, 15, 20, 30, 45, 60] as const;
export const CANDIDATE_LIMIT = 25;
export const ROUTE_CONCURRENCY = 5;
export const ROUTE_CACHE_TTL_MS = 3 * 60 * 1000;
export const COORD_PRECISION = 4;

export const SEARCH_SUGGESTIONS = [
  { label: "Restaurants", query: "Restaurants", emoji: "🍜" },
  { label: "Coffee", query: "Coffee", emoji: "☕" },
  { label: "Grocery", query: "Grocery stores", emoji: "🛒" },
  { label: "Parks", query: "Parks", emoji: "🌳" },
  { label: "Gyms", query: "Gyms", emoji: "🏋️" },
  { label: "Entertainment", query: "Entertainment", emoji: "🎬" },
  { label: "Shopping", query: "Shopping", emoji: "🛍️" },
] as const;
