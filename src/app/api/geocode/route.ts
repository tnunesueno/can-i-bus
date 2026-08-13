import { forwardGeocode, reverseGeocode } from "@/lib/providers/geocode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  try {
    if (query) {
      const result = await forwardGeocode(query);
      if (!result) {
        return Response.json(
          { error: "We couldn't find that location." },
          { status: 404 },
        );
      }
      return Response.json(result);
    }

    const latitude = lat ? Number(lat) : NaN;
    const longitude = lng ? Number(lng) : NaN;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return Response.json(
        { error: "Provide q or lat and lng." },
        { status: 400 },
      );
    }

    const label = await reverseGeocode({ latitude, longitude });
    return Response.json({
      coordinates: { latitude, longitude },
      label,
    });
  } catch (error) {
    const message =
      error instanceof Error && /GOOGLE_MAPS_API_KEY/i.test(error.message)
        ? "Location lookup is unavailable right now."
        : "Location lookup failed.";
    return Response.json({ error: message }, { status: 502 });
  }
}
