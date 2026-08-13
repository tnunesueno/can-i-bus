"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_MAX_MINUTES, SEARCH_SUGGESTIONS } from "@/lib/constants";
import type { Coordinates } from "@/lib/types";

type Origin = {
  coordinates: Coordinates;
  label: string;
};

export function HomeSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [originInput, setOriginInput] = useState("");
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function resolveLabel(coordinates: Coordinates): Promise<string> {
    try {
      const response = await fetch(
        `/api/geocode?lat=${coordinates.latitude}&lng=${coordinates.longitude}`,
      );
      if (!response.ok) return "Your location";
      const data = (await response.json()) as { label?: string };
      return data.label || "Your location";
    } catch {
      return "Your location";
    }
  }

  async function requestCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationDenied(true);
      return;
    }

    setLocating(true);
    setLocationDenied(false);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        const label = await resolveLabel(coordinates);
        setOrigin({ coordinates, label });
        setOriginInput(label);
        setLocating(false);
      },
      () => {
        setLocationDenied(true);
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 },
    );
  }

  useEffect(() => {
    if (!navigator.geolocation) return;

    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (cancelled) return;
        const coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        const label = await resolveLabel(coordinates);
        if (cancelled) return;
        setOrigin({ coordinates, label });
        setOriginInput(label);
      },
      () => {
        if (cancelled) return;
        setLocationDenied(true);
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  async function resolveOrigin(): Promise<Origin | null> {
    const typed = originInput.trim();
    if (origin && typed && typed === origin.label) return origin;
    if (origin && !typed) return origin;
    if (!typed) return origin;

    const response = await fetch(`/api/geocode?q=${encodeURIComponent(typed)}`);
    if (!response.ok) return null;
    const data = (await response.json()) as Origin;
    if (!data.coordinates) return null;
    return data;
  }

  async function explore(searchQuery: string) {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setError("Enter something to search for.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const resolved = await resolveOrigin();
    if (!resolved) {
      setSubmitting(false);
      setError(
        originInput.trim()
          ? "We couldn't find that starting location."
          : "We couldn't access your location.\n\nEnter a starting location instead.",
      );
      return;
    }

    const params = new URLSearchParams({
      q: trimmed,
      lat: String(resolved.coordinates.latitude),
      lng: String(resolved.coordinates.longitude),
      origin: resolved.label,
      max: String(DEFAULT_MAX_MINUTES),
    });
    router.push(`/results?${params.toString()}`);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void explore(query);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-5 py-16 sm:py-24">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
        Transit-first
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
        Transit
      </h1>
      <p className="mt-4 text-center text-lg text-stone-700">
        Where do you want to go?
      </p>
      <p className="mt-1 text-center text-stone-500">
        Find places based on transit time.
      </p>

      <form onSubmit={onSubmit} className="mt-10 w-full space-y-8">
        <section>
          <p className="text-sm font-medium text-stone-600">From</p>
          <div className="mt-2 rounded-2xl border border-line bg-card p-4 shadow-sm">
            <p className="text-sm text-stone-500">
              {origin ? `📍 ${origin.label}` : "📍 Your location"}
            </p>
            <button
              type="button"
              onClick={() => void requestCurrentLocation()}
              className="mt-3 w-full rounded-xl bg-stone-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-stone-800"
            >
              {locating ? "Getting your location…" : "Use my current location"}
            </button>
            <label className="mt-3 block">
              <span className="sr-only">Starting location</span>
              <input
                value={originInput}
                onChange={(event) => {
                  setOriginInput(event.target.value);
                  setLocationDenied(false);
                }}
                placeholder="Or enter a starting location"
                className="mt-1 w-full rounded-xl border border-line bg-background px-3 py-3 text-sm outline-none ring-accent focus:ring-2"
              />
            </label>
            {locationDenied ? (
              <p className="mt-3 whitespace-pre-line text-sm text-red-700">
                We couldn&apos;t access your location.
                {"\n"}
                Enter a starting location instead.
              </p>
            ) : null}
          </div>
        </section>

        <section>
          <p className="text-sm font-medium text-stone-600">
            What are you looking for?
          </p>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Restaurants"
            className="mt-2 w-full rounded-2xl border border-line bg-card px-4 py-4 text-base shadow-sm outline-none ring-accent focus:ring-2"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {SEARCH_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion.query}
                type="button"
                onClick={() => {
                  setQuery(suggestion.query);
                  void explore(suggestion.query);
                }}
                className="rounded-full border border-line bg-card px-3 py-2 text-sm text-stone-700 transition hover:border-accent hover:text-accent"
              >
                {suggestion.emoji} {suggestion.label}
              </button>
            ))}
          </div>
        </section>

        {error ? (
          <p className="whitespace-pre-line text-sm text-red-700">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl bg-accent px-4 py-4 text-base font-semibold text-white transition hover:bg-accent-dark disabled:opacity-70"
        >
          {submitting ? "Searching…" : "Explore"}
        </button>
      </form>
    </div>
  );
}
