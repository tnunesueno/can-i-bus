"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_MAX_MINUTES } from "@/lib/constants";
import type {
  Coordinates,
  Place,
  SearchResult,
  SearchStreamEvent,
} from "@/lib/types";
import { MapView } from "./MapView";
import { ResultCard } from "./ResultCard";
import { RouteDetail } from "./RouteDetail";
import { TimeFilter } from "./TimeFilter";

type MobileTab = "list" | "map";

type ResultsSearchProps = {
  query: string;
  origin: Coordinates;
  originLabel: string;
  maxMinutes: number;
};

export function ResultsClient() {
  const params = useSearchParams();
  const query = params.get("q")?.trim() ?? "";
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const originLabel = params.get("origin") || "Your location";
  const maxMinutes = Number(params.get("max")) || DEFAULT_MAX_MINUTES;

  const origin: Coordinates | null =
    Number.isFinite(lat) && Number.isFinite(lng)
      ? { latitude: lat, longitude: lng }
      : null;

  if (!query || !origin) {
    return (
      <main className="flex min-h-full items-center justify-center p-6">
        <p className="text-stone-600">
          Missing search details.{" "}
          <Link href="/" className="font-medium text-accent">
            Start over
          </Link>
        </p>
      </main>
    );
  }

  return (
    <ResultsSearch
      key={`${query}|${origin.latitude}|${origin.longitude}|${maxMinutes}`}
      query={query}
      origin={origin}
      originLabel={originLabel}
      maxMinutes={maxMinutes}
    />
  );
}

function ResultsSearch({
  query,
  origin,
  originLabel,
  maxMinutes,
}: ResultsSearchProps) {
  const router = useRouter();
  const params = useSearchParams();
  const originLat = origin.latitude;
  const originLng = origin.longitude;
  const [candidates, setCandidates] = useState<Place[]>([]);
  const [resultsById, setResultsById] = useState<Record<string, SearchResult>>(
    {},
  );
  const [phase, setPhase] = useState<"finding" | "routing" | "done">("finding");
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [routeId, setRouteId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("list");

  useEffect(() => {
    const controller = new AbortController();

    async function run() {
      try {
        const response = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            query,
            origin: { latitude: originLat, longitude: originLng },
            maxMinutes,
            originLabel,
          }),
        });

        if (!response.ok || !response.body) {
          setError(
            "Transit times are unavailable right now. Please try again in a moment.",
          );
          setPhase("done");
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as SearchStreamEvent;
            if (event.type === "candidates") {
              setCandidates(event.places);
              setPhase("routing");
            } else if (event.type === "result") {
              setResultsById((current) => ({
                ...current,
                [event.place.id]: {
                  place: event.place,
                  route: event.route,
                  distanceMiles: event.distanceMiles,
                },
              }));
            } else if (event.type === "error") {
              setError(event.message);
            } else if (event.type === "done") {
              setPhase("done");
            }
          }
        }
        setPhase("done");
      } catch {
        if (controller.signal.aborted) return;
        setError(
          "Transit times are unavailable right now. Please try again in a moment.",
        );
        setPhase("done");
      }
    }

    void run();
    return () => controller.abort();
  }, [query, originLat, originLng, maxMinutes, originLabel]);

  const rankedResults = useMemo(() => {
    return Object.values(resultsById).sort(
      (a, b) => a.route.durationMinutes - b.route.durationMinutes,
    );
  }, [resultsById]);

  const pendingPlaces = useMemo(() => {
    if (phase === "done") return [];
    return candidates.filter((place) => !resultsById[place.id]);
  }, [candidates, resultsById, phase]);

  const selectedRoute = routeId ? resultsById[routeId] : undefined;

  function setMaxMinutes(next: number) {
    const nextParams = new URLSearchParams(params.toString());
    nextParams.set("max", String(next));
    router.replace(`/results?${nextParams.toString()}`);
  }

  function selectPlace(id: string) {
    setSelectedId(id);
  }

  useEffect(() => {
    if (!selectedId) return;
    document
      .getElementById(`place-${selectedId}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  const statusText =
    phase === "finding"
      ? `Finding ${query.toLowerCase()}...`
      : phase === "routing"
        ? `${candidates.length} places found.\nCalculating transit times...`
        : rankedResults.length > 0
          ? `${rankedResults.length} places found`
          : null;

  const listContent = selectedRoute ? (
    <RouteDetail
      place={selectedRoute.place}
      route={selectedRoute.route}
      origin={origin}
      originLabel={originLabel}
      onClose={() => setRouteId(null)}
    />
  ) : (
    <div className="flex h-full flex-col">
      <header className="border-b border-line px-4 py-4">
        <Link href="/" className="text-sm font-medium text-accent">
          New search
        </Link>
        <h1 className="mt-2 text-2xl font-semibold capitalize">{query}</h1>
        <p className="text-sm text-stone-600">Near {originLabel}</p>
        <p className="text-sm text-stone-500">Sorted by fastest transit time</p>
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-stone-500">
            Maximum travel time
          </p>
          <TimeFilter value={maxMinutes} onChange={setMaxMinutes} />
        </div>
        {statusText ? (
          <p className="mt-3 whitespace-pre-line text-sm text-stone-500">
            {statusText}
          </p>
        ) : null}
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {error && rankedResults.length === 0 ? (
          <p className="whitespace-pre-line text-stone-700">{error}</p>
        ) : (
          <div className="space-y-3">
            {rankedResults.map((result) => (
              <ResultCard
                key={result.place.id}
                place={result.place}
                route={result.route}
                distanceMiles={result.distanceMiles}
                selected={selectedId === result.place.id}
                onSelect={() => selectPlace(result.place.id)}
                onViewRoute={() => {
                  selectPlace(result.place.id);
                  setRouteId(result.place.id);
                }}
              />
            ))}
            {pendingPlaces.map((place) => (
              <ResultCard
                key={place.id}
                place={place}
                selected={selectedId === place.id}
                onSelect={() => selectPlace(place.id)}
                onViewRoute={() => undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <main className="flex h-dvh flex-col md:flex-row">
      <div className="flex items-center gap-2 border-b border-line bg-card px-4 py-2 md:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("list")}
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            mobileTab === "list" ? "bg-stone-900 text-white" : "text-stone-600"
          }`}
        >
          List
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("map")}
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            mobileTab === "map" ? "bg-stone-900 text-white" : "text-stone-600"
          }`}
        >
          Map
        </button>
      </div>

      <section
        className={`${
          mobileTab === "list" ? "flex" : "max-md:hidden"
        } min-h-0 w-full flex-1 flex-col border-r border-line bg-background md:h-full md:w-[42%] md:flex-none`}
      >
        {listContent}
      </section>

      <section
        className={`${
          mobileTab === "map" ? "block" : "max-md:hidden"
        } relative min-h-0 flex-1`}
      >
        <MapView
          origin={origin}
          originLabel={originLabel}
          results={rankedResults}
          selectedId={selectedId}
          active={mobileTab === "map"}
          onSelect={(id) => {
            selectPlace(id);
            setMobileTab("list");
          }}
        />
      </section>
    </main>
  );
}
