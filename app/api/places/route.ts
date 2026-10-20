import { NextRequest, NextResponse } from "next/server";
import { FAMOUS_DESTINATIONS, findNearestMetroStation, METRO_STATIONS } from "@/lib/delhi-ncr-transit";

// High-speed in-memory cache to guarantee sub-millisecond responses on repeated queries
interface CacheEntry {
  timestamp: number;
  places: any[];
}
const PLACES_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

// Helper to determine city from address or coordinates
function detectCity(addr: string, name: string, lat: number, lng: number): string {
  const combined = `${name} ${addr}`.toLowerCase();
  if (/gurugram|gurgaon|haryana/i.test(combined)) return "Gurgaon";
  if (/noida|greater noida/i.test(combined)) return "Noida";
  if (/faridabad/i.test(combined)) return "Faridabad";
  if (/ghaziabad|sahibabad|indirapuram/i.test(combined)) return "Ghaziabad";
  if (/delhi|new delhi/i.test(combined)) return "Delhi";
  if (lng < 77.12 && lat < 28.52) return "Gurgaon";
  if (lng > 77.30 && lat < 28.62) return "Noida";
  if (lat < 28.45 && lng > 77.25) return "Faridabad";
  return "Delhi";
}

// Helper to extract useful neighborhood / area hint
function extractAreaHint(addr: string, name: string): string {
  const combined = `${name} ${addr}`.toLowerCase();
  if (/vasant kunj/i.test(combined)) return "Vasant Kunj";
  if (/saket/i.test(combined)) return "Saket";
  if (/tagore garden/i.test(combined)) return "Tagore Garden";
  if (/pitampura|nsp/i.test(combined)) return "Netaji Subhash Place";
  if (/jasola/i.test(combined)) return "Jasola";
  if (/dwarka/i.test(combined)) {
    const secMatch = combined.match(/sector\s*(\d+)/i);
    return secMatch ? `Dwarka Sec ${secMatch[1]}` : "Dwarka";
  }
  if (/ambience island|dlf phase 3|sector 24/i.test(combined)) return "Ambience Island, NH-48";
  if (/cyber hub|cyber city/i.test(combined)) return "DLF Cyber City";
  if (/golf course/i.test(combined)) return "Golf Course Road";
  if (/aerocity/i.test(combined)) return "Aerocity";
  if (/connaught place|cp|rajiv chowk/i.test(combined)) return "Connaught Place";
  if (/rohini/i.test(combined)) return "Rohini";
  if (/janakpuri/i.test(combined)) return "Janakpuri";
  if (/tilak nagar/i.test(combined)) return "Tilak Nagar";
  if (/hauz khas/i.test(combined)) return "Hauz Khas";
  if (/indirapuram/i.test(combined)) return "Indirapuram";
  if (/sector 18/i.test(combined)) return "Sector 18";
  if (/sohna road/i.test(combined)) return "Sohna Road";
  return "";
}

// Map place category from types or text
function resolveCategory(types: string[] = [], name: string = ""): string {
  const tStr = types.join(" ").toLowerCase();
  const nStr = name.toLowerCase();

  if (tStr.includes("shopping_mall") || nStr.includes("mall") || nStr.includes("plaza") || nStr.includes("galleria")) {
    return "Shopping Mall";
  }
  if (tStr.includes("hospital") || tStr.includes("doctor") || tStr.includes("health") || nStr.includes("hospital") || nStr.includes("medanta") || nStr.includes("fortis") || nStr.includes("max ")) {
    return "Hospital / Healthcare";
  }
  if (tStr.includes("subway_station") || tStr.includes("transit_station") || nStr.includes("metro") || nStr.includes("station")) {
    return "Metro Station";
  }
  if (tStr.includes("restaurant") || tStr.includes("cafe") || tStr.includes("food") || nStr.includes("cafe") || nStr.includes("dhaba")) {
    return "Dining / Cafe";
  }
  if (tStr.includes("university") || tStr.includes("school") || nStr.includes("college") || nStr.includes("university") || nStr.includes("institute")) {
    return "University / Campus";
  }
  if (tStr.includes("park") || nStr.includes("park") || nStr.includes("garden")) {
    return "Park / Recreation";
  }
  return "Point of Interest";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const cleanQuery = query.trim();

    if (!cleanQuery || cleanQuery.length < 2) {
      return NextResponse.json({ places: [] });
    }

    const cacheKey = cleanQuery.toLowerCase();
    const cached = PLACES_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ places: cached.places });
    }

    const apiKey =
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    const queryLower = cleanQuery.toLowerCase();
    const tokens = queryLower.split(/\s+/).filter(Boolean);

    // 1. Search Curated Local Database First (0ms fast path)
    const matchedCurated = FAMOUS_DESTINATIONS.filter(d => {
      const target = `${d.name} ${d.city} ${d.category} ${METRO_STATIONS[d.nearestStationId]?.name || ""}`.toLowerCase();
      return tokens.every(token => target.includes(token)) || target.includes(queryLower);
    }).map(d => {
      const station = METRO_STATIONS[d.nearestStationId];
      return {
        id: `curated-${d.id}`,
        curatedId: d.id,
        name: d.name,
        city: d.city,
        areaHint: d.city === "Gurgaon" ? "Gurgaon" : "Delhi",
        formattedAddress: `${d.name}, ${d.city} (Near ${station?.name || "Metro"})`,
        category: d.category === "Mall" ? "Shopping Mall" : d.category,
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

    let googlePlaces: any[] = [];

    // 2. Query Google Places API
    if (apiKey) {
      try {
        // Strategy A: Google Places Autocomplete API with country filter & NCR coordinates bias
        const autoUrl =
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(cleanQuery)}` +
          `&key=${apiKey}&components=country:in&location=28.53,77.15&radius=65000&strictbounds=false`;

        const autoRes = await fetch(autoUrl);
        if (autoRes.ok) {
          const autoData = await autoRes.json();
          const predictions = autoData.predictions || [];

          if (predictions.length > 0) {
            // Retrieve coordinates (lat, lng) and address for top predictions in parallel
            const detailsList = await Promise.allSettled(
              predictions.slice(0, 8).map(async (p: any) => {
                const dUrl =
                  `https://maps.googleapis.com/maps/api/place/details/json?place_id=${p.place_id}` +
                  `&fields=geometry,name,formatted_address,types&key=${apiKey}`;
                const dRes = await fetch(dUrl);
                if (!dRes.ok) return null;
                const dData = await dRes.json();
                const loc = dData.result?.geometry?.location;
                if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") return null;

                const name = p.structured_formatting?.main_text || dData.result?.name || p.description.split(",")[0];
                const fullAddress = dData.result?.formatted_address || p.description;
                const types = p.types || dData.result?.types || [];

                return {
                  id: p.place_id,
                  name: name,
                  formattedAddress: fullAddress,
                  lat: loc.lat,
                  lng: loc.lng,
                  types: types
                };
              })
            );

            googlePlaces = detailsList
              .map(res => (res.status === "fulfilled" ? res.value : null))
              .filter(Boolean);
          }
        }

        // Strategy B Fallback: Google Places Text Search (New) or Geocode if autocomplete had 0 results
        if (googlePlaces.length === 0) {
          const textRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask":
                "places.id,places.displayName,places.formattedAddress,places.location,places.primaryTypeDisplayName,places.types"
            },
            body: JSON.stringify({
              textQuery: `${cleanQuery} Delhi NCR India`,
              locationBias: {
                circle: {
                  center: { latitude: 28.53, longitude: 77.15 },
                  radius: 55000.0
                }
              },
              maxResultCount: 6
            })
          });

          if (textRes.ok) {
            const textData = await textRes.json();
            const rawPlaces = textData.places || [];
            googlePlaces = rawPlaces
              .filter((p: any) => p.location?.latitude && p.location?.longitude)
              .map((p: any) => ({
                id: p.id,
                name: p.displayName?.text || p.formattedAddress,
                formattedAddress: p.formattedAddress || "",
                lat: p.location.latitude,
                lng: p.location.longitude,
                types: p.types || []
              }));
          }
        }
      } catch (apiErr) {
        console.warn("Google Maps places query error:", apiErr);
      }
    }

    // 3. Format and enrich Google Places results with nearest metro stations
    const enrichedGooglePlaces = googlePlaces.map((p: any) => {
      const lat = p.lat;
      const lng = p.lng;
      const addr = p.formattedAddress || "";
      const name = p.name || addr;

      const city = detectCity(addr, name, lat, lng);
      const areaHint = extractAreaHint(addr, name);
      const category = resolveCategory(p.types, name);
      const nearest = findNearestMetroStation(lat, lng);

      // Check if matches a known curated destination
      const matchedCuratedItem = FAMOUS_DESTINATIONS.find(
        d =>
          d.name.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(d.name.toLowerCase()) ||
          (Math.abs(d.lat - lat) < 0.004 && Math.abs(d.lng - lng) < 0.004)
      );

      return {
        id: p.id,
        name: name,
        city: city,
        areaHint: areaHint || (city === "Gurgaon" ? "Gurgaon" : "Delhi"),
        formattedAddress: addr,
        category: category,
        lat: lat,
        lng: lng,
        nearestStation: {
          id: nearest.station.id,
          name: nearest.station.name,
          line: nearest.station.line,
          lineColor: nearest.station.lineColor,
          distanceKm: nearest.distanceKm
        },
        bestExitGate: matchedCuratedItem?.bestExitGate,
        isCurated: Boolean(matchedCuratedItem),
        curatedData: matchedCuratedItem
      };
    });

    // 4. Merge Curated and Google Places results with smart deduplication
    const combined: any[] = [];
    const seenNames = new Set<string>();

    const normalizeKey = (name: string, city: string) => {
      return `${name.toLowerCase().replace(/[^a-z0-9]/g, "")}-${city.toLowerCase()}`;
    };

    // Curated matches take priority
    for (const item of matchedCurated) {
      const key = normalizeKey(item.name, item.city);
      if (!seenNames.has(key)) {
        seenNames.add(key);
        combined.push(item);
      }
    }

    // Add Google Places results
    for (const item of enrichedGooglePlaces) {
      const key = normalizeKey(item.name, item.city);
      if (!seenNames.has(key)) {
        seenNames.add(key);
        combined.push(item);
      }
    }

    // Save in cache
    if (combined.length > 0) {
      PLACES_CACHE.set(cacheKey, {
        timestamp: Date.now(),
        places: combined
      });
    }

    return NextResponse.json({ places: combined });
  } catch (err: any) {
    console.error("Places route error:", err);
    return NextResponse.json({ places: [] });
  }
}
