import { NextRequest, NextResponse } from "next/server";
import { findNearestMetroStation, FAMOUS_DESTINATIONS } from "@/lib/delhi-ncr-transit";

const NCR_BOUNDS_PARAM = "28.18,76.75|28.92,77.65";

function getGoogleApiKey(): string | undefined {
  const raw =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  return raw ? raw.trim().replace(/^['"]|['"]$/g, "") : undefined;
}

function cleanFormattedAddress(fullFormattedAddress: string, comps: any[] = []): string {
  const getComp = (type: string) => comps.find((c: any) => c.types?.includes(type))?.long_name;

  const cleanFormatted = fullFormattedAddress
    .replace(/, India$/i, "")
    .replace(/, \d{6}$/i, "")
    .replace(/, (Haryana|Delhi|Uttar Pradesh|Punjab|Rajasthan|Maharashtra|Karnataka|Tamil Nadu) \d{6}$/i, "")
    .replace(/, (Haryana|Delhi|Uttar Pradesh|Punjab|Rajasthan|Maharashtra|Karnataka|Tamil Nadu)$/i, "")
    .trim();

  if (cleanFormatted && cleanFormatted.length > 5) {
    return cleanFormatted;
  }

  const premise = getComp("premise") || getComp("point_of_interest") || getComp("establishment");
  const street = [getComp("street_number"), getComp("route")].filter(Boolean).join(" ");
  const sublocality3 = getComp("sublocality_level_3");
  const sublocality2 = getComp("sublocality_level_2");
  const sublocality1 = getComp("sublocality_level_1") || getComp("neighborhood");
  const locality = getComp("locality") || getComp("administrative_area_level_2");

  const parts = [premise, street, sublocality3, sublocality2, sublocality1, locality].filter(Boolean);
  const uniqueParts = [...new Set(parts)];
  return uniqueParts.length >= 2 ? uniqueParts.join(", ") : cleanFormatted || fullFormattedAddress;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const latStr = searchParams.get("lat");
    const lngStr = searchParams.get("lng");
    const addressQuery = searchParams.get("address")?.trim();
    const apiKey = getGoogleApiKey();

    // Forward Geocoding mode: ?address=... (for direct address / sector / Enter-key submission across Delhi, Gurgaon, Noida)
    if (addressQuery) {
      if (!apiKey) {
        return NextResponse.json({ error: "Google Maps API key missing" }, { status: 500 });
      }
      const hasNcrCity = /delhi|gurgaon|gurugram|noida|faridabad|ghaziabad|manesar/i.test(addressQuery);
      const q = hasNcrCity ? addressQuery : `${addressQuery}, Delhi NCR, India`;
      const geoRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&bounds=${NCR_BOUNDS_PARAM}&region=in&components=country:in&key=${apiKey}`
      );
      if (!geoRes.ok) {
        return NextResponse.json({ error: "Geocoding request failed" }, { status: 502 });
      }
      const geoData = await geoRes.json();
      const first = geoData.results?.[0];
      const loc = first?.geometry?.location;
      if (!first || typeof loc?.lat !== "number" || typeof loc?.lng !== "number") {
        return NextResponse.json({ error: "Location not found in Delhi, Gurgaon, or Noida" }, { status: 404 });
      }

      const nearest = findNearestMetroStation(loc.lat, loc.lng);
      const cleanName = cleanFormattedAddress(first.formatted_address || addressQuery, first.address_components || []);
      return NextResponse.json({
        locationName: cleanName,
        fullAddress: first.formatted_address || cleanName,
        nearestStation: nearest.station.name,
        stationLine: nearest.station.line,
        stationLineColor: nearest.station.lineColor,
        distanceKm: nearest.distanceKm,
        lat: loc.lat,
        lng: loc.lng
      });
    }

    // Reverse Geocoding mode: ?lat=...&lng=...
    if (!latStr || !lngStr) {
      return NextResponse.json({ error: "Missing coordinates or address" }, { status: 400 });
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    const nearest = findNearestMetroStation(lat, lng);
    let resolvedLocationName = "";
    let fullFormattedAddress = "";

    if (apiKey) {
      try {
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
        );
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData.results && geoData.results.length > 0) {
            const pinpointResult =
              geoData.results.find((r: any) =>
                r.types.some((t: string) =>
                  ["street_address", "premise", "subpremise", "point_of_interest", "establishment"].includes(t)
                )
              ) || geoData.results[0];

            fullFormattedAddress = pinpointResult.formatted_address || geoData.results[0].formatted_address || "";
            resolvedLocationName = cleanFormattedAddress(
              fullFormattedAddress,
              pinpointResult.address_components || geoData.results[0].address_components || []
            );
          }
        }
      } catch (err) {
        console.warn("Google Reverse Geocode error:", err);
      }
    }

    if (!resolvedLocationName) {
      let closestDestination = null;
      let minDestDist = Infinity;
      for (const dest of FAMOUS_DESTINATIONS) {
        const d = Math.sqrt(Math.pow(dest.lat - lat, 2) + Math.pow(dest.lng - lng, 2)) * 111;
        if (d < minDestDist) {
          minDestDist = d;
          closestDestination = dest;
        }
      }

      if (closestDestination && minDestDist < 1.5) {
        resolvedLocationName = `${closestDestination.name}, ${closestDestination.city}`;
      } else {
        resolvedLocationName = `Near ${nearest.station.name} (${nearest.station.line})`;
      }
    }

    return NextResponse.json({
      locationName: resolvedLocationName,
      fullAddress: fullFormattedAddress || resolvedLocationName,
      nearestStation: nearest.station.name,
      stationLine: nearest.station.line,
      stationLineColor: nearest.station.lineColor,
      distanceKm: nearest.distanceKm,
      lat,
      lng
    });
  } catch (error: any) {
    console.error("Geocode route error:", error);
    return NextResponse.json({ error: "Internal geocoding error" }, { status: 500 });
  }
}
