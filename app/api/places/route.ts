import { NextRequest, NextResponse } from "next/server";
import { FAMOUS_DESTINATIONS, findNearestMetroStation, METRO_STATIONS } from "@/lib/delhi-ncr-transit";

const NCR_BOUNDS = {
  low: { latitude: 28.10, longitude: 76.55 },
  high: { latitude: 29.05, longitude: 77.80 }
};

function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistanceText(distanceKm: number): string {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return "";
  if (distanceKm < 1) {
    const meters = Math.max(50, Math.round((distanceKm * 1000) / 50) * 50);
    return `${meters} m`;
  }
  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km`;
  }
  return `${Math.round(distanceKm)} km`;
}

function isLikelyWithinNCR(text: string, distanceMeters?: number): boolean {
  if (typeof distanceMeters === "number" && distanceMeters > 135000) {
    return false;
  }
  const lower = text.toLowerCase();
  const nonNcrStates =
    /\b(maharashtra|mumbai|pune|nagpur|thane|karnataka|bengaluru|bangalore|mysore|tamil nadu|chennai|telangana|hyderabad|west bengal|kolkata|gujarat|ahmedabad|surat|vadodara|kerala|kochi|bihar|patna|madhya pradesh|bhopal|indore|odisha|assam|chandigarh|punjab|ludhiana|amritsar|jaipur|lucknow|kanpur|agra)\b/i;
  if (nonNcrStates.test(lower) && !/\b(delhi|gurugram|gurgaon|noida|faridabad|ghaziabad|ncr)\b/i.test(lower)) {
    return false;
  }
  return true;
}

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
  distanceKm?: number;
  distanceText?: string;
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

async function resolvePlaceById(
  placeId: string,
  apiKey: string,
  sessionToken?: string,
  refLat?: number,
  refLng?: number
): Promise<PlaceSuggestion | null> {
  const withDistance = (place: PlaceSuggestion): PlaceSuggestion => {
    if (
      typeof refLat === "number" &&
      typeof refLng === "number" &&
      typeof place.lat === "number" &&
      typeof place.lng === "number"
    ) {
      const distKm = haversineDistanceKm(refLat, refLng, place.lat, place.lng);
      return {
        ...place,
        distanceKm: Number(distKm.toFixed(1)),
        distanceText: formatDistanceText(distKm)
      };
    }
    return place;
  };

  const cached = PLACE_DETAIL_CACHE.get(placeId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return withDistance(cached.place);
  }

  try {
    const tokenQs = sessionToken ? `?sessionToken=${encodeURIComponent(sessionToken)}` : "";
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}${tokenQs}`, {
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
        return withDistance(place);
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
        return withDistance(place);
      }
    }
  } catch (err) {
    console.warn("resolvePlaceById error:", err);
  }

  return null;
}

async function geocodeAddressInNCR(
  query: string,
  apiKey: string,
  scope: "ncr" | "india",
  refLat: number,
  refLng: number
): Promise<PlaceSuggestion[]> {
  try {
    const hasCity = /delhi|gurgaon|gurugram|noida|faridabad|ghaziabad|manesar/i.test(query);
    const enrichedQuery = scope === "india" || hasCity ? query : `${query}, Delhi NCR, India`;
    const boundsParam =
      scope === "india"
        ? ""
        : `&bounds=${NCR_BOUNDS.low.latitude},${NCR_BOUNDS.low.longitude}|${NCR_BOUNDS.high.latitude},${NCR_BOUNDS.high.longitude}`;
    const geoUrl =
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(enrichedQuery)}` +
      `${boundsParam}&region=in&components=country:in&key=${apiKey}`;

    const geoRes = await fetch(geoUrl);
    if (!geoRes.ok) return [];
    const geoData = await geoRes.json();
    const results = geoData.results || [];

    return results
      .filter((r: any) => {
        const lat = r.geometry?.location?.lat;
        const lng = r.geometry?.location?.lng;
        if (typeof lat !== "number" || typeof lng !== "number") return false;
        if (scope === "india") return true;
        return (
          lat >= NCR_BOUNDS.low.latitude &&
          lat <= NCR_BOUNDS.high.latitude &&
          lng >= NCR_BOUNDS.low.longitude &&
          lng <= NCR_BOUNDS.high.longitude
        );
      })
      .slice(0, 6)
      .map((r: any) => {
        const addr: string = r.formatted_address || query;
        const name = addr.split(",")[0] || query;
        const distKm = haversineDistanceKm(refLat, refLng, r.geometry.location.lat, r.geometry.location.lng);
        return {
          ...enrichWithCoordinates({
            id: r.place_id || `geo-${addr}`,
            name,
            formattedAddress: addr,
            lat: r.geometry.location.lat,
            lng: r.geometry.location.lng,
            types: r.types || []
          }),
          distanceKm: Number(distKm.toFixed(1)),
          distanceText: formatDistanceText(distKm)
        };
      });
  } catch (err) {
    console.warn("geocodeAddressInNCR error:", err);
    return [];
  }
}

async function searchTextPlaces(
  query: string,
  apiKey: string,
  scope: "ncr" | "india",
  refLat: number,
  refLng: number,
  maxResultCount: number
): Promise<PlaceSuggestion[]> {
  try {
    const textRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types"
      },
      body: JSON.stringify({
        textQuery: query,
        regionCode: "IN",
        locationBias: {
          circle: {
            center: { latitude: refLat, longitude: refLng },
            radius: scope === "india" ? 50000 : 35000
          }
        },
        maxResultCount
      })
    });

    if (!textRes.ok) return [];
    const textData = await textRes.json();
    const out: PlaceSuggestion[] = [];

    for (const p of textData.places || []) {
      const lat = p.location?.latitude;
      const lng = p.location?.longitude;
      if (typeof lat !== "number" || typeof lng !== "number") continue;

      const distKm = haversineDistanceKm(refLat, refLng, lat, lng);
      if (scope === "ncr" && !isLikelyWithinNCR(p.formattedAddress || "", distKm * 1000)) {
        continue;
      }

      const enriched = enrichWithCoordinates({
        id: p.id,
        name: p.displayName?.text || p.formattedAddress?.split(",")[0] || query,
        formattedAddress: p.formattedAddress || "",
        lat,
        lng,
        types: p.types || []
      });
      PLACE_DETAIL_CACHE.set(p.id, { timestamp: Date.now(), place: enriched });
      out.push({
        ...enriched,
        distanceKm: Number(distKm.toFixed(1)),
        distanceText: formatDistanceText(distKm)
      });
    }

    return out;
  } catch (err) {
    console.warn("searchTextPlaces error:", err);
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const placeIdParam = searchParams.get("placeId")?.trim();
    const sessionToken = searchParams.get("sessionToken")?.trim() || undefined;
    const resolveTop = searchParams.get("resolve") === "1" || searchParams.get("resolve") === "true";
    const mode = searchParams.get("mode") === "more" ? "more" : "autocomplete";
    const scope: "ncr" | "india" = searchParams.get("scope") === "india" ? "india" : "ncr";
    const parsedLat = parseFloat(searchParams.get("lat") || "");
    const parsedLng = parseFloat(searchParams.get("lng") || "");
    const refLat = Number.isFinite(parsedLat) ? parsedLat : 28.5355;
    const refLng = Number.isFinite(parsedLng) ? parsedLng : 77.21;
    const cleanQuery = (searchParams.get("q") || "").trim();
    const apiKey = getGoogleApiKey();

    // Direct placeId lookup (used when selecting an autocomplete prediction or map POI)
    if (placeIdParam) {
      if (!apiKey) {
        return NextResponse.json({ error: "Google Maps API key not configured" }, { status: 500 });
      }
      const place = await resolvePlaceById(placeIdParam, apiKey, sessionToken, refLat, refLng);
      if (!place) {
        return NextResponse.json({ error: "Place coordinates could not be resolved" }, { status: 404 });
      }
      return NextResponse.json({ place });
    }

    if (!cleanQuery || cleanQuery.length < 2) {
      return NextResponse.json({ places: [] });
    }

    const originBucket = `${refLat.toFixed(2)},${refLng.toFixed(2)}`;
    const cacheKey = `${cleanQuery.toLowerCase()}::${originBucket}::${scope}::${mode}::${resolveTop ? "r1" : "r0"}`;
    const cached = PLACES_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ places: cached.places });
    }

    const queryLower = cleanQuery.toLowerCase();
    const tokens = queryLower.split(/\s+/).filter(Boolean);

    // 1. Curated Local Database matches (used strictly for strong landmark hits or fallback)
    const matchedCurated = FAMOUS_DESTINATIONS.filter((d) => {
      const nameLower = d.name.toLowerCase();
      const target = `${nameLower} ${d.city.toLowerCase()}`;
      return target.includes(queryLower) || tokens.every((token) => target.includes(token));
    })
      .slice(0, 3)
      .map((d) => {
        const station = METRO_STATIONS[d.nearestStationId];
        const distKm = haversineDistanceKm(refLat, refLng, d.lat, d.lng);
        const strongNameMatch = queryLower.length >= 4 && d.name.toLowerCase().includes(queryLower);
        return {
          suggestion: {
            id: `curated-${d.id}`,
            curatedId: d.id,
            name: d.name,
            city: d.city,
            areaHint: d.city,
            formattedAddress: `${d.name}, ${d.city} (Near ${station?.name || "Metro"})`,
            category: d.category === "Mall" ? "Shopping Mall" : d.category,
            distanceKm: Number(distKm.toFixed(1)),
            distanceText: formatDistanceText(distKm),
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

    // 2. Full Uber-style Google Places Search (Hyperlocal Autocomplete w/ origin distance + "Get more results" deep search)
    if (apiKey) {
      try {
        if (mode === "more") {
          const [textHits, geoHits] = await Promise.all([
            searchTextPlaces(cleanQuery, apiKey, scope, refLat, refLng, 15),
            geocodeAddressInNCR(cleanQuery, apiKey, scope, refLat, refLng)
          ]);
          googleSuggestions = [...textHits, ...geoHits];
        } else {
          const autoBody: Record<string, any> = {
            input: cleanQuery,
            includedRegionCodes: ["in"],
            origin: { latitude: refLat, longitude: refLng },
            locationBias: {
              circle: {
                center: { latitude: refLat, longitude: refLng },
                radius: scope === "india" ? 50000 : 20000
              }
            }
          };
          if (sessionToken) {
            autoBody.sessionToken = sessionToken;
          }

          const autoRes = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": apiKey
            },
            body: JSON.stringify(autoBody)
          });

          if (autoRes.ok) {
            const autoData = await autoRes.json();
            const suggestions = autoData.suggestions || [];

            for (const s of suggestions) {
              const pred = s.placePrediction;
              if (!pred?.placeId) continue;

              const mainText = pred.structuredFormat?.mainText?.text || pred.text?.text?.split(",")[0] || cleanQuery;
              const secondaryText = pred.structuredFormat?.secondaryText?.text || "";
              const fullText = pred.text?.text || [mainText, secondaryText].filter(Boolean).join(", ");

              if (scope === "ncr" && !isLikelyWithinNCR(fullText, pred.distanceMeters)) {
                continue;
              }

              const cachedDetail = PLACE_DETAIL_CACHE.get(pred.placeId);
              if (cachedDetail && Date.now() - cachedDetail.timestamp < CACHE_TTL_MS) {
                const c = cachedDetail.place;
                const dKm =
                  typeof c.lat === "number" && typeof c.lng === "number"
                    ? haversineDistanceKm(refLat, refLng, c.lat, c.lng)
                    : typeof pred.distanceMeters === "number"
                    ? pred.distanceMeters / 1000
                    : undefined;
                googleSuggestions.push({
                  ...c,
                  distanceKm: typeof dKm === "number" ? Number(dKm.toFixed(1)) : undefined,
                  distanceText: typeof dKm === "number" ? formatDistanceText(dKm) : undefined
                });
                continue;
              }

              const distKm = typeof pred.distanceMeters === "number" ? pred.distanceMeters / 1000 : undefined;
              const city = detectCity(fullText, mainText);
              const areaHint = extractAreaHint(fullText, mainText) || city;
              const category = resolveCategory(pred.types || [], mainText);

              googleSuggestions.push({
                id: pred.placeId,
                name: mainText,
                city,
                areaHint,
                formattedAddress: secondaryText || fullText,
                category,
                distanceKm: typeof distKm === "number" ? Number(distKm.toFixed(1)) : undefined,
                distanceText: typeof distKm === "number" ? formatDistanceText(distKm) : undefined,
                isCurated: false,
                needsResolve: true
              });
            }
          }

          if (resolveTop && googleSuggestions.length > 0 && googleSuggestions[0].needsResolve) {
            const resolvedTop = await resolvePlaceById(googleSuggestions[0].id, apiKey, sessionToken, refLat, refLng);
            if (resolvedTop) {
              googleSuggestions[0] = resolvedTop;
            }
          }

          if (googleSuggestions.length === 0) {
            googleSuggestions = await searchTextPlaces(cleanQuery, apiKey, scope, refLat, refLng, 8);
            if (googleSuggestions.length === 0) {
              googleSuggestions = await geocodeAddressInNCR(cleanQuery, apiKey, scope, refLat, refLng);
            }
          }
        }
      } catch (apiErr) {
        console.warn("Google Maps places query error:", apiErr);
      }
    }

    // 3. Merge clean list: exact curated landmark matches (4+ char query) + live Google Maps suggestions + weak curated fallback
    const combined: PlaceSuggestion[] = [];
    const seenKeys = new Set<string>();
    const normalizeKey = (name: string, addr: string) =>
      `${name.toLowerCase().replace(/[^a-z0-9]/g, "")}-${addr.slice(0, 24).toLowerCase().replace(/[^a-z0-9]/g, "")}`;

    const pushUnique = (item: PlaceSuggestion) => {
      const k = normalizeKey(item.name, item.formattedAddress || item.city);
      if (!seenKeys.has(k)) {
        seenKeys.add(k);
        combined.push(item);
      }
    };

    if (mode !== "more") {
      for (const c of matchedCurated) {
        if (c.strongNameMatch) pushUnique(c.suggestion);
      }
    }
    for (const item of googleSuggestions) {
      pushUnique(item);
    }
    if (mode !== "more" && combined.length < 3) {
      for (const c of matchedCurated) {
        if (!c.strongNameMatch) pushUnique(c.suggestion);
      }
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
