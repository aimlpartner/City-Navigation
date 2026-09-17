import { NextRequest, NextResponse } from "next/server";
import { FAMOUS_DESTINATIONS, findNearestMetroStation, METRO_STATIONS } from "@/lib/delhi-ncr-transit";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    if (!query.trim() || query.trim().length < 2) {
      return NextResponse.json({ places: [] });
    }

    const cleanQuery = query.trim();
    const apiKey =
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    let apiPlaces: any[] = [];

    if (apiKey) {
      try {
        // Call Google Places API (New) Text Search biased to Delhi-NCR (45km radius covering Gurgaon, South Delhi, Noida, etc.)
        const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.formattedAddress,places.location,places.primaryTypeDisplayName,places.types"
          },
          body: JSON.stringify({
            textQuery: cleanQuery,
            locationBias: {
              circle: {
                center: { latitude: 28.52, longitude: 77.10 },
                radius: 45000.0 // Covers Gurgaon, South Delhi, Central Delhi, West Delhi, Noida, Dwarka
              }
            },
            maxResultCount: 8
          })
        });

        if (response.ok) {
          const data = await response.json();
          apiPlaces = data.places || [];
        } else {
          const errText = await response.text();
          console.warn("Google Places API error:", response.status, errText);
        }
      } catch (err) {
        console.warn("Google Places fetch exception:", err);
      }
    }

    // Process and enrich API places
    const enrichedApiPlaces = apiPlaces
      .filter((p: any) => p.location?.latitude && p.location?.longitude)
      .map((p: any) => {
        const lat = p.location.latitude;
        const lng = p.location.longitude;
        const addr = p.formattedAddress || "";
        const name = p.displayName?.text || addr;

        // Detect city
        let city = "Delhi NCR";
        if (/gurugram|gurgaon|haryana/i.test(addr) || /gurugram|gurgaon/i.test(name)) {
          city = "Gurgaon";
        } else if (/noida|greater noida/i.test(addr)) {
          city = "Noida";
        } else if (/faridabad/i.test(addr)) {
          city = "Faridabad";
        } else if (/delhi|new delhi/i.test(addr) || /delhi/i.test(name)) {
          city = "Delhi";
        } else if (lng < 77.12 && lat < 28.52) {
          city = "Gurgaon";
        } else {
          city = "Delhi";
        }

        // Sub-locality / neighborhood hint for clear disambiguation
        let areaHint = "";
        if (/vasant kunj/i.test(addr) || /vasant kunj/i.test(name)) areaHint = "Vasant Kunj";
        else if (/ambience island|dlf phase 3|sector 24/i.test(addr)) areaHint = "Ambience Island, NH-48";
        else if (/rohini/i.test(addr)) areaHint = "Rohini";
        else if (/saket/i.test(addr)) areaHint = "Saket";
        else if (/golf course/i.test(addr)) areaHint = "Golf Course Road";
        else if (/cyber hub|cyber city/i.test(addr)) areaHint = "DLF Cyber City";
        else if (/aerocity/i.test(addr)) areaHint = "Aerocity";
        else if (/connaught place|cp/i.test(addr)) areaHint = "Connaught Place";
        else if (/dwarka/i.test(addr)) areaHint = "Dwarka";
        else if (/tagore garden/i.test(addr)) areaHint = "Tagore Garden";

        // Calculate nearest metro station
        const nearest = findNearestMetroStation(lat, lng);

        // Check if matches a known curated destination
        const matchedCurated = FAMOUS_DESTINATIONS.find(
          d =>
            d.name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(d.name.toLowerCase()) ||
            (Math.abs(d.lat - lat) < 0.005 && Math.abs(d.lng - lng) < 0.005)
        );

        return {
          id: p.id,
          name: name,
          city: city,
          areaHint: areaHint,
          formattedAddress: addr,
          category: p.primaryTypeDisplayName?.text || "Destination",
          lat: lat,
          lng: lng,
          nearestStation: {
            id: nearest.station.id,
            name: nearest.station.name,
            line: nearest.station.line,
            lineColor: nearest.station.lineColor,
            distanceKm: nearest.distanceKm
          },
          bestExitGate: matchedCurated?.bestExitGate,
          isCurated: Boolean(matchedCurated)
        };
      });

    // Also find matching curated destinations from the local database
    const queryLower = cleanQuery.toLowerCase();
    const matchedLocal = FAMOUS_DESTINATIONS.filter(
      d =>
        d.name.toLowerCase().includes(queryLower) ||
        d.city.toLowerCase().includes(queryLower) ||
        d.category.toLowerCase().includes(queryLower) ||
        (METRO_STATIONS[d.nearestStationId]?.name || "").toLowerCase().includes(queryLower)
    ).map(d => {
      const station = METRO_STATIONS[d.nearestStationId];
      return {
        id: `curated-${d.id}`,
        curatedId: d.id,
        name: d.name,
        city: d.city,
        areaHint: d.city === "Gurgaon" ? "Gurgaon" : "Delhi",
        formattedAddress: `${d.name}, ${d.city} (Near ${station?.name || "Metro"})`,
        category: d.category,
        lat: d.lat,
        lng: d.lng,
        nearestStation: {
          id: d.nearestStationId,
          name: station?.name || "Metro Station",
          line: station?.line || "Yellow",
          lineColor: station?.lineColor || "#eab308",
          distanceKm: d.distanceFromStationKm
        },
        bestExitGate: d.bestExitGate,
        isCurated: true,
        curatedData: d
      };
    });

    // Merge Google Places + Curated results, avoiding duplicates
    const combined: any[] = [];
    const seenNames = new Set<string>();

    // Put curated matches that specifically match query first
    for (const item of matchedLocal) {
      const key = `${item.name.toLowerCase()}-${item.city.toLowerCase()}`;
      if (!seenNames.has(key)) {
        seenNames.add(key);
        combined.push(item);
      }
    }

    // Add Google Places results
    for (const item of enrichedApiPlaces) {
      const key = `${item.name.toLowerCase()}-${item.city.toLowerCase()}`;
      if (!seenNames.has(key)) {
        seenNames.add(key);
        combined.push(item);
      }
    }

    return NextResponse.json({ places: combined });
  } catch (err: any) {
    console.error("Places route error:", err);
    return NextResponse.json({ places: [] });
  }
}

