import type { TransitMode, TransitRoute } from "./types";

export function formatClock(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatMiles(miles: number): string {
  if (miles < 0.1) return "< 0.1 miles away";
  return `${miles.toFixed(1)} miles away`;
}

export function formatTransfers(count: number): string {
  if (count === 1) return "1 transfer";
  return `${count} transfers`;
}

export function formatCategory(type?: string): string {
  if (!type) return "";
  return type
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function transitModeLabel(mode: TransitMode): string {
  switch (mode) {
    case "WALK":
      return "Walk";
    case "BUS":
      return "Bus";
    case "SUBWAY":
      return "Subway";
    case "TRAIN":
      return "Train";
    case "TRAM":
      return "Tram";
    case "FERRY":
      return "Ferry";
  }
}

export function transitModeEmoji(mode: TransitMode): string {
  switch (mode) {
    case "WALK":
      return "🚶";
    case "BUS":
      return "🚌";
    case "SUBWAY":
      return "🚇";
    case "TRAIN":
      return "🚆";
    case "TRAM":
      return "🚊";
    case "FERRY":
      return "⛴️";
  }
}

export function primaryTransitMode(route: TransitRoute): TransitMode {
  return route.legs.find((leg) => leg.mode !== "WALK")?.mode ?? "WALK";
}

export function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
}
