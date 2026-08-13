"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
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

function FitToResults({
  origin,
  results,
  active,
}: {
  origin: Coordinates;
  results: MappedResult[];
  active?: boolean;
}) {
  const map = useMap();

  useEffect(() => {
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
  }, [map, origin, results]);

  useEffect(() => {
    const timeout = window.setTimeout(() => map.invalidateSize(), 150);
    return () => window.clearTimeout(timeout);
  }, [map, results.length, active]);

  return null;
}

export default function MapCanvas({
  origin,
  originLabel,
  results,
  selectedId,
  active,
  onSelect,
}: MapCanvasProps) {
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
      <FitToResults origin={origin} results={results} active={active} />
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
