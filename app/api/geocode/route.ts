import { NextRequest, NextResponse } from "next/server";
import { findNearestMetroStation, FAMOUS_DESTINATIONS } from "@/lib/delhi-ncr-transit";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const latStr = searchParams.get("lat");
    const lngStr = searchParams.get("lng");

    if (!latStr || !lngStr) {
      return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    // 1. Calculate nearest metro station immediately
    const nearest = findNearestMetroStation(lat, lng);

    let resolvedLocationName = "";
    let fullFormattedAddress = "";

    const apiKey =
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    // 2. High-precision Google Reverse Geocoding
    if (apiKey) {
      try {
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
        );
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData.results && geoData.results.length > 0) {
            // Find the most detailed/pinpoint result (street_address, premise, subpremise, establishment)
            const pinpointResult =
              geoData.results.find((r: any) =>
                r.types.some((t: string) =>
                  ['street_address', 'premise', 'subpremise', 'point_of_interest', 'establishment'].includes(t)
                )
              ) || geoData.results[0];

            fullFormattedAddress = pinpointResult.formatted_address || geoData.results[0].formatted_address || "";

            const comps = pinpointResult.address_components || geoData.results[0].address_components || [];
            const getComp = (type: string) => comps.find((c: any) => c.types.includes(type))?.long_name;

            const premise = getComp("premise") || getComp("point_of_interest") || getComp("establishment");
            const streetNumber = getComp("street_number");
            const route = getComp("route");
            const sublocality3 = getComp("sublocality_level_3");
            const sublocality2 = getComp("sublocality_level_2");
            const sublocality1 = getComp("sublocality_level_1") || getComp("neighborhood");
            const locality = getComp("locality") || getComp("administrative_area_level_2");

            // Clean formatted address by removing postal codes and country
            const cleanFormatted = fullFormattedAddress
              .replace(/, India$/i, "")
              .replace(/, \d{6}$/i, "")
              .replace(/, (Haryana|Delhi|Uttar Pradesh|Punjab|Rajasthan|Maharashtra|Karnataka|Tamil Nadu) \d{6}$/i, "")
              .replace(/, (Haryana|Delhi|Uttar Pradesh|Punjab|Rajasthan|Maharashtra|Karnataka|Tamil Nadu)$/i, "")
              .trim();

            if (cleanFormatted && cleanFormatted.length > 5) {
              resolvedLocationName = cleanFormatted;
            } else {
              const street = [streetNumber, route].filter(Boolean).join(" ");
              const parts = [premise, street, sublocality3, sublocality2, sublocality1, locality].filter(Boolean);
              const uniqueParts = [...new Set(parts)];
              if (uniqueParts.length >= 2) {
                resolvedLocationName = uniqueParts.join(", ");
              } else {
                resolvedLocationName = cleanFormatted || fullFormattedAddress;
              }
            }
          }
        }
      } catch (err) {
        console.warn("Google Reverse Geocode error:", err);
      }
    }

    // 3. Fallback: check closest curated landmarks within 1.5km
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
