import { NextRequest, NextResponse } from "next/server";
import {
  calculateMetroFare,
  calculateDistance,
  estimateRideHailingFares,
  findNearestMetroStation,
  METRO_STATIONS,
  MetroStation,
  RideMode,
  TransitStepDetail,
  TravelModeChoice
} from "@/lib/delhi-ncr-transit";

interface RoadLegResult {
  distanceKm: number;
  durationMin: number;
  durationInTrafficMin: number;
  delayMin: number;
  condition: "clear" | "moderate" | "heavy";
  summaryRoad?: string;
  overviewPolyline?: string;
  steps?: { instruction: string; distanceText: string; durationText: string }[];
}

// Short TTL cache for raw Google API responses so toggling pax/ride-mode is instant
const ESTIMATE_CACHE = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 3 * 60 * 1000;

function getGoogleApiKey(): string | undefined {
  const raw =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  return raw ? raw.trim().replace(/^['"]|['"]$/g, "") : undefined;
}

function stripHtml(html: string = ""): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMetroLine(lineName: string = "", vehicleType: string = "", googleColor?: string): { name: string; color: string } {
  const lower = lineName.toLowerCase();
  if (vehicleType === "BUS" || /\bbus\b|dtc|cluster|gurugaman/i.test(lower)) {
    return { name: lineName || "City Bus", color: "#0f766e" };
  }
  if (/rapid/i.test(lower)) return { name: "Rapid Metro", color: "#0284c7" };
  if (/yellow/i.test(lower)) return { name: "Yellow", color: "#eab308" };
  if (/blue/i.test(lower)) return { name: "Blue", color: "#2563eb" };
  if (/magenta/i.test(lower)) return { name: "Magenta", color: "#db2777" };
  if (/violet/i.test(lower)) return { name: "Violet", color: "#7c3aed" };
  if (/aqua/i.test(lower)) return { name: "Aqua", color: "#06b6d4" };
  if (/airport|orange/i.test(lower)) return { name: "Airport Express", color: "#ea580c" };
  if (/pink/i.test(lower)) return { name: "Pink", color: "#ec4899" };
  if (/red/i.test(lower)) return { name: "Red", color: "#dc2626" };
  if (/green/i.test(lower)) return { name: "Green", color: "#16a34a" };
  if (/grey|gray/i.test(lower)) return { name: "Grey", color: "#6b7280" };
  return { name: lineName || "Metro", color: googleColor || "#2563eb" };
}

function matchLocalStation(name: string, lat: number, lng: number): MetroStation | undefined {
  const cleanTarget = name.toLowerCase().replace(/\bmetro\b|\bstation\b/g, "").trim();
  for (const s of Object.values(METRO_STATIONS)) {
    const cleanLocal = s.name.toLowerCase().replace(/\bmetro\b|\bstation\b|\(.*?\)/g, "").trim();
    const d = calculateDistance(lat, lng, s.lat, s.lng);
    if (d <= 0.35 || (cleanTarget.length >= 4 && cleanLocal === cleanTarget && d <= 1.0)) {
      return s;
    }
  }
  return undefined;
}

function buildStationObject(
  name: string,
  lat: number,
  lng: number,
  line: string,
  lineColor: string
): MetroStation {
  const matched = matchLocalStation(name, lat, lng);
  if (matched) {
    return {
      ...matched,
      name: name || matched.name,
      line: line || matched.line,
      lineColor: lineColor || matched.lineColor
    };
  }
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "station";
  return {
    id: `${slug}-${line.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
    name,
    line,
    lineColor,
    lat,
    lng,
    exitGates: [
      { gateNumber: 1, leadsTo: `Main Exit & Auto Stand (${name})`, tip: "Follow illuminated green Exit signs to street level." }
    ]
  };
}

async function fetchGoogleRoadDirections(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  apiKey: string,
  mode: "driving" | "walking" = "driving"
): Promise<RoadLegResult | null> {
  try {
    const url =
      `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}` +
      `&destination=${destLat},${destLng}&mode=${mode}&departure_time=now&traffic_model=best_guess&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== "OK" || !data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    const leg = route.legs?.[0];
    if (!leg) return null;

    const distanceKm = Math.round((leg.distance?.value || 0) / 100) / 10;
    const normalDurationMin = Math.max(1, Math.round((leg.duration?.value || 0) / 60));
    const durationInTrafficMin = leg.duration_in_traffic
      ? Math.max(1, Math.round(leg.duration_in_traffic.value / 60))
      : normalDurationMin;

    const delayMin = Math.max(0, durationInTrafficMin - normalDurationMin);
    let condition: "clear" | "moderate" | "heavy" = "clear";
    if (delayMin >= 5 || (normalDurationMin > 0 && durationInTrafficMin / normalDurationMin >= 1.35)) {
      condition = "heavy";
    } else if (delayMin >= 2 || (normalDurationMin > 0 && durationInTrafficMin / normalDurationMin >= 1.15)) {
      condition = "moderate";
    }

    const steps = (leg.steps || []).slice(0, 12).map((s: any) => ({
      instruction: stripHtml(s.html_instructions),
      distanceText: s.distance?.text || "",
      durationText: s.duration?.text || ""
    }));

    return {
      distanceKm,
      durationMin: normalDurationMin,
      durationInTrafficMin,
      delayMin,
      condition,
      summaryRoad: route.summary || "",
      overviewPolyline: route.overview_polyline?.points,
      steps
    };
  } catch (err) {
    console.warn("fetchGoogleRoadDirections error:", err);
    return null;
  }
}

async function fetchGoogleTransitDirections(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  apiKey: string,
  subwayOnly: boolean
): Promise<any | null> {
  try {
    const modeFilter = subwayOnly ? "&transit_mode=subway" : "";
    const url =
      `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}` +
      `&destination=${destLat},${destLng}&mode=transit${modeFilter}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== "OK" || !data.routes?.length) return null;
    return data.routes[0];
  } catch (err) {
    console.warn("fetchGoogleTransitDirections error:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      origin,
      destination,
      originStation,
      destinationStation,
      passengerCount = 1,
      firstMileMode,
      lastMileMode,
      travelMode = "multimodal",
      totalStops = 10
    } = body as {
      origin: { name?: string; lat: number; lng: number };
      destination: { name?: string; lat: number; lng: number; category?: string };
      originStation?: MetroStation;
      destinationStation?: MetroStation;
      passengerCount?: number;
      firstMileMode?: RideMode;
      lastMileMode?: RideMode;
      travelMode?: TravelModeChoice;
      totalStops?: number;
    };

    if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
      return NextResponse.json({ error: "Missing origin or destination coordinates" }, { status: 400 });
    }

    const apiKey = getGoogleApiKey();
    const pax = Math.max(1, passengerCount);
    const straightDistKm = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);

    const routeCacheKey = [
      origin.lat.toFixed(4),
      origin.lng.toFixed(4),
      destination.lat.toFixed(4),
      destination.lng.toFixed(4),
      travelMode
    ].join(":");

    let cachedGoogleBundle = ESTIMATE_CACHE.get(routeCacheKey);
    if (cachedGoogleBundle && Date.now() - cachedGoogleBundle.timestamp >= CACHE_TTL_MS) {
      cachedGoogleBundle = undefined;
      ESTIMATE_CACHE.delete(routeCacheKey);
    }

    let googleBundle = cachedGoogleBundle?.data;

    if (!googleBundle && apiKey) {
      // Phase 1: Parallel direct driving + walking (if short or requested) + Google Transit (subway + all-transit fallback)
      const shouldFetchWalk = straightDistKm <= 4.0 || travelMode === "walking";
      const [directDrive, walkDrive, subwayRoute, allTransitRoute] = await Promise.all([
        fetchGoogleRoadDirections(origin.lat, origin.lng, destination.lat, destination.lng, apiKey, "driving"),
        shouldFetchWalk
          ? fetchGoogleRoadDirections(origin.lat, origin.lng, destination.lat, destination.lng, apiKey, "walking")
          : Promise.resolve(null),
        travelMode === "driving" || travelMode === "walking"
          ? Promise.resolve(null)
          : fetchGoogleTransitDirections(origin.lat, origin.lng, destination.lat, destination.lng, apiKey, true),
        travelMode === "transit"
          ? fetchGoogleTransitDirections(origin.lat, origin.lng, destination.lat, destination.lng, apiKey, false)
          : Promise.resolve(null)
      ]);

      // If in multimodal and subwayRoute didn't find anything (e.g. Greater Noida/outer belt), check unrestricted transit once
      let chosenTransitRoute = travelMode === "transit" ? allTransitRoute || subwayRoute : subwayRoute;
      if (!chosenTransitRoute && travelMode === "multimodal" && straightDistKm >= 1.2) {
        chosenTransitRoute = await fetchGoogleTransitDirections(
          origin.lat,
          origin.lng,
          destination.lat,
          destination.lng,
          apiKey,
          false
        );
      }

      // Extract real transit legs from chosenTransitRoute
      const transitLegStepsRaw: any[] = [];
      const allStepsDetailed: TransitStepDetail[] = [];
      const walkPolylines: string[] = [];

      const routeLeg = chosenTransitRoute?.legs?.[0];
      if (routeLeg?.steps) {
        for (const s of routeLeg.steps) {
          if (s.travel_mode === "TRANSIT" && s.transit_details) {
            const td = s.transit_details;
            const vehicleType = td.line?.vehicle?.type || "SUBWAY";
            const rawLineName = td.line?.short_name || td.line?.name || "Metro";
            const norm = normalizeMetroLine(rawLineName, vehicleType, td.line?.color);
            const fromName = td.departure_stop?.name || "Boarding Stop";
            const toName = td.arrival_stop?.name || "Arrival Stop";
            const headsign = td.headsign || toName;
            const stops = typeof td.num_stops === "number" ? td.num_stops : 2;
            const poly = s.polyline?.points;

            const stepDetail: TransitStepDetail = {
              mode: "TRANSIT",
              instruction: `${norm.name} from ${fromName} to ${toName} (towards ${headsign})`,
              lineName: norm.name,
              lineColor: norm.color,
              vehicleType,
              from: fromName,
              to: toName,
              headsign,
              stopsCount: stops,
              distanceText: s.distance?.text || "",
              durationText: s.duration?.text || "",
              polyline: poly
            };
            allStepsDetailed.push(stepDetail);

            // In multimodal mode prefer rail/subway segments unless there are none
            transitLegStepsRaw.push({
              ...stepDetail,
              rawVehicleType: vehicleType,
              fromLat: td.departure_stop?.location?.lat,
              fromLng: td.departure_stop?.location?.lng,
              toLat: td.arrival_stop?.location?.lat,
              toLng: td.arrival_stop?.location?.lng,
              durationMin: Math.max(1, Math.round((s.duration?.value || 0) / 60))
            });
          } else if (s.travel_mode === "WALKING") {
            if (s.polyline?.points) walkPolylines.push(s.polyline.points);
            allStepsDetailed.push({
              mode: "WALKING",
              instruction: stripHtml(s.html_instructions) || `Walk ${s.distance?.text || ""}`,
              distanceText: s.distance?.text || "",
              durationText: s.duration?.text || "",
              polyline: s.polyline?.points
            });
          }
        }
      }

      // Filter pure subway steps when in multimodal if mixed with feeder buses
      const subwayStepsOnly = transitLegStepsRaw.filter((t) =>
        ["SUBWAY", "HEAVY_RAIL", "MONORAIL", "TRAM", "COMMUTER_TRAIN"].includes(t.rawVehicleType)
      );
      const activeTransitSteps =
        travelMode === "multimodal" && subwayStepsOnly.length > 0 ? subwayStepsOnly : transitLegStepsRaw;

      let resolvedBoardStation: MetroStation | undefined = originStation;
      let resolvedDeboardStation: MetroStation | undefined = destinationStation;

      if (activeTransitSteps.length > 0) {
        const firstSeg = activeTransitSteps[0];
        const lastSeg = activeTransitSteps[activeTransitSteps.length - 1];
        if (typeof firstSeg.fromLat === "number" && typeof firstSeg.fromLng === "number") {
          resolvedBoardStation = buildStationObject(
            firstSeg.from,
            firstSeg.fromLat,
            firstSeg.fromLng,
            firstSeg.lineName,
            firstSeg.lineColor
          );
        }
        if (typeof lastSeg.toLat === "number" && typeof lastSeg.toLng === "number") {
          resolvedDeboardStation = buildStationObject(
            lastSeg.to,
            lastSeg.toLat,
            lastSeg.toLng,
            lastSeg.lineName,
            lastSeg.lineColor
          );
        }
      } else {
        resolvedBoardStation = originStation || findNearestMetroStation(origin.lat, origin.lng).station;
        resolvedDeboardStation = destinationStation || findNearestMetroStation(destination.lat, destination.lng).station;
      }

      // Phase 2: Exact first-mile and last-mile road directions using the actual boarding/deboarding station coordinates
      let firstMileDrive: RoadLegResult | null = null;
      let lastMileDrive: RoadLegResult | null = null;

      if (resolvedBoardStation?.lat && resolvedDeboardStation?.lat && activeTransitSteps.length > 0) {
        const fmStraight = calculateDistance(origin.lat, origin.lng, resolvedBoardStation.lat, resolvedBoardStation.lng);
        const lmStraight = calculateDistance(resolvedDeboardStation.lat, resolvedDeboardStation.lng, destination.lat, destination.lng);

        const [fmRes, lmRes] = await Promise.all([
          fmStraight >= 0.08
            ? fetchGoogleRoadDirections(origin.lat, origin.lng, resolvedBoardStation.lat, resolvedBoardStation.lng, apiKey, "driving")
            : Promise.resolve(null),
          lmStraight >= 0.08
            ? fetchGoogleRoadDirections(resolvedDeboardStation.lat, resolvedDeboardStation.lng, destination.lat, destination.lng, apiKey, "driving")
            : Promise.resolve(null)
        ]);
        firstMileDrive = fmRes;
        lastMileDrive = lmRes;
      } else if (originStation?.lat && destinationStation?.lat) {
        const [fmRes, lmRes] = await Promise.all([
          fetchGoogleRoadDirections(origin.lat, origin.lng, originStation.lat, originStation.lng, apiKey, "driving"),
          fetchGoogleRoadDirections(destinationStation.lat, destinationStation.lng, destination.lat, destination.lng, apiKey, "driving")
        ]);
        firstMileDrive = fmRes;
        lastMileDrive = lmRes;
      }

      googleBundle = {
        directDrive,
        walkDrive,
        chosenTransitRoute,
        allStepsDetailed,
        walkPolylines,
        activeTransitSteps,
        resolvedBoardStation,
        resolvedDeboardStation,
        firstMileDrive,
        lastMileDrive,
        googleFareInr:
          typeof chosenTransitRoute?.fare?.value === "number" &&
          chosenTransitRoute.fare.value >= 10 &&
          chosenTransitRoute.fare.value <= 200
            ? Math.round(chosenTransitRoute.fare.value)
            : undefined,
        transitOverviewPolyline: chosenTransitRoute?.overview_polyline?.points,
        transitDurationSec: chosenTransitRoute?.legs?.[0]?.duration?.value
      };

      ESTIMATE_CACHE.set(routeCacheKey, { timestamp: Date.now(), data: googleBundle });
    }

    const boardStation: MetroStation =
      googleBundle?.resolvedBoardStation || originStation || findNearestMetroStation(origin.lat, origin.lng).station;
    const deboardStation: MetroStation =
      googleBundle?.resolvedDeboardStation || destinationStation || findNearestMetroStation(destination.lat, destination.lng).station;

    const firstMileDrive: RoadLegResult | null = googleBundle?.firstMileDrive || null;
    const lastMileDrive: RoadLegResult | null = googleBundle?.lastMileDrive || null;
    const directDrive: RoadLegResult | null = googleBundle?.directDrive || null;
    const walkDrive: RoadLegResult | null = googleBundle?.walkDrive || null;

    const activeTransitSteps: any[] = googleBundle?.activeTransitSteps || [];
    const hasLiveTransit = activeTransitSteps.length > 0 && straightDistKm >= 0.9;
    const isDirectRoadRecommended =
      travelMode === "driving" || travelMode === "walking" || !hasLiveTransit || straightDistKm < 1.2;

    // 1. First-mile calculations
    const fmStraightKm = calculateDistance(origin.lat, origin.lng, boardStation.lat, boardStation.lng);
    const fmDistKm = firstMileDrive?.distanceKm ?? Math.max(0.1, fmStraightKm);
    const fmWalkDurationMin = Math.max(1, Math.round(fmDistKm * 13));
    const fmDriveDurationMin =
      firstMileDrive
        ? firstMileDrive.durationInTrafficMin + (fmDistKm <= 0.35 ? 2 : 4)
        : Math.max(6, Math.round(fmDistKm * 3.4) + 4);
    const fmDelayMin = firstMileDrive?.delayMin || 0;

    const fmOptions = estimateRideHailingFares(fmDistKm, fmDriveDurationMin);
    const selectedFmMode: RideMode =
      (firstMileMode as RideMode) || (fmDistKm <= 0.7 ? "walk" : "auto");
    const selectedFmCost =
      selectedFmMode === "walk"
        ? 0
        : selectedFmMode === "cab"
        ? fmOptions.cab
        : selectedFmMode === "e-rickshaw" && fmOptions.eRickshaw
        ? fmOptions.eRickshaw * pax
        : fmOptions.auto;
    const selectedFmDuration = selectedFmMode === "walk" ? fmWalkDurationMin : fmDriveDurationMin;

    // 2. Metro / Transit Leg
    const parsedLines = activeTransitSteps.map((seg: any) => ({
      line: seg.lineName,
      lineColor: seg.lineColor,
      from: seg.from,
      to: seg.to,
      direction: seg.headsign ? `Towards ${seg.headsign}` : `Towards ${seg.to}`,
      stopsCount: seg.stopsCount || 2,
      polyline: seg.polyline,
      vehicleType: seg.rawVehicleType,
      fromLat: seg.fromLat,
      fromLng: seg.fromLng,
      toLat: seg.toLat,
      toLng: seg.toLng
    }));

    const computedTotalStops =
      parsedLines.length > 0
        ? parsedLines.reduce((acc: number, l: any) => acc + (l.stopsCount || 1), 0)
        : totalStops || 10;

    const requiresTransfer = parsedLines.length > 1;
    const transferStations: MetroStation[] = [];
    if (requiresTransfer) {
      for (let i = 0; i < activeTransitSteps.length - 1; i++) {
        const seg = activeTransitSteps[i];
        const nextSeg = activeTransitSteps[i + 1];
        if (typeof seg.toLat === "number" && typeof seg.toLng === "number") {
          transferStations.push(
            buildStationObject(seg.to, seg.toLat, seg.toLng, nextSeg.lineName, nextSeg.lineColor)
          );
        }
      }
    }

    const transferInstruction = requiresTransfer
      ? parsedLines
          .slice(0, -1)
          .map(
            (seg: any, idx: number) =>
              `${parsedLines.length > 2 ? `${idx + 1}. ` : ""}Change at ${seg.to} (${seg.line} -> ${parsedLines[idx + 1].line}) — follow overhead interchange signs.`
          )
          .join(" ")
      : undefined;

    const transitInTrainMin =
      activeTransitSteps.length > 0
        ? activeTransitSteps.reduce((acc: number, s: any) => acc + (s.durationMin || 2), 0) +
          (requiresTransfer ? (parsedLines.length - 1) * 5 : 0) +
          6
        : Math.round(computedTotalStops * 2.4 + 10);

    const metroFarePerPerson =
      googleBundle?.googleFareInr || calculateMetroFare(boardStation, deboardStation, computedTotalStops);
    const metroTotalFare = isDirectRoadRecommended ? 0 : metroFarePerPerson * pax;

    // 3. Last-mile calculations
    const lmStraightKm = calculateDistance(deboardStation.lat, deboardStation.lng, destination.lat, destination.lng);
    const lmDistKm = lastMileDrive?.distanceKm ?? Math.max(0.1, lmStraightKm);
    const lmWalkDurationMin = Math.max(1, Math.round(lmDistKm * 13));
    const lmDriveDurationMin =
      lastMileDrive
        ? lastMileDrive.durationInTrafficMin + (lmDistKm <= 0.35 ? 2 : 4)
        : Math.max(6, Math.round(lmDistKm * 3.4) + 3);
    const lmDelayMin = lastMileDrive?.delayMin || 0;

    const lmOptions = estimateRideHailingFares(lmDistKm, lmDriveDurationMin);
    const selectedLmMode: RideMode =
      (lastMileMode as RideMode) || (lmDistKm <= 0.6 ? "walk" : "auto");
    const selectedLmCost =
      selectedLmMode === "walk"
        ? 0
        : selectedLmMode === "cab"
        ? lmOptions.cab
        : selectedLmMode === "e-rickshaw" && lmOptions.eRickshaw
        ? lmOptions.eRickshaw * pax
        : lmOptions.auto;
    const selectedLmDuration = selectedLmMode === "walk" ? lmWalkDurationMin : lmDriveDurationMin;

    // 4. Direct Cab & Walking Baseline
    const directDistKm = directDrive?.distanceKm ?? Math.round(straightDistKm * 1.35 * 10) / 10;
    const directDurationTrafficMin =
      directDrive?.durationInTrafficMin ?? Math.max(10, Math.round(directDistKm * 3.5) + 5);
    const directFares = estimateRideHailingFares(directDistKm, directDurationTrafficMin);
    const directCabFare = directFares.cab;
    const walkOnlyDurationMin = walkDrive?.durationMin ?? Math.max(2, Math.round(directDistKm * 13));

    // 5. Totals depending on active Travel Mode
    let totalEstimatedFareInr = selectedFmCost + metroTotalFare + selectedLmCost;
    let totalTripDurationMin = selectedFmDuration + transitInTrainMin + selectedLmDuration;

    if (travelMode === "driving") {
      totalEstimatedFareInr = directCabFare;
      totalTripDurationMin = directDurationTrafficMin;
    } else if (travelMode === "walking") {
      totalEstimatedFareInr = 0;
      totalTripDurationMin = walkOnlyDurationMin;
    } else if (!hasLiveTransit) {
      totalEstimatedFareInr = straightDistKm < 1.0 ? 0 : directFares.auto;
      totalTripDurationMin = straightDistKm < 1.0 ? walkOnlyDurationMin : directDurationTrafficMin;
    }

    const directSavingsInr = Math.max(0, directCabFare - totalEstimatedFareInr);
    const directTimeDiffMin = directDurationTrafficMin - totalTripDurationMin;

    // Traffic condition
    const maxDelay = Math.max(fmDelayMin, lmDelayMin, directDrive?.delayMin || 0);
    let overallTrafficCondition: "clear" | "moderate" | "heavy" = "clear";
    if (maxDelay >= 5 || firstMileDrive?.condition === "heavy" || lastMileDrive?.condition === "heavy" || directDrive?.condition === "heavy") {
      overallTrafficCondition = "heavy";
    } else if (maxDelay >= 2 || firstMileDrive?.condition === "moderate" || lastMileDrive?.condition === "moderate" || directDrive?.condition === "moderate") {
      overallTrafficCondition = "moderate";
    }

    // Deep links
    const uberFirstMileUrl = `https://m.uber.com/ul/?action=setPickup&client_id=metronav&pickup[latitude]=${origin.lat}&pickup[longitude]=${origin.lng}&pickup[nickname]=${encodeURIComponent(origin.name || "Pickup")}&dropoff[latitude]=${boardStation.lat}&dropoff[longitude]=${boardStation.lng}&dropoff[nickname]=${encodeURIComponent(boardStation.name)}`;
    const uberLastMileUrl = `https://m.uber.com/ul/?action=setPickup&client_id=metronav&pickup[latitude]=${deboardStation.lat}&pickup[longitude]=${deboardStation.lng}&pickup[nickname]=${encodeURIComponent(deboardStation.name)}&dropoff[latitude]=${destination.lat}&dropoff[longitude]=${destination.lng}&dropoff[nickname]=${encodeURIComponent(destination.name || "Destination")}`;
    const uberDirectUrl = `https://m.uber.com/ul/?action=setPickup&client_id=metronav&pickup[latitude]=${origin.lat}&pickup[longitude]=${origin.lng}&pickup[nickname]=${encodeURIComponent(origin.name || "Pickup")}&dropoff[latitude]=${destination.lat}&dropoff[longitude]=${destination.lng}&dropoff[nickname]=${encodeURIComponent(destination.name || "Destination")}`;
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=${travelMode === "driving" ? "driving" : travelMode === "walking" ? "walking" : "transit"}`;

    return NextResponse.json({
      success: true,
      dataSource: directDrive || googleBundle?.chosenTransitRoute ? "google-live" : "local-fallback",
      travelMode,
      isDirectRoadRecommended,
      resolvedRoute: {
        originStation: boardStation,
        destinationStation: deboardStation,
        firstMile: {
          mode: selectedFmMode,
          distanceKm: fmDistKm,
          durationMin: selectedFmDuration,
          estimatedCostInr: selectedFmCost,
          instructions:
            selectedFmMode === "walk"
              ? `Walk ${fmDistKm} km from ${origin.name || "Origin"} to ${boardStation.name}.`
              : `Take a ${selectedFmMode} (${fmDistKm} km, ~${selectedFmDuration} min in live traffic) from ${origin.name || "Origin"} to ${boardStation.name}.`,
          antiAnxietyTip:
            selectedFmMode === "walk"
              ? "Follow pedestrian signs to the station concourse entry & security scanner."
              : "Book via Uber/Rapido using the station name above so no verbal negotiation is needed."
        },
        metroLeg: parsedLines.length > 0
          ? {
              boardStation,
              deboardStation,
              requiresTransfer,
              transferStation: transferStations[0],
              transferStations,
              lines: parsedLines,
              totalStops: computedTotalStops,
              totalDurationMin: transitInTrainMin,
              estimatedFareInr: metroFarePerPerson,
              transferInstruction
            }
          : undefined,
        metroExit: {
          gateNumber: deboardStation.exitGates?.[0]?.gateNumber || 1,
          leadsTo: deboardStation.exitGates?.[0]?.leadsTo || `Towards ${destination.name || "Destination"}`,
          signageTip: deboardStation.exitGates?.[0]?.tip || `Follow overhead illuminated signs towards ${destination.name || "Street Exit"}.`
        },
        lastMile: {
          distanceKm: lmDistKm,
          options: [
            {
              mode: selectedLmMode,
              durationMin: selectedLmDuration,
              estimatedCostInr: selectedLmCost,
              description:
                selectedLmMode === "walk"
                  ? `Walk ${lmDistKm} km directly from ${deboardStation.name} to ${destination.name || "Destination"}.`
                  : `Take a ${selectedLmMode} (${lmDistKm} km, ~${selectedLmDuration} min) from ${deboardStation.name} to ${destination.name || "Destination"}.`
            }
          ],
          exactInstructions:
            selectedLmMode === "walk"
              ? `Exit ${deboardStation.name} and walk ${lmDistKm} km directly to ${destination.name || "your destination"}.`
              : `Deboard at ${deboardStation.name} and take a quick ${selectedLmMode} (${lmDistKm} km) directly to ${destination.name || "your destination"}.`,
          antiAnxietyTip: `Book your ${selectedLmMode === "walk" ? "walk navigation" : "last-mile ride"} right as the train arrives at ${deboardStation.name}.`
        },
        directSteps: directDrive?.steps || walkDrive?.steps || [],
        transitSteps: googleBundle?.allStepsDetailed || []
      },
      liveTraffic: {
        status: directDrive || firstMileDrive || googleBundle?.chosenTransitRoute ? "live" : "estimated",
        trafficCondition: overallTrafficCondition,
        firstMileDurationMin: selectedFmDuration,
        firstMileDelayMin: fmDelayMin,
        metroDurationMin: transitInTrainMin,
        lastMileDurationMin: selectedLmDuration,
        lastMileDelayMin: lmDelayMin,
        totalDurationMin: totalTripDurationMin,
        firstMilePolyline: firstMileDrive?.overviewPolyline,
        lastMilePolyline: lastMileDrive?.overviewPolyline,
        transitPolyline: googleBundle?.transitOverviewPolyline,
        walkPolylines: googleBundle?.walkPolylines,
        directPolyline: travelMode === "walking" ? walkDrive?.overviewPolyline || directDrive?.overviewPolyline : directDrive?.overviewPolyline,
        directDistanceKm: directDistKm,
        directCabDurationMin: directDurationTrafficMin,
        summaryRoad: directDrive?.summaryRoad || "",
        lastUpdated: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      },
      fareBreakdown: {
        totalEstimatedFareInr,
        passengerCount: pax,
        firstMileMode: selectedFmMode,
        firstMileCostInr: selectedFmCost,
        metroFarePerPersonInr: metroFarePerPerson,
        metroTotalFareInr: metroTotalFare,
        lastMileMode: selectedLmMode,
        lastMileCostInr: selectedLmCost,
        firstMileOptions: {
          cab: fmOptions.cab,
          auto: fmOptions.auto,
          bike: fmOptions.bike,
          eRickshaw: fmOptions.eRickshaw,
          walk: 0
        },
        lastMileOptions: {
          cab: lmOptions.cab,
          auto: lmOptions.auto,
          bike: lmOptions.bike,
          eRickshaw: lmOptions.eRickshaw,
          walk: 0
        },
        directCabComparison: {
          estimatedCostInr: directCabFare,
          durationMin: directDurationTrafficMin,
          savingsInr: directSavingsInr,
          timeDiffMin: directTimeDiffMin
        }
      },
      deepLinks: {
        uberFirstMileUrl,
        uberLastMileUrl,
        uberDirectUrl,
        rapidoUrl: "https://rapido.bike/",
        googleMapsUrl
      }
    });
  } catch (error: any) {
    console.error("Trip estimate API error:", error);
    return NextResponse.json({ error: "Failed to estimate trip", message: error?.message }, { status: 500 });
  }
}
