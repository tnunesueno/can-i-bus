"use client";

import dynamic from "next/dynamic";
import type { Coordinates, Place, TransitRoute } from "@/lib/types";

const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-stone-200" />,
});

type MapViewProps = {
  origin: Coordinates;
  originLabel: string;
  results: Array<{ place: Place; route: TransitRoute }>;
  selectedId: string | null;
  active?: boolean;
  onSelect: (id: string) => void;
};

export function MapView(props: MapViewProps) {
  return <MapCanvas {...props} />;
}
