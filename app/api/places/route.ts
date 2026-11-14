import { NextRequest, NextResponse } from "next/server";
import { FAMOUS_DESTINATIONS, findNearestMetroStation, METRO_STATIONS } from "@/lib/delhi-ncr-transit";

const NCR_BOUNDS = {
  low: { latitude: 28.18, longitude: 76.75 },
  high: { latitude: 28.92, longitude: 77.65 }
};

interface CacheEntry {
  timestamp: number;
  places: PlaceSuggestion[];
}

export interface PlaceSuggestion {
  id: string;
  curatedId?: string;
  name: string;
  city: string;
  areaHint: string;
  formattedAddress: string;
  category: string;
  lat?: number;
  lng?: number;
  nearestStation?: {
    id: string;
    name: string;
    line: string;
    lineColor: string;
    distanceKm: number;
  };
  bestExitGate?: number;
  isCurated: boolean;
  curatedData?: (typeof FAMOUS_DESTINATIONS)[number];
  needsResolve?: boolean;
}

const PLACES_CACHE = new Map<string, CacheEntry>();
const PLACE_DETAIL_CACHE = new Map<string, { timestamp: number; place: PlaceSuggestion }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

function getGoogleApiKey(): string | undefined {
  const raw =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  return raw ? raw.trim().replace(/^['"]|['"]$/g, "") : undefined;
}

function detectCity(addr: string, name: string, lat?: number, lng?: number): string {
  const combined = `${name} ${addr}`.toLowerCase();
  if (/gurugram|gurgaon|manesar|sohna|cyber city|cyber hub|udyog vihar|dlf phase/i.test(combined)) return "Gurgaon";
  if (/noida|greater noida|gautam buddha nagar|pari chowk/i.test(combined)) return "Noida";
  if (/faridabad|ballabgarh/i.test(combined)) return "Faridabad";
  if (/ghaziabad|sahibabad|indirapuram|vaishali|kaushambi/i.test(combined)) return "Ghaziabad";
  if (/delhi|new delhi/i.test(combined)) return "Delhi";
  if (typeof lat === "number" && typeof lng === "number") {
    if (lng < 77.13 && lat < 28.525) return "Gurgaon";
    if (lng > 77.295 && lat < 28.655) return "Noida";
    if (lat < 28.45 && lng > 77.25) return "Faridabad";
  }
  return "Delhi NCR";
}

function extractAreaHint(addr: string, name: string): string {
  const combined = `${name} ${addr}`.toLowerCase();
  const sectorMatch = combined.match(/\b(sector[\s-]*\d+[a-z]?)\b/i);
  if (/ambience island/i.test(combined)) return "Ambience Island, NH-48";
  if (/cyber hub|cyber city/i.test(combined)) return "DLF Cyber City";
  if (/golf course/i.test(combined)) return "Golf Course Road";
  if (/sohna road/i.test(combined)) return "Sohna Road";
  if (/udyog vihar/i.test(combined)) return "Udyog Vihar";
  if (/vasant kunj/i.test(combined)) return "Vasant Kunj";
  if (/saket/i.test(combined)) return "Saket";
  if (/connaught place|\bcp\b|rajiv chowk/i.test(combined)) return "Connaught Place";
  if (/aerocity/i.test(combined)) return "Aerocity";
  if (/hauz khas/i.test(combined)) return "Hauz Khas";
  if (/lajpat nagar/i.test(combined)) return "Lajpat Nagar";
  if (/karol bagh/i.test(combined)) return "Karol Bagh";
  if (/rohini/i.test(combined)) return sectorMatch ? `Rohini ${sectorMatch[1]}` : "Rohini";
  if (/dwarka/i.test(combined)) return sectorMatch ? `Dwarka ${sectorMatch[1]}` : "Dwarka";
  if (/janakpuri/i.test(combined)) return "Janakpuri";
  if (/pitampura|netaji subhash place|\bnsp\b/i.test(combined)) return "Pitampura / NSP";
  if (/greater noida|pari chowk|knowledge park/i.test(combined)) return "Greater Noida";
  if (/indirapuram/i.test(combined)) return "Indirapuram";
  if (sectorMatch) {
    return sectorMatch[1].replace(/sector[\s-]*/i, "Sector ").toUpperCase().replace("SECTOR ", "Sector ");
  }
  return "";
}

function resolveCategory(types: string[] = [], name: string = ""): string {
  const tStr = types.join(" ").toLowerCase();
  const nStr = name.toLowerCase();

  if (tStr.includes("shopping_mall") || nStr.includes("mall") || nStr.includes("plaza") || nStr.includes("galleria")) {
    return "Shopping Mall";
  }
  if (tStr.includes("hospital") || tStr.includes("doctor") || tStr.includes("health") || nStr.includes("hospital") || nStr.includes("medanta") || nStr.includes("fortis") || nStr.includes("aiims") || nStr.includes("max ")) {
    return "Hospital / Healthcare";
  }
  if (tStr.includes("subway_station") || tStr.includes("transit_station") || nStr.includes("metro") || nStr.includes("station")) {
    return "Metro / Transit Station";
  }
  if (tStr.includes("airport") || nStr.includes("airport") || nStr.includes("terminal 3") || nStr.includes("terminal 1")) {
    return "Airport / Terminal";
  }
  if (tStr.includes("restaurant") || tStr.includes("cafe") || tStr.includes("food") || nStr.includes("cafe") || nStr.includes("dhaba")) {
    return "Dining / Cafe";
  }
  if (tStr.includes("university") || tStr.includes("school") || nStr.includes("college") || nStr.includes("university") || nStr.includes("institute") || nStr.includes("iit") || nStr.includes("amity")) {
    return "University / Campus";
  }
  if (tStr.includes("park") || nStr.includes("park") || nStr.includes("garden")) {
    return "Park / Recreation";
  }
  if (tStr.includes("sublocality") || tStr.includes("locality") || tStr.includes("neighborhood") || /sector|phase|block|enclave|vihar|nagar|colony/i.test(nStr)) {
    return "Sector / Locality";
  }
  if (tStr.includes("corporate") || /tech|cyber|tower|it park|business park|unitech|dlf|candor/i.test(nStr)) {
    return "Business / Tech Hub";
  }
  return "Address / Place";
}

function enrichWithCoordinates(params: {
  id: string;
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  types?: string[];
}): PlaceSuggestion {
  const { id, name, formattedAddress, lat, lng, types = [] } = params;
  const city = detectCity(formattedAddress, name, lat, lng);
  const areaHint = extractAreaHint(formattedAddress, name) || city;
  const category = resolveCategory(types, name);
  const nearest = findNearestMetroStation(lat, lng);

  const matchedCuratedItem = FAMOUS_DESTINATIONS.find(
    (d) =>
      d.name.toLowerCase() === name.toLowerCase() ||
      (Math.abs(d.lat - lat) < 0.0025 && Math.abs(d.lng - lng) < 0.0025)
  );

  return {
    id,
    name,
    city,
    areaHint,
    formattedAddress,
    category,
    lat,
    lng,
    nearestStation: {
      id: nearest.station.id,
      name: nearest.station.name,
      line: nearest.station.line,
      lineColor: nearest.station.lineColor,
      distanceKm: nearest.distanceKm
    },
    bestExitGate: matchedCuratedItem?.bestExitGate,
    isCurated: Boolean(matchedCuratedItem),
    curatedData: matchedCuratedItem,
    needsResolve: false
  };
}

async function resolvePlaceById(placeId: string, apiKey: string): Promise<PlaceSuggestion | null> {
  const cached = PLACE_DETAIL_CACHE.get(placeId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.place;
  }

  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,location,types"
      }
    });

    if (res.ok) {
      const data = await res.json();
      const lat = data.location?.latitude;
      const lng = data.location?.longitude;
      if (typeof lat === "number" && typeof lng === "number") {
        const place = enrichWithCoordinates({
          id: data.id || placeId,
          name: data.displayName?.text || data.formattedAddress?.split(",")[0] || "Selected Location",
          formattedAddress: data.formattedAddress || "",
          lat,
          lng,
          types: data.types || []
        });
        PLACE_DETAIL_CACHE.set(placeId, { timestamp: Date.now(), place });
        return place;
      }
    }

    // Fallback to Geocoding API by place_id
    const geoRes = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(placeId)}&key=${apiKey}`
    );
    if (geoRes.ok) {
      const geoData = await geoRes.json();
      const first = geoData.results?.[0];
      const loc = first?.geometry?.location;
      if (loc && typeof loc.lat === "number" && typeof loc.lng === "number") {
        const addr = first.formatted_address || "";
        const place = enrichWithCoordinates({
          id: placeId,
          name: addr.split(",")[0] || "Selected Location",
          formattedAddress: addr,
          lat: loc.lat,
          lng: loc.lng,
          types: first.types || []
        });
        PLACE_DETAIL_CACHE.set(placeId, { timestamp: Date.now(), place });
        return place;
      }
    }
  } catch (err) {
    console.warn("resolvePlaceById error:", err);
  }

  return null;
}

async function geocodeAddressInNCR(query: string, apiKey: string): Promise<PlaceSuggestion[]> {
  try {
    const hasCity = /delhi|gurgaon|gurugram|noida|faridabad|ghaziabad|manesar/i.test(query);
    const enrichedQuery = hasCity ? query : `${query}, Delhi NCR, India`;
    const geoUrl =
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(enrichedQuery)}` +
      `&bounds=${NCR_BOUNDS.low.latitude},${NCR_BOUNDS.low.longitude}|${NCR_BOUNDS.high.latitude},${NCR_BOUNDS.high.longitude}` +
      `&region=in&components=country:in&key=${apiKey}`;

    const geoRes = await fetch(geoUrl);
    if (!geoRes.ok) return [];
    const geoData = await geoRes.json();
    const results = geoData.results || [];

    return results
      .filter((r: any) => {
        const lat = r.geometry?.location?.lat;
        const lng = r.geometry?.location?.lng;
        return (
          typeof lat === "number" &&
          typeof lng === "number" &&
          lat >= NCR_BOUNDS.low.latitude &&
          lat <= NCR_BOUNDS.high.latitude &&
          lng >= NCR_BOUNDS.low.longitude &&
          lng <= NCR_BOUNDS.high.longitude
        );
      })
      .slice(0, 5)
      .map((r: any) => {
        const addr: string = r.formatted_address || query;
        const name = addr.split(",")[0] || query;
        return enrichWithCoordinates({
          id: r.place_id || `geo-${addr}`,
          name,
          formattedAddress: addr,
          lat: r.geometry.location.lat,
          lng: r.geometry.location.lng,
          types: r.types || []
        });
      });
  } catch (err) {
    console.warn("geocodeAddressInNCR error:", err);
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const placeIdParam = searchParams.get("placeId")?.trim();
    const resolveTop = searchParams.get("resolve") === "1" || searchParams.get("resolve") === "true";
    const cleanQuery = (searchParams.get("q") || "").trim();
    const apiKey = getGoogleApiKey();

    // Direct placeId lookup (used when selecting an autocomplete prediction or map POI)
    if (placeIdParam) {
      if (!apiKey) {
        return NextResponse.json({ error: "Google Maps API key not configured" }, { status: 500 });
      }
      const place = await resolvePlaceById(placeIdParam, apiKey);
      if (!place) {
        return NextResponse.json({ error: "Place coordinates could not be resolved" }, { status: 404 });
      }
      return NextResponse.json({ place });
    }

    if (!cleanQuery || cleanQuery.length < 2) {
      return NextResponse.json({ places: [] });
    }

    const cacheKey = `${cleanQuery.toLowerCase()}::${resolveTop ? "r1" : "r0"}`;
    const cached = PLACES_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ places: cached.places });
    }

    const queryLower = cleanQuery.toLowerCase();
    const tokens = queryLower.split(/\s+/).filter(Boolean);

    // 1. Curated Local Database matches (0ms, includes verified Metro Exit Gate notes)
    const matchedCurated = FAMOUS_DESTINATIONS.filter((d) => {
      const nameLower = d.name.toLowerCase();
      const target = `${nameLower} ${d.city.toLowerCase()}`;
      return target.includes(queryLower) || tokens.every((token) => target.includes(token));
    })
      .slice(0, 4)
      .map((d) => {
        const station = METRO_STATIONS[d.nearestStationId];
        const strongNameMatch = d.name.toLowerCase().includes(queryLower);
        return {
          suggestion: {
            id: `curated-${d.id}`,
            curatedId: d.id,
            name: d.name,
            city: d.city,
            areaHint: d.city,
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
            curatedData: d,
            needsResolve: false
          } as PlaceSuggestion,
          strongNameMatch
        };
      });

    let googleSuggestions: PlaceSuggestion[] = [];

    // 2. Full Delhi-NCR Google Places Autocomplete (New API v1 - single fast call, strict NCR rectangle)
    if (apiKey) {
      try {
        const autoRes = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey
          },
          body: JSON.stringify({
            input: cleanQuery,
            includedRegionCodes: ["in"],
            locationRestriction: { rectangle: NCR_BOUNDS },
            origin: { latitude: 28.5355, longitude: 77.21 }
          })
        });

        if (autoRes.ok) {
          const autoData = await autoRes.json();
          const suggestions = autoData.suggestions || [];

          for (const s of suggestions) {
            const pred = s.placePrediction;
            if (!pred?.placeId) continue;

            const cachedDetail = PLACE_DETAIL_CACHE.get(pred.placeId);
            if (cachedDetail && Date.now() - cachedDetail.timestamp < CACHE_TTL_MS) {
              googleSuggestions.push(cachedDetail.place);
              continue;
            }

            const mainText = pred.structuredFormat?.mainText?.text || pred.text?.text?.split(",")[0] || cleanQuery;
            const secondaryText = pred.structuredFormat?.secondaryText?.text || "";
            const fullText = pred.text?.text || [mainText, secondaryText].filter(Boolean).join(", ");
            const city = detectCity(fullText, mainText);
            const areaHint = extractAreaHint(fullText, mainText) || city;
            const category = resolveCategory(pred.types || [], mainText);

            googleSuggestions.push({
              id: pred.placeId,
              name: mainText,
              city,
              areaHint,
              formattedAddress: fullText,
              category,
              isCurated: false,
              needsResolve: true
            });
          }
        }

        // Strategy B: If user hit Enter (resolveTop) OR autocomplete had 0 suggestions, run searchText + Geocoding fallback
        if ((resolveTop && googleSuggestions.length > 0 && googleSuggestions[0].needsResolve) || googleSuggestions.length === 0) {
          if (resolveTop && googleSuggestions.length > 0 && googleSuggestions[0].needsResolve) {
            const resolvedTop = await resolvePlaceById(googleSuggestions[0].id, apiKey);
            if (resolvedTop) {
              googleSuggestions[0] = resolvedTop;
            }
          }

          if (googleSuggestions.length === 0) {
            const textRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": apiKey,
                "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types"
              },
              body: JSON.stringify({
                textQuery: cleanQuery,
                regionCode: "IN",
                locationRestriction: { rectangle: NCR_BOUNDS },
                maxResultCount: 6
              })
            });

            if (textRes.ok) {
              const textData = await textRes.json();
              for (const p of textData.places || []) {
                if (typeof p.location?.latitude === "number" && typeof p.location?.longitude === "number") {
                  const enriched = enrichWithCoordinates({
                    id: p.id,
                    name: p.displayName?.text || p.formattedAddress?.split(",")[0] || cleanQuery,
                    formattedAddress: p.formattedAddress || "",
                    lat: p.location.latitude,
                    lng: p.location.longitude,
                    types: p.types || []
                  });
                  PLACE_DETAIL_CACHE.set(p.id, { timestamp: Date.now(), place: enriched });
                  googleSuggestions.push(enriched);
                }
              }
            }

            // Final Strategy C fallback: Geocoding API for specific street/sector/pincode addresses
            if (googleSuggestions.length === 0) {
              googleSuggestions = await geocodeAddressInNCR(cleanQuery, apiKey);
            }
          }
        }
      } catch (apiErr) {
        console.warn("Google Maps places query error:", apiErr);
      }
    }

    // 3. Merge Curated & Google results cleanly:
    // Direct curated name matches go first, then all live Google Maps suggestions, then partial curated fallback matches
    const combined: PlaceSuggestion[] = [];
    const seenKeys = new Set<string>();
    const normalizeKey = (name: string, city: string) =>
      `${name.toLowerCase().replace(/[^a-z0-9]/g, "")}-${city.toLowerCase()}`;

    const pushUnique = (item: PlaceSuggestion) => {
      const k = normalizeKey(item.name, item.city);
      if (!seenKeys.has(k)) {
        seenKeys.add(k);
        combined.push(item);
      }
    };

    for (const c of matchedCurated) {
      if (c.strongNameMatch) pushUnique(c.suggestion);
    }
    for (const item of googleSuggestions) {
      pushUnique(item);
    }
    for (const c of matchedCurated) {
      if (!c.strongNameMatch) pushUnique(c.suggestion);
    }

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
