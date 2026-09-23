import { NextRequest, NextResponse } from "next/server";
import { calculateMetroFare, calculateDmrcMetroFare, estimateRideHailingFares, RideMode } from "@/lib/delhi-ncr-transit";

interface LegTrafficResult {
  distanceKm: number;
  durationMin: number;
  durationInTrafficMin: number;
  delayMin: number;
  condition: "clear" | "moderate" | "heavy";
  summaryRoad?: string;
  overviewPolyline?: string;
}

async function fetchGoogleDirectionsLeg(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  apiKey: string,
  mode: "driving" | "walking" = "driving"
): Promise<LegTrafficResult | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&mode=${mode}&departure_time=now&traffic_model=best_guess&key=${apiKey}`;
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

    return {
      distanceKm,
      durationMin: normalDurationMin,
      durationInTrafficMin,
      delayMin,
      condition,
      summaryRoad: route.summary || "",
      overviewPolyline: route.overview_polyline?.points
    };
  } catch (err) {
    console.warn("fetchGoogleDirectionsLeg error:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      origin,
      destination,
      originStation,
      destinationStation,
      passengerCount = 1,
      firstMileMode = "auto",
      lastMileMode = "auto",
      totalStops = 10
    } = body;

    if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
      return NextResponse.json({ error: "Missing origin or destination coordinates" }, { status: 400 });
    }

    const apiKey =
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    let firstMileTraffic: LegTrafficResult | null = null;
    let lastMileTraffic: LegTrafficResult | null = null;
    let directCabTraffic: LegTrafficResult | null = null;

    if (apiKey && originStation?.lat && destinationStation?.lat) {
      // Parallel fetch for Google Maps Live Traffic across all legs
      const [fmRes, lmRes, directRes] = await Promise.all([
        fetchGoogleDirectionsLeg(origin.lat, origin.lng, originStation.lat, originStation.lng, apiKey, "driving"),
        fetchGoogleDirectionsLeg(destinationStation.lat, destinationStation.lng, destination.lat, destination.lng, apiKey, "driving"),
        fetchGoogleDirectionsLeg(origin.lat, origin.lng, destination.lat, destination.lng, apiKey, "driving")
      ]);

      firstMileTraffic = fmRes;
      lastMileTraffic = lmRes;
      directCabTraffic = directRes;
    }

    // 1. First-mile calculations
    const fmDistKm = firstMileTraffic?.distanceKm || 3.5;
    // Live traffic drive time from Google Maps + 5 mins driver dispatch/arrival buffer
    const fmDriveDurationMin = (firstMileTraffic?.durationInTrafficMin || Math.max(8, Math.round(fmDistKm * 3.4) + 4)) + (firstMileMode === "walk" ? 0 : 5);
    const fmWalkDurationMin = Math.round(fmDistKm * 13);
    const fmDelayMin = firstMileTraffic?.delayMin || 0;

    const fmOptions = estimateRideHailingFares(fmDistKm, fmDriveDurationMin);
    const selectedFmMode: RideMode = (firstMileMode as RideMode) || (fmDistKm <= 0.8 ? "walk" : "auto");
    const selectedFmCost =
      selectedFmMode === "walk"
        ? 0
        : selectedFmMode === "cab"
        ? fmOptions.cab
        : selectedFmMode === "e-rickshaw" && fmOptions.eRickshaw
        ? fmOptions.eRickshaw * passengerCount
        : fmOptions.auto;

    const selectedFmDuration = selectedFmMode === "walk" ? fmWalkDurationMin : fmDriveDurationMin;

    // 2. Metro calculations
    const metroFarePerPerson = calculateMetroFare(originStation, destinationStation, totalStops || 10);
    const metroTotalFare = metroFarePerPerson * Math.max(1, passengerCount);
    // Real metro journey: in-train running + 4m station security/frisking + 3m platform headway + 3m deboard/exit = +10m buffer
    const metroTransitDuration = Math.round((totalStops || 10) * 2.4 + 10);

    // 3. Last-mile calculations
    const lmDistKm = lastMileTraffic?.distanceKm || 3.0;
    // Live traffic drive time from Google Maps + 4 mins station exit & driver pickup buffer
    const lmDriveDurationMin = (lastMileTraffic?.durationInTrafficMin || Math.max(6, Math.round(lmDistKm * 3.4) + 3)) + (lastMileMode === "walk" ? 0 : 4);
    const lmWalkDurationMin = Math.round(lmDistKm * 13);
    const lmDelayMin = lastMileTraffic?.delayMin || 0;

    const lmOptions = estimateRideHailingFares(lmDistKm, lmDriveDurationMin);
    const selectedLmMode: RideMode = (lastMileMode as RideMode) || (lmDistKm <= 0.6 ? "walk" : "auto");
    const selectedLmCost =
      selectedLmMode === "walk"
        ? 0
        : selectedLmMode === "cab"
        ? lmOptions.cab
        : selectedLmMode === "e-rickshaw" && lmOptions.eRickshaw
        ? lmOptions.eRickshaw * passengerCount
        : lmOptions.auto;

    const selectedLmDuration = selectedLmMode === "walk" ? lmWalkDurationMin : lmDriveDurationMin;

    // 4. Total Multi-modal Fare
    const totalEstimatedFareInr = selectedFmCost + metroTotalFare + selectedLmCost;
    const totalTripDurationMin = selectedFmDuration + metroTransitDuration + selectedLmDuration;

    // 5. Direct Road Cab baseline
    const directDistKm = directCabTraffic?.distanceKm || 16.0;
    const directDurationTrafficMin = directCabTraffic?.durationInTrafficMin || Math.max(35, Math.round(directDistKm * 3.8) + 8);
    const directCabFare = estimateRideHailingFares(directDistKm, directDurationTrafficMin).cab;
    const directSavingsInr = Math.max(0, directCabFare - totalEstimatedFareInr);
    const directTimeDiffMin = directDurationTrafficMin - totalTripDurationMin;

    // Overall traffic condition
    const maxDelay = Math.max(fmDelayMin, lmDelayMin, directCabTraffic?.delayMin || 0);
    let overallTrafficCondition: "clear" | "moderate" | "heavy" = "clear";
    if (maxDelay >= 5 || firstMileTraffic?.condition === "heavy" || lastMileTraffic?.condition === "heavy") {
      overallTrafficCondition = "heavy";
    } else if (maxDelay >= 2 || firstMileTraffic?.condition === "moderate" || lastMileTraffic?.condition === "moderate") {
      overallTrafficCondition = "moderate";
    }

    // Deep-links for booking
    const uberFirstMileUrl = `https://m.uber.com/ul/?action=setPickup&client_id=metronav&pickup[latitude]=${origin.lat}&pickup[longitude]=${origin.lng}&pickup[nickname]=${encodeURIComponent(origin.name || "Pickup")}&dropoff[latitude]=${originStation?.lat || origin.lat}&dropoff[longitude]=${originStation?.lng || origin.lng}&dropoff[nickname]=${encodeURIComponent((originStation?.name || "Metro") + " Station")}`;

    const uberLastMileUrl = `https://m.uber.com/ul/?action=setPickup&client_id=metronav&pickup[latitude]=${destinationStation?.lat || destination.lat}&pickup[longitude]=${destinationStation?.lng || destination.lng}&pickup[nickname]=${encodeURIComponent((destinationStation?.name || "Metro") + " Exit")}&dropoff[latitude]=${destination.lat}&dropoff[longitude]=${destination.lng}&dropoff[nickname]=${encodeURIComponent(destination.name || "Destination")}`;

    const uberDirectUrl = `https://m.uber.com/ul/?action=setPickup&client_id=metronav&pickup[latitude]=${origin.lat}&pickup[longitude]=${origin.lng}&pickup[nickname]=${encodeURIComponent(origin.name || "Pickup")}&dropoff[latitude]=${destination.lat}&dropoff[longitude]=${destination.lng}&dropoff[nickname]=${encodeURIComponent(destination.name || "Destination")}`;

    const rapidoUrl = `https://rapido.bike/`;

    return NextResponse.json({
      success: true,
      liveTraffic: {
        status: firstMileTraffic ? "live" : "estimated",
        trafficCondition: overallTrafficCondition,
        firstMileDurationMin: selectedFmDuration,
        firstMileDelayMin: fmDelayMin,
        metroDurationMin: metroTransitDuration,
        lastMileDurationMin: selectedLmDuration,
        lastMileDelayMin: lmDelayMin,
        totalDurationMin: totalTripDurationMin,
        firstMilePolyline: firstMileTraffic?.overviewPolyline,
        lastMilePolyline: lastMileTraffic?.overviewPolyline,
        directCabDurationMin: directDurationTrafficMin,
        lastUpdated: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      },
      fareBreakdown: {
        totalEstimatedFareInr,
        passengerCount: Math.max(1, passengerCount),
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
        rapidoUrl
      }
    });
  } catch (error: any) {
    console.error("Trip estimate API error:", error);
    return NextResponse.json({ error: "Failed to estimate trip", message: error?.message }, { status: 500 });
  }
}
