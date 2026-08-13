"use client";

import {
  formatClock,
  formatMiles,
  formatTransfers,
  primaryTransitMode,
  transitModeEmoji,
} from "@/lib/format";
import type { Place, TransitRoute } from "@/lib/types";

type ResultCardProps = {
  place: Place;
  route?: TransitRoute;
  distanceMiles?: number;
  selected?: boolean;
  onSelect: () => void;
  onViewRoute: () => void;
};

export function ResultCard({
  place,
  route,
  distanceMiles,
  selected,
  onSelect,
  onViewRoute,
}: ResultCardProps) {
  const transitEmoji = route
    ? transitModeEmoji(primaryTransitMode(route))
    : "🚌";

  return (
    <article
      id={`place-${place.id}`}
      className={`rounded-2xl border bg-card p-4 shadow-sm transition ${
        selected ? "border-accent ring-2 ring-accent/30" : "border-line"
      }`}
    >
      <button type="button" onClick={onSelect} className="w-full text-left">
        {route ? (
          <p className="text-3xl font-semibold tracking-tight text-time tabular-nums">
            {route.durationMinutes}{" "}
            <span className="text-lg font-semibold uppercase">min</span>
          </p>
        ) : (
          <p className="text-sm font-semibold uppercase tracking-wide text-stone-400">
            Calculating…
          </p>
        )}
        <h2 className="mt-1 text-lg font-semibold text-stone-900">{place.name}</h2>
        {route ? (
          <div className="mt-2 space-y-1 text-sm text-stone-600">
            <p>
              Leaves {formatClock(route.departureTime)} · Arrives{" "}
              {formatClock(route.arrivalTime)}
            </p>
            <p>
              🚶 {route.walkingMinutes} min walking · {transitEmoji}{" "}
              {route.transitMinutes} min transit
            </p>
            <p>{formatTransfers(route.transfers)}</p>
          </div>
        ) : null}
        <p className="mt-3 text-sm text-stone-500">
          {place.rating != null ? `★ ${place.rating.toFixed(1)}` : null}
          {place.rating != null && place.category ? " · " : null}
          {place.category}
          {distanceMiles != null ? (
            <>
              {(place.rating != null || place.category) && (
                <span className="mx-1">·</span>
              )}
              {formatMiles(distanceMiles)}
            </>
          ) : null}
        </p>
      </button>
      {route ? (
        <button
          type="button"
          onClick={onViewRoute}
          className="mt-4 w-full rounded-xl border border-line px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
        >
          View Route
        </button>
      ) : null}
    </article>
  );
}
