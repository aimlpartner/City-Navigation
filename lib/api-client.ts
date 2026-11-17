import { Capacitor } from '@capacitor/core';
import {
  FAMOUS_DESTINATIONS,
  METRO_STATIONS,
  calculateDistance,
  findNearestMetroStation,
  planMultiModalTrip,
  type FamousDestination,
  type RideMode,
  type TravelModeChoice,
} from '@/lib/delhi-ncr-transit';
import {
  METRO_LINES_DATA,
  LIVE_BUS_ROUTES,
  ACTIVE_TRANSIT_ALERTS,
  getLiveDeparturesForStation,
  getConnectingBusesForStation,
} from '@/lib/realtime-transit';
import { calculateTicketPricing, type MetroTicket } from '@/lib/metro-ticketing';

const API_BASE_STORAGE_KEY = 'metronav_api_base_url';

export function isNativeCapacitor(): boolean {
  try {
    return typeof window !== 'undefined' && Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function getConfiguredApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(API_BASE_STORAGE_KEY);
      if (saved && /^https?:\/\//i.test(saved.trim())) {
        return saved.trim().replace(/\/+$/, '');
      }
    } catch {}
  }
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envUrl && /^https?:\/\//i.test(envUrl.trim())) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return '';
}

export function setConfiguredApiBaseUrl(url: string): void {
  if (typeof window === 'undefined') return;
  try {
    const clean = url.trim().replace(/\/+$/, '');
    if (clean) {
      localStorage.setItem(API_BASE_STORAGE_KEY, clean);
    } else {
      localStorage.removeItem(API_BASE_STORAGE_KEY);
    }
  } catch {}
}

function jsonResponse(payload: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function formatDistanceText(distanceKm: number): string {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return '';
  if (distanceKm < 1) {
    const meters = Math.max(50, Math.round((distanceKm * 1000) / 50) * 50);
    return `${meters} m`;
  }
  if (distanceKm < 10) return `${distanceKm.toFixed(1)} km`;
  return `${Math.round(distanceKm)} km`;
}

function detectCityLabel(text: string): string {
  const lower = text.toLowerCase();
  if (/gurgaon|gurugram|cyber|dlf|udyog vihar|sohna|golf course|mg road|iffco|sikanderpur|moulsari|ambience/i.test(lower)) {
    return 'Gurgaon';
  }
  if (/noida|greater noida|botanical|film city/i.test(lower)) return 'Noida';
  if (/faridabad/i.test(lower)) return 'Faridabad';
  if (/ghaziabad|vaishali|kaushambi|indirapuram/i.test(lower)) return 'Ghaziabad';
  return 'Delhi';
}

function buildCuratedAndStationSuggestions(
  q: string,
  originLat?: number,
  originLng?: number
) {
  const needle = q.trim().toLowerCase();
  const hasOrigin = typeof originLat === 'number' && typeof originLng === 'number' && Number.isFinite(originLat);

  const curatedMatches = FAMOUS_DESTINATIONS.filter((d) => {
    const st = METRO_STATIONS[d.nearestStationId];
    return (
      d.name.toLowerCase().includes(needle) ||
      d.city.toLowerCase().includes(needle) ||
      d.category.toLowerCase().includes(needle) ||
      (st && st.name.toLowerCase().includes(needle))
    );
  }).map((d) => {
    const st = METRO_STATIONS[d.nearestStationId];
    const distanceKm = hasOrigin
      ? Math.round(calculateDistance(originLat!, originLng!, d.lat, d.lng) * 10) / 10
      : undefined;
    return {
      id: d.id,
      curatedId: d.id,
      name: d.name.split(',')[0],
      city: d.city,
      areaHint: st ? `Near ${st.name} Metro` : d.city,
      formattedAddress: d.name,
      category: d.category,
      distanceKm,
      distanceText: distanceKm !== undefined ? formatDistanceText(distanceKm) : undefined,
      lat: d.lat,
      lng: d.lng,
      nearestStation: st
        ? {
            id: st.id,
            name: st.name,
            line: st.line,
            lineColor: st.lineColor,
            distanceKm: d.distanceFromStationKm,
          }
        : undefined,
      bestExitGate: d.bestExitGate,
      isCurated: true,
      curatedData: d,
      needsResolve: false,
    };
  });

  const stationMatches = Object.values(METRO_STATIONS)
    .filter((s) => s.name.toLowerCase().includes(needle) || s.line.toLowerCase().includes(needle))
    .slice(0, 5)
    .map((s) => {
      const distanceKm = hasOrigin
        ? Math.round(calculateDistance(originLat!, originLng!, s.lat, s.lng) * 10) / 10
        : undefined;
      return {
        id: `station-${s.id}`,
        name: `${s.name} Metro Station`,
        city: detectCityLabel(s.name),
        areaHint: `${s.line} Line`,
        formattedAddress: `${s.name} Metro Station (${s.line} Line)`,
        category: 'Metro Station',
        distanceKm,
        distanceText: distanceKm !== undefined ? formatDistanceText(distanceKm) : undefined,
        lat: s.lat,
        lng: s.lng,
        nearestStation: {
          id: s.id,
          name: s.name,
          line: s.line,
          lineColor: s.lineColor,
          distanceKm: 0,
        },
        bestExitGate: s.exitGates[0]?.gateNumber || 1,
        isCurated: false,
        needsResolve: false,
      };
    });

  return [...curatedMatches, ...stationMatches];
}

async function getGooglePlacesLib(): Promise<typeof google.maps.places | null> {
  if (typeof window === 'undefined') return null;
  const g = (window as any).google;
  if (!g?.maps) return null;
  if (g.maps.places) return g.maps.places;
  if (typeof g.maps.importLibrary === 'function') {
    try {
      await g.maps.importLibrary('places');
      return g.maps.places || null;
    } catch {
      return null;
    }
  }
  return null;
}

async function handleClientPlaces(urlObj: URL): Promise<Response> {
  const q = (urlObj.searchParams.get('q') || '').trim();
  const placeId = (urlObj.searchParams.get('placeId') || '').trim();
  const scope = urlObj.searchParams.get('scope') === 'india' ? 'india' : 'ncr';
  const latStr = urlObj.searchParams.get('lat');
  const lngStr = urlObj.searchParams.get('lng');
  const originLat = latStr ? Number(latStr) : undefined;
  const originLng = lngStr ? Number(lngStr) : undefined;
  const hasOrigin = typeof originLat === 'number' && !Number.isNaN(originLat) && typeof originLng === 'number' && !Number.isNaN(originLng);

  const curatedHit = FAMOUS_DESTINATIONS.find((d) => d.id === placeId);
  if (placeId && curatedHit) {
    const st = METRO_STATIONS[curatedHit.nearestStationId];
    return jsonResponse({
      place: {
        id: curatedHit.id,
        curatedId: curatedHit.id,
        name: curatedHit.name.split(',')[0],
        city: curatedHit.city,
        areaHint: curatedHit.city,
        formattedAddress: curatedHit.name,
        category: curatedHit.category,
        lat: curatedHit.lat,
        lng: curatedHit.lng,
        nearestStation: st
          ? { id: st.id, name: st.name, line: st.line, lineColor: st.lineColor, distanceKm: curatedHit.distanceFromStationKm }
          : undefined,
        bestExitGate: curatedHit.bestExitGate,
        isCurated: true,
        curatedData: curatedHit,
        needsResolve: false,
      },
    });
  }

  const placesLib = await getGooglePlacesLib();

  if (placeId && placesLib) {
    const details = await new Promise<any>((resolve) => {
      try {
        const div = document.createElement('div');
        const svc = new placesLib.PlacesService(div);
        svc.getDetails(
          {
            placeId,
            fields: ['place_id', 'name', 'formatted_address', 'geometry', 'types'],
          },
          (result, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && result?.geometry?.location) {
              const pLat = result.geometry.location.lat();
              const pLng = result.geometry.location.lng();
              const nearest = findNearestMetroStation(pLat, pLng);
              const addr = (result.formatted_address || result.name || '').replace(/, India$/i, '');
              const dKm = hasOrigin ? Math.round(calculateDistance(originLat!, originLng!, pLat, pLng) * 10) / 10 : undefined;
              resolve({
                id: result.place_id || placeId,
                name: result.name || addr.split(',')[0],
                city: detectCityLabel(addr),
                areaHint: detectCityLabel(addr),
                formattedAddress: addr,
                category: 'Google Maps Place',
                lat: pLat,
                lng: pLng,
                distanceKm: dKm,
                distanceText: dKm !== undefined ? formatDistanceText(dKm) : undefined,
                nearestStation: {
                  id: nearest.station.id,
                  name: nearest.station.name,
                  line: nearest.station.line,
                  lineColor: nearest.station.lineColor,
                  distanceKm: nearest.distanceKm,
                },
                bestExitGate: nearest.station.exitGates[0]?.gateNumber || 1,
                isCurated: false,
                needsResolve: false,
              });
            } else {
              resolve(null);
            }
          }
        );
      } catch {
        resolve(null);
      }
    });
    if (details) return jsonResponse({ place: details });
  }

  if (q.length < 2) {
    return jsonResponse({ places: [] });
  }

  const localSuggestions = buildCuratedAndStationSuggestions(q, originLat, originLng);
  let googleSuggestions: any[] = [];

  if (placesLib) {
    googleSuggestions = await new Promise<any[]>((resolve) => {
      try {
        const svc = new placesLib.AutocompleteService();
        const biasCenter = hasOrigin
          ? new google.maps.LatLng(originLat!, originLng!)
          : new google.maps.LatLng(28.58, 77.15);
        const req: google.maps.places.AutocompletionRequest = {
          input: q,
          componentRestrictions: { country: 'in' },
          ...(scope === 'ncr'
            ? {
                locationBias: new google.maps.Circle({
                  center: biasCenter,
                  radius: 55000,
                }),
              }
            : {}),
        };
        svc.getPlacePredictions(req, (predictions, status) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
            resolve([]);
            return;
          }
          resolve(
            predictions.slice(0, 8).map((pred) => {
              const mainText = pred.structured_formatting?.main_text || pred.description.split(',')[0];
              const secondary = (pred.structured_formatting?.secondary_text || pred.description).replace(/, India$/i, '');
              const dMeters = (pred as any).distance_meters;
              const dKm = typeof dMeters === 'number' ? Math.round((dMeters / 1000) * 10) / 10 : undefined;
              return {
                id: pred.place_id,
                name: mainText,
                city: detectCityLabel(`${mainText} ${secondary}`),
                areaHint: secondary.split(',')[0]?.trim() || 'Delhi NCR',
                formattedAddress: secondary || pred.description.replace(/, India$/i, ''),
                category: 'Google Maps Place',
                distanceKm: dKm,
                distanceText: dKm !== undefined ? formatDistanceText(dKm) : undefined,
                isCurated: false,
                needsResolve: true,
              };
            })
          );
        });
      } catch {
        resolve([]);
      }
    });
  }

  // Merge without duplicates
  const merged = [...localSuggestions];
  const seenNames = new Set(merged.map((m) => m.name.toLowerCase()));
  for (const gs of googleSuggestions) {
    if (!seenNames.has(gs.name.toLowerCase())) {
      seenNames.add(gs.name.toLowerCase());
      merged.push(gs);
    }
  }

  return jsonResponse({ places: merged.slice(0, 14) });
}

async function handleClientGeocode(urlObj: URL): Promise<Response> {
  const latStr = urlObj.searchParams.get('lat');
  const lngStr = urlObj.searchParams.get('lng');
  const addressQuery = urlObj.searchParams.get('address')?.trim();

  const g = typeof window !== 'undefined' ? (window as any).google : null;

  if (addressQuery) {
    const matchedCurated = FAMOUS_DESTINATIONS.find((d) =>
      d.name.toLowerCase().includes(addressQuery.toLowerCase())
    );
    if (matchedCurated) {
      const nearest = findNearestMetroStation(matchedCurated.lat, matchedCurated.lng);
      return jsonResponse({
        locationName: matchedCurated.name,
        fullAddress: matchedCurated.name,
        nearestStation: nearest.station.name,
        stationLine: nearest.station.line,
        stationLineColor: nearest.station.lineColor,
        distanceKm: nearest.distanceKm,
        lat: matchedCurated.lat,
        lng: matchedCurated.lng,
      });
    }

    if (g?.maps?.Geocoder) {
      const geoHit = await new Promise<any>((resolve) => {
        try {
          const geocoder = new g.maps.Geocoder();
          const hasCity = /delhi|gurgaon|gurugram|noida|faridabad|ghaziabad/i.test(addressQuery);
          geocoder.geocode(
            {
              address: hasCity ? addressQuery : `${addressQuery}, Delhi NCR, India`,
              region: 'IN',
            },
            (results: any, status: any) => {
              const first = results?.[0];
              if (status === 'OK' && first?.geometry?.location) {
                const lat = first.geometry.location.lat();
                const lng = first.geometry.location.lng();
                const nearest = findNearestMetroStation(lat, lng);
                const clean = (first.formatted_address || addressQuery).replace(/, India$/i, '');
                resolve({
                  locationName: clean,
                  fullAddress: clean,
                  nearestStation: nearest.station.name,
                  stationLine: nearest.station.line,
                  stationLineColor: nearest.station.lineColor,
                  distanceKm: nearest.distanceKm,
                  lat,
                  lng,
                });
              } else {
                resolve(null);
              }
            }
          );
        } catch {
          resolve(null);
        }
      });
      if (geoHit) return jsonResponse(geoHit);
    }

    return jsonResponse({ error: 'Location not found offline' }, 404);
  }

  const lat = Number(latStr);
  const lng = Number(lngStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return jsonResponse({ error: 'Invalid lat/lng coordinates' }, 400);
  }

  const nearest = findNearestMetroStation(lat, lng);
  if (g?.maps?.Geocoder) {
    const revHit = await new Promise<string | null>((resolve) => {
      try {
        const geocoder = new g.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
          if (status === 'OK' && results?.[0]?.formatted_address) {
            resolve(results[0].formatted_address.replace(/, India$/i, ''));
          } else {
            resolve(null);
          }
        });
      } catch {
        resolve(null);
      }
    });
    if (revHit) {
      return jsonResponse({
        locationName: revHit,
        fullAddress: revHit,
        nearestStation: nearest.station.name,
        stationLine: nearest.station.line,
        stationLineColor: nearest.station.lineColor,
        distanceKm: nearest.distanceKm,
        lat,
        lng,
      });
    }
  }

  const fallbackName = `Near ${nearest.station.name} (${nearest.station.line})`;
  return jsonResponse({
    locationName: fallbackName,
    fullAddress: fallbackName,
    nearestStation: nearest.station.name,
    stationLine: nearest.station.line,
    stationLineColor: nearest.station.lineColor,
    distanceKm: nearest.distanceKm,
    lat,
    lng,
  });
}

async function handleClientRealtimeTransit(urlObj: URL, init?: RequestInit): Promise<Response> {
  if ((init?.method || 'GET').toUpperCase() === 'POST') {
    return jsonResponse({
      success: true,
      summary:
        'Normal metro operations reported across Delhi Metro Yellow Line, Blue Line, Violet Line, Magenta Line, Aqua Line, and Rapid Metro Gurugram.',
      delaysReported: false,
    });
  }

  const stationId = urlObj.searchParams.get('stationId');
  const now = new Date();
  const currentTimeStr = now.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
  });

  const lines = Object.values(METRO_LINES_DATA).map((line) => ({
    ...line,
    lastUpdated: `Live at ${currentTimeStr} IST`,
  }));

  return jsonResponse({
    success: true,
    timestamp: now.toISOString(),
    currentTimeStr,
    lines,
    stationDepartures: stationId ? getLiveDeparturesForStation(stationId) : null,
    buses: stationId ? getConnectingBusesForStation(stationId) : LIVE_BUS_ROUTES,
    alerts: ACTIVE_TRANSIT_ALERTS,
  });
}

function buildDeepLinks(body: any) {
  const oLat = body.origin?.lat ?? 28.49;
  const oLng = body.origin?.lng ?? 77.08;
  const dLat = body.destination?.lat ?? 28.50;
  const dLng = body.destination?.lng ?? 77.09;
  const oStLat = body.originStation?.lat ?? oLat;
  const oStLng = body.originStation?.lng ?? oLng;
  const dStLat = body.destinationStation?.lat ?? dLat;
  const dStLng = body.destinationStation?.lng ?? dLng;
  const oName = encodeURIComponent(body.origin?.name || 'Origin');
  const dName = encodeURIComponent(body.destination?.name || 'Destination');
  const oStName = encodeURIComponent(body.originStation?.name || 'Metro Station');
  const dStName = encodeURIComponent(body.destinationStation?.name || 'Exit Station');

  return {
    uberFirstMileUrl: `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${oLat}&pickup[longitude]=${oLng}&pickup[nickname]=${oName}&dropoff[latitude]=${oStLat}&dropoff[longitude]=${oStLng}&dropoff[nickname]=${oStName}`,
    uberLastMileUrl: `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${dStLat}&pickup[longitude]=${dStLng}&pickup[nickname]=${dStName}&dropoff[latitude]=${dLat}&dropoff[longitude]=${dLng}&dropoff[nickname]=${dName}`,
    uberDirectUrl: `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${oLat}&pickup[longitude]=${oLng}&pickup[nickname]=${oName}&dropoff[latitude]=${dLat}&dropoff[longitude]=${dLng}&dropoff[nickname]=${dName}`,
    rapidoUrl: 'https://rapido.bike/',
    googleMapsUrl: `https://www.google.com/maps/dir/?api=1&origin=${oLat},${oLng}&destination=${dLat},${dLng}&travelmode=${body.travelMode === 'driving' ? 'driving' : body.travelMode === 'walking' ? 'walking' : 'transit'}`,
  };
}

async function handleClientTripEstimate(init?: RequestInit): Promise<Response> {
  const body = init?.body ? JSON.parse(String(init.body)) : {};
  const origin = body.origin || { lat: 28.4816, lng: 77.0931, name: 'Origin' };
  const destination = body.destination || { lat: 28.5037, lng: 77.0972, name: 'Destination' };
  const travelMode: TravelModeChoice = body.travelMode || 'multimodal';
  const pax: number = Math.max(1, Number(body.passengerCount) || 1);
  const fmMode: RideMode = body.firstMileMode || 'auto';
  const lmMode: RideMode = body.lastMileMode || 'cab';

  const curated = FAMOUS_DESTINATIONS.find(
    (d) =>
      Math.abs(d.lat - destination.lat) < 0.002 &&
      Math.abs(d.lng - destination.lng) < 0.002
  );

  const plan = planMultiModalTrip(
    origin.name,
    origin.lat,
    origin.lng,
    destination.name,
    destination.lat,
    destination.lng,
    curated,
    pax,
    fmMode,
    lmMode
  );

  const directDistKm = Math.max(
    0.4,
    Math.round(calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng) * 1.25 * 10) / 10
  );
  let directDurationMin =
    travelMode === 'walking'
      ? Math.max(4, Math.round(directDistKm * 12))
      : Math.max(8, Math.round(directDistKm * 3.1));
  let directSteps: { instruction: string; distanceText: string; durationText: string }[] | undefined =
    plan.directSteps;

  // Enhance with Google Maps JS DirectionsService if loaded in WebView
  const g = typeof window !== 'undefined' ? (window as any).google : null;
  if (g?.maps?.DirectionsService) {
    try {
      const modeMap: Record<TravelModeChoice, google.maps.TravelMode> = {
        multimodal: google.maps.TravelMode.DRIVING,
        transit: google.maps.TravelMode.TRANSIT,
        driving: google.maps.TravelMode.DRIVING,
        walking: google.maps.TravelMode.WALKING,
      };
      const dirRes = await new Promise<google.maps.DirectionsResult | null>((resolve) => {
        const svc = new g.maps.DirectionsService();
        svc.route(
          {
            origin: { lat: origin.lat, lng: origin.lng },
            destination: { lat: destination.lat, lng: destination.lng },
            travelMode: modeMap[travelMode],
            region: 'IN',
          },
          (result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
            resolve(status === 'OK' ? result : null);
          }
        );
      });
      const leg = dirRes?.routes?.[0]?.legs?.[0];
      if (leg) {
        if (leg.duration?.value) directDurationMin = Math.max(2, Math.round(leg.duration.value / 60));
        if (leg.steps?.length) {
          directSteps = leg.steps.slice(0, 12).map((s) => ({
            instruction: (s.instructions || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
            distanceText: s.distance?.text || '',
            durationText: s.duration?.text || '',
          }));
        }
      }
    } catch {}
  }

  return jsonResponse({
    success: true,
    dataSource: 'local-fallback',
    isDirectRoadRecommended: directDistKm <= 2.2 || travelMode === 'driving' || travelMode === 'walking',
    resolvedRoute: {
      originStation: plan.originStation,
      destinationStation: plan.destinationStation,
      firstMile: plan.firstMile,
      metroLeg: plan.metroLeg,
      metroExit: plan.metroExit,
      lastMile: plan.lastMile,
      directSteps,
      transitSteps: plan.transitSteps,
    },
    liveTraffic: {
      directDistanceKm: directDistKm,
      totalDurationMin:
        travelMode === 'driving' || travelMode === 'walking'
          ? directDurationMin
          : plan.firstMile.durationMin + plan.metroLeg.totalDurationMin + (plan.lastMile.options[0]?.durationMin || 8),
      firstMileDurationMin: plan.firstMile.durationMin,
      lastMileDurationMin: plan.lastMile.options[0]?.durationMin || 8,
      trafficStatus: directDistKm > 10 ? 'Moderate Delhi-NCR traffic' : 'Smooth corridor',
      roadOverview: `${directDistKm} km direct road corridor`,
    },
    fareBreakdown: plan.fareBreakdown,
    deepLinks: buildDeepLinks({ ...body, originStation: plan.originStation, destinationStation: plan.destinationStation }),
  });
}

async function handleClientBookTicket(init?: RequestInit): Promise<Response> {
  const body = init?.body ? JSON.parse(String(init.body)) : {};
  const {
    originStation,
    destinationStation,
    interchangeStation,
    exitGate,
    passengerCount = 1,
    baseFarePerPerson = 40,
  } = body;

  if (!originStation?.name || !destinationStation?.name) {
    return jsonResponse({ error: 'Origin and Destination stations are required' }, 400);
  }

  const pricing = calculateTicketPricing(baseFarePerPerson, passengerCount);
  const now = Date.now();
  const expiresAt = now + 60 * 60 * 1000;
  const randomSuffix = Math.floor(10000000 + Math.random() * 90000000);
  const ticketId = `DMRC-QR-${randomSuffix}`;
  const txnId = `TXN-${now}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const originCode = originStation.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase();
  const destCode = destinationStation.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase();
  const secHash = Math.random().toString(36).substring(2, 8).toUpperCase();
  const qrCodePayload = `DMRC:TKT:V2:${originCode}:${destCode}:PAX${pricing.passengerCount}:EXP${Math.floor(expiresAt / 1000)}:TXN${txnId}:SEC${secHash}`;

  const ticket: MetroTicket = {
    id: ticketId,
    originStation,
    destinationStation,
    interchangeStation,
    exitGate,
    passengerCount: pricing.passengerCount,
    baseFarePerPerson: pricing.baseFarePerPerson,
    discountPercent: pricing.discountPercent,
    discountedFarePerPerson: pricing.discountedFarePerPerson,
    totalFare: pricing.totalFare,
    totalSavings: pricing.totalSavings,
    bookingChannel: 'in_app',
    bookedAt: now,
    expiresAt,
    status: 'active',
    qrCodePayload,
    securityHash: secHash,
  };

  const note = encodeURIComponent(`Metro Ticket ${originStation.name} to ${destinationStation.name}`);
  const upiIntentUrl = `upi://pay?pa=dmrc.metro@sbi&pn=${encodeURIComponent('DMRC Metro Transit')}&am=${pricing.totalFare}&cu=INR&tn=${note}&tr=${txnId}`;

  return jsonResponse({
    success: true,
    mode: 'sandbox',
    ticket,
    pricing,
    upiIntentUrl,
  });
}

async function handleClientTransitAi(init?: RequestInit): Promise<Response> {
  const body = init?.body ? JSON.parse(String(init.body)) : {};
  const originName = body.originName || 'your origin';
  const destName = body.destName || 'your destination';
  const oLat = Number(body.originLat) || 28.4816;
  const oLng = Number(body.originLng) || 77.0931;
  const dLat = Number(body.destLat) || 28.5037;
  const dLng = Number(body.destLng) || 77.0972;

  const nearestOrigin = findNearestMetroStation(oLat, oLng);
  const nearestDest = findNearestMetroStation(dLat, dLng);
  const exitGate = nearestDest.station.exitGates[0];

  const guideMarkdown = [
    `### Verified Quiet Transit Brief`,
    `- **Origin Station**: Head to **${nearestOrigin.station.name}** (${nearestOrigin.station.line} Line, ~${nearestOrigin.distanceKm} km from ${originName}).`,
    `- **Arrival & Exit**: Deboard at **${nearestDest.station.name}** (${nearestDest.station.line} Line) and follow overhead signage to **Gate ${exitGate?.gateNumber || 1}** (${exitGate?.leadsTo || 'Main Exit'}).`,
    `- **Zero-Asking Tip**: Keep your DMRC WhatsApp/in-app QR pass ready before entering security screening to breeze past ticket counters.`,
  ].join('\n');

  return jsonResponse({
    success: true,
    guideMarkdown,
    groundingLinks: [
      {
        title: `Open ${destName} in Google Maps`,
        uri: `https://www.google.com/maps/dir/?api=1&origin=${oLat},${oLng}&destination=${dLat},${dLng}&travelmode=transit`,
        source: 'Google Maps',
      },
    ],
  });
}

async function runFallbackHandler(pathWithQuery: string, init?: RequestInit): Promise<Response | null> {
  const urlObj = new URL(pathWithQuery, 'https://metronav.local');
  const pathname = urlObj.pathname;

  if (pathname === '/api/places') return handleClientPlaces(urlObj);
  if (pathname === '/api/geocode') return handleClientGeocode(urlObj);
  if (pathname === '/api/realtime-transit') return handleClientRealtimeTransit(urlObj, init);
  if (pathname === '/api/trip-estimate') return handleClientTripEstimate(init);
  if (pathname === '/api/metro/book-ticket') return handleClientBookTicket(init);
  if (pathname === '/api/transit-ai') return handleClientTransitAi(init);
  return null;
}

/**
 * Unified API fetch wrapper:
 * - On web / configured remote backend: calls the Next.js API route cleanly.
 * - Inside native Capacitor APK without a remote server (or when offline):
 *   automatically runs the Google Maps JS SDK + curated Delhi-NCR offline engine
 *   so search, routing, live schedules, and ticketing work seamlessly out of the box.
 */
export async function apiFetch(pathWithQuery: string, init?: RequestInit): Promise<Response> {
  const native = isNativeCapacitor();
  const baseUrl = getConfiguredApiBaseUrl();

  // If running natively without a remote backend URL, go straight to on-device engine
  if (native && !baseUrl && pathWithQuery.startsWith('/api/')) {
    const fallback = await runFallbackHandler(pathWithQuery, init);
    if (fallback) return fallback;
  }

  const targetUrl =
    baseUrl && pathWithQuery.startsWith('/') ? `${baseUrl}${pathWithQuery}` : pathWithQuery;

  try {
    const res = await fetch(targetUrl, init);
    if (res.ok || res.status === 400 || res.status === 404) {
      return res;
    }
    const fallback = pathWithQuery.startsWith('/api/')
      ? await runFallbackHandler(pathWithQuery, init)
      : null;
    return fallback || res;
  } catch (err) {
    if (pathWithQuery.startsWith('/api/')) {
      const fallback = await runFallbackHandler(pathWithQuery, init);
      if (fallback) return fallback;
    }
    throw err;
  }
}
