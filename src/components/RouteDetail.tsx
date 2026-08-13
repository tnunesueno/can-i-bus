"use client";

import {
  formatClock,
  transitModeEmoji,
  transitModeLabel,
} from "@/lib/format";
import { appleMapsTransitUrl, googleMapsTransitUrl } from "@/lib/navigation";
import type { Coordinates, Place, TransitRoute } from "@/lib/types";

type RouteDetailProps = {
  place: Place;
  route: TransitRoute;
  origin: Coordinates;
  originLabel: string;
  onClose: () => void;
};

export function RouteDetail({
  place,
  route,
  origin,
  originLabel,
  onClose,
}: RouteDetailProps) {
  const destination = {
    latitude: place.latitude,
    longitude: place.longitude,
  };

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="border-b border-line px-4 py-4">
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-medium text-accent hover:text-accent-dark"
        >
          Back to results
        </button>
        <h2 className="mt-3 text-2xl font-semibold">{place.name}</h2>
        <p className="mt-1 text-3xl font-semibold text-time tabular-nums">
          {route.durationMinutes} min
        </p>
        <p className="mt-2 text-sm text-stone-600">
          Leaves {formatClock(route.departureTime)}
          <br />
          Arrives {formatClock(route.arrivalTime)}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <ol className="space-y-5">
          {route.legs.map((leg, index) => {
            const from =
              leg.departureStop ||
              (index === 0 ? originLabel : undefined);
            const to =
              leg.arrivalStop ||
              (index === route.legs.length - 1 ? place.name : undefined);

            return (
              <li key={`${leg.mode}-${index}`} className="text-sm">
                <p className="font-semibold uppercase tracking-wide text-stone-800">
                  {transitModeEmoji(leg.mode)} {transitModeLabel(leg.mode)}
                  {leg.routeName ? ` ${leg.routeName}` : ""}
                </p>
                <p className="text-stone-500">{leg.durationMinutes} min</p>
                {from || to ? (
                  <p className="mt-2 text-stone-700">
                    {from}
                    {from && to ? (
                      <>
                        <br />
                        ↓
                        <br />
                      </>
                    ) : null}
                    {to}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
        <p className="mt-6 text-sm text-stone-500">
          {route.transfers} {route.transfers === 1 ? "transfer" : "transfers"}
          <br />
          {route.walkingMinutes} min walking
          <br />
          {route.transitMinutes} min transit
        </p>
      </div>

      <div className="space-y-2 border-t border-line p-4">
        <a
          href={googleMapsTransitUrl(origin, destination)}
          target="_blank"
          rel="noreferrer"
          className="block rounded-xl bg-stone-900 px-4 py-3 text-center text-sm font-medium text-white hover:bg-stone-800"
        >
          Navigate with Google Maps
        </a>
        <a
          href={appleMapsTransitUrl(origin, destination)}
          target="_blank"
          rel="noreferrer"
          className="block rounded-xl border border-line px-4 py-3 text-center text-sm font-medium text-stone-800 hover:bg-stone-50"
        >
          Navigate with Apple Maps
        </a>
      </div>
    </div>
  );
}
