"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Coordinates, Place, TransitRoute } from "@/lib/types";

type MappedResult = {
  place: Place;
  route: TransitRoute;
};

type MapCanvasProps = {
  origin: Coordinates;
  originLabel: string;
  results: MappedResult[];
  selectedId: string | null;
  active?: boolean;
  onSelect: (id: string) => void;
};

function timeIcon(minutes: number, selected: boolean) {
  return L.divIcon({
    className: "",
    html: `<div class="time-marker${selected ? " selected" : ""}">${minutes} min</div>`,
    iconSize: [72, 32],
    iconAnchor: [36, 32],
  });
}

const originIcon = L.divIcon({
  className: "",
  html: `<div class="origin-marker" title="Origin"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function toLatLngs(path: Coordinates[]): L.LatLngExpression[] {
  return path.map((point) => [point.latitude, point.longitude]);
}

function FitBounds({
  origin,
  results,
  selected,
  active,
}: {
  origin: Coordinates;
  results: MappedResult[];
  selected: MappedResult | undefined;
  active?: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    const routePoints =
      selected?.route.legs.flatMap((leg) => leg.path ?? []) ??
      selected?.route.overviewPath ??
      [];

    if (routePoints.length > 1) {
      map.fitBounds(L.latLngBounds(toLatLngs(routePoints)), {
        padding: [48, 48],
        maxZoom: 15,
      });
      return;
    }

    const points: L.LatLngExpression[] = [
      [origin.latitude, origin.longitude],
      ...results.map(
        (result) =>
          [result.place.latitude, result.place.longitude] as L.LatLngExpression,
      ),
    ];
    if (points.length === 1) {
      map.setView(points[0], 13);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 15 });
  }, [map, origin, results, selected]);

  useEffect(() => {
    const timeout = window.setTimeout(() => map.invalidateSize(), 150);
    return () => window.clearTimeout(timeout);
  }, [map, results.length, active, selected?.place.id]);

  return null;
}

function RouteOverlay({ route }: { route: TransitRoute }) {
  const segments = useMemo(() => {
    const fromLegs = route.legs
      .filter((leg) => (leg.path?.length ?? 0) > 1)
      .map((leg, index) => ({
        key: `${leg.mode}-${index}`,
        mode: leg.mode,
        positions: toLatLngs(leg.path!),
      }));

    if (fromLegs.length > 0) return fromLegs;

    if ((route.overviewPath?.length ?? 0) > 1) {
      return [
        {
          key: "overview",
          mode: "BUS" as const,
          positions: toLatLngs(route.overviewPath!),
        },
      ];
    }

    return [];
  }, [route]);

  return (
    <>
      {segments.map((segment) => {
        const isWalk = segment.mode === "WALK";
        return (
          <Polyline
            key={segment.key}
            positions={segment.positions}
            pathOptions={{
              color: isWalk ? "#57534e" : "#0f766e",
              weight: isWalk ? 4 : 5,
              opacity: isWalk ? 0.85 : 0.95,
              dashArray: isWalk ? "6 10" : undefined,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        );
      })}
    </>
  );
}

export default function MapCanvas({
  origin,
  originLabel,
  results,
  selectedId,
  active,
  onSelect,
}: MapCanvasProps) {
  const selected = results.find((result) => result.place.id === selectedId);

  return (
    <MapContainer
      center={[origin.latitude, origin.longitude]}
      zoom={13}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds
        origin={origin}
        results={results}
        selected={selected}
        active={active}
      />
      {selected ? <RouteOverlay route={selected.route} /> : null}
      <Marker
        position={[origin.latitude, origin.longitude]}
        icon={originIcon}
        title={originLabel}
      />
      {results.map((result) => (
        <Marker
          key={result.place.id}
          position={[result.place.latitude, result.place.longitude]}
          icon={timeIcon(
            result.route.durationMinutes,
            selectedId === result.place.id,
          )}
          eventHandlers={{
            click: () => onSelect(result.place.id),
          }}
          title={`${result.route.durationMinutes} min · ${result.place.name}`}
        />
      ))}
    </MapContainer>
  );
}
