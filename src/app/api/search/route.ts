import { DEFAULT_MAX_MINUTES } from "@/lib/constants";
import {
  runSearch,
  TransitUnavailableError,
} from "@/lib/search";
import type { Coordinates, SearchStreamEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchBody = {
  query?: string;
  origin?: Coordinates;
  maxMinutes?: number;
  originLabel?: string;
};

function isCoordinates(value: unknown): value is Coordinates {
  if (!value || typeof value !== "object") return false;
  const coords = value as Coordinates;
  return (
    typeof coords.latitude === "number" &&
    typeof coords.longitude === "number" &&
    Number.isFinite(coords.latitude) &&
    Number.isFinite(coords.longitude)
  );
}

function encodeEvent(event: SearchStreamEvent): string {
  return `${JSON.stringify(event)}\n`;
}

export async function POST(request: Request) {
  let body: SearchBody;

  try {
    body = (await request.json()) as SearchBody;
  } catch {
    return Response.json(
      {
        type: "error",
        code: "bad_request",
        message: "Invalid request body.",
      },
      { status: 400 },
    );
  }

  const query = body.query?.trim();
  if (!query || !isCoordinates(body.origin)) {
    return Response.json(
      {
        type: "error",
        code: "bad_request",
        message: "A search query and origin are required.",
      },
      { status: 400 },
    );
  }

  const maxMinutes =
    typeof body.maxMinutes === "number" && body.maxMinutes > 0
      ? body.maxMinutes
      : DEFAULT_MAX_MINUTES;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: SearchStreamEvent) => {
        controller.enqueue(encoder.encode(encodeEvent(event)));
      };

      try {
        const { candidateCount, reachableCount } = await runSearch(
          {
            query,
            origin: body.origin!,
            maxMinutes,
            originLabel: body.originLabel,
          },
          {
            onCandidates: (places, originLabel) => {
              send({ type: "candidates", places, originLabel });
            },
            onResult: (result) => {
              send({
                type: "result",
                place: result.place,
                route: result.route,
                distanceMiles: result.distanceMiles,
              });
            },
          },
        );

        if (candidateCount === 0) {
          send({
            type: "error",
            code: "no_places",
            message: "No places found.\n\nTry a different search.",
          });
        } else if (reachableCount === 0) {
          send({
            type: "error",
            code: "no_reachable",
            message:
              "We couldn't find any places reachable by transit right now.\n\nTry searching for something else.",
          });
        }

        send({ type: "done" });
      } catch (error) {
        const unavailable =
          error instanceof TransitUnavailableError ||
          (error instanceof Error &&
            /GOOGLE_MAPS_API_KEY|Places API|Directions API/i.test(
              error.message,
            ));

        send({
          type: "error",
          code: unavailable ? "transit_unavailable" : "bad_request",
          message: unavailable
            ? "Transit times are unavailable right now. Please try again in a moment."
            : error instanceof Error
              ? error.message
              : "Search failed.",
        });
        send({ type: "done" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
