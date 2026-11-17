'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
  useMapsLibrary
} from '@vis.gl/react-google-maps';
import {
  MultiModalTripPlan
} from '@/lib/delhi-ncr-transit';
import { decodeGooglePolyline } from '@/lib/utils';
import { apiFetch } from '@/lib/api-client';
import {
  MapPinned,
  Navigation,
  TrainFront,
  ArrowRight,
  Maximize2,
  Plus,
  Minus,
  DoorOpen,
  Footprints,
  Car,
  Layers,
  Sparkles,
  Compass,
  CheckCircle2,
  Activity,
  MapPin
} from 'lucide-react';

interface MapComponentProps {
  plan: MultiModalTripPlan | null;
  userCoords: { lat: number; lng: number } | null;
  onSelectStation?: (name: string) => void;
  onPickMapLocation?: (role: 'origin' | 'destination', name: string, coords: { lat: number; lng: number }) => void;
}

// Polyline component rendering double-cased transit tracks & real Google road paths
function RoutePolylines({ plan }: { plan: MultiModalTripPlan }) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib || !plan) return;

    const polylines: google.maps.Polyline[] = [];
    const bounds = new google.maps.LatLngBounds();

    const extendBoundsWithPath = (path: { lat: number; lng: number }[]) => {
      if (path.length === 0) return;
      const step = Math.max(1, Math.floor(path.length / 25));
      for (let i = 0; i < path.length; i += step) {
        bounds.extend(path[i]);
      }
      bounds.extend(path[path.length - 1]);
    };

    bounds.extend({ lat: plan.origin.lat, lng: plan.origin.lng });
    bounds.extend({ lat: plan.destination.lat, lng: plan.destination.lng });

    const isDirectRoadMode =
      plan.travelMode === 'driving' ||
      plan.travelMode === 'walking' ||
      (plan.isDirectRoadRecommended && (!plan.metroLeg?.lines || plan.metroLeg.lines.length === 0));

    if (isDirectRoadMode) {
      const decodedDirect = plan.liveTraffic?.directPolyline
        ? decodeGooglePolyline(plan.liveTraffic.directPolyline)
        : [];
      const directCoords =
        decodedDirect.length > 0
          ? decodedDirect
          : [
              { lat: plan.origin.lat, lng: plan.origin.lng },
              { lat: plan.destination.lat, lng: plan.destination.lng }
            ];

      const isWalk = plan.travelMode === 'walking';
      const casing = new mapsLib.Polyline({
        path: directCoords,
        geodesic: true,
        strokeColor: '#0F172A',
        strokeOpacity: 0.75,
        strokeWeight: isWalk ? 6 : 8,
        map
      });
      polylines.push(casing);

      const mainLine = new mapsLib.Polyline({
        path: directCoords,
        geodesic: true,
        strokeColor: isWalk ? '#143428' : '#2563EB',
        strokeOpacity: 1.0,
        strokeWeight: isWalk ? 4 : 5,
        ...(isWalk
          ? {
              icons: [
                {
                  icon: {
                    path: 'M 0,-1 0,1',
                    strokeOpacity: 1,
                    scale: 2.5,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 3
                  },
                  offset: '0',
                  repeat: '12px'
                }
              ]
            }
          : {}),
        map
      });
      polylines.push(mainLine);
      extendBoundsWithPath(directCoords);
      map.fitBounds(bounds, { top: 90, bottom: 90, left: 60, right: 60 });

      return () => {
        polylines.forEach(p => p.setMap(null));
      };
    }

    // 1. FIRST-MILE PATH: Origin -> Boarding Metro Station
    const decodedFm = plan.liveTraffic?.firstMilePolyline
      ? decodeGooglePolyline(plan.liveTraffic.firstMilePolyline)
      : [];
    const firstMileCoords =
      decodedFm.length > 0
        ? decodedFm
        : [
            { lat: plan.origin.lat, lng: plan.origin.lng },
            { lat: plan.originStation.lat, lng: plan.originStation.lng }
          ];

    polylines.push(
      new mapsLib.Polyline({
        path: firstMileCoords,
        geodesic: true,
        strokeColor: '#6B7267',
        strokeOpacity: 0.35,
        strokeWeight: 6,
        map
      })
    );
    polylines.push(
      new mapsLib.Polyline({
        path: firstMileCoords,
        geodesic: true,
        strokeColor: '#143428',
        strokeOpacity: 0.95,
        strokeWeight: 3.5,
        icons: [
          {
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: 1,
              scale: 2.5,
              strokeColor: '#143428',
              strokeWeight: 3
            },
            offset: '0',
            repeat: '12px'
          }
        ],
        map
      })
    );
    extendBoundsWithPath(firstMileCoords);

    // 2. REAL TRANSIT LEGS (uses Google encoded per-leg polylines when available)
    const legs = plan.metroLeg?.lines || [];
    if (legs.length > 0) {
      legs.forEach((leg, idx) => {
        const decodedLeg = leg.polyline ? decodeGooglePolyline(leg.polyline) : [];
        let legCoords = decodedLeg;

        if (legCoords.length === 0) {
          const fromCoord =
            typeof leg.fromLat === 'number' && typeof leg.fromLng === 'number'
              ? { lat: leg.fromLat, lng: leg.fromLng }
              : idx === 0
              ? { lat: plan.originStation.lat, lng: plan.originStation.lng }
              : plan.metroLeg.transferStations?.[idx - 1]
              ? { lat: plan.metroLeg.transferStations[idx - 1].lat, lng: plan.metroLeg.transferStations[idx - 1].lng }
              : plan.metroLeg.transferStation
              ? { lat: plan.metroLeg.transferStation.lat, lng: plan.metroLeg.transferStation.lng }
              : { lat: plan.originStation.lat, lng: plan.originStation.lng };

          const toCoord =
            typeof leg.toLat === 'number' && typeof leg.toLng === 'number'
              ? { lat: leg.toLat, lng: leg.toLng }
              : idx === legs.length - 1
              ? { lat: plan.destinationStation.lat, lng: plan.destinationStation.lng }
              : plan.metroLeg.transferStations?.[idx]
              ? { lat: plan.metroLeg.transferStations[idx].lat, lng: plan.metroLeg.transferStations[idx].lng }
              : plan.metroLeg.transferStation
              ? { lat: plan.metroLeg.transferStation.lat, lng: plan.metroLeg.transferStation.lng }
              : { lat: plan.destinationStation.lat, lng: plan.destinationStation.lng };

          legCoords = [fromCoord, toCoord];
        }

        polylines.push(
          new mapsLib.Polyline({
            path: legCoords,
            geodesic: true,
            strokeColor: '#17201B',
            strokeOpacity: 0.85,
            strokeWeight: 7.5,
            map
          })
        );
        polylines.push(
          new mapsLib.Polyline({
            path: legCoords,
            geodesic: true,
            strokeColor: leg.lineColor || plan.originStation.lineColor || '#2563EB',
            strokeOpacity: 1.0,
            strokeWeight: 4.5,
            map
          })
        );
        extendBoundsWithPath(legCoords);
      });
    } else if (plan.originStation && plan.destinationStation) {
      const fallbackCoords = [
        { lat: plan.originStation.lat, lng: plan.originStation.lng },
        { lat: plan.destinationStation.lat, lng: plan.destinationStation.lng }
      ];
      polylines.push(
        new mapsLib.Polyline({
          path: fallbackCoords,
          geodesic: true,
          strokeColor: '#17201B',
          strokeOpacity: 0.85,
          strokeWeight: 7.5,
          map
        })
      );
      polylines.push(
        new mapsLib.Polyline({
          path: fallbackCoords,
          geodesic: true,
          strokeColor: plan.originStation.lineColor || '#EAB308',
          strokeOpacity: 1.0,
          strokeWeight: 4.5,
          map
        })
      );
    }

    // 3. LAST-MILE PATH: Deboarding Metro Station Exit -> Final Destination
    const decodedLm = plan.liveTraffic?.lastMilePolyline
      ? decodeGooglePolyline(plan.liveTraffic.lastMilePolyline)
      : [];
    const lastMileCoords =
      decodedLm.length > 0
        ? decodedLm
        : [
            { lat: plan.destinationStation.lat, lng: plan.destinationStation.lng },
            { lat: plan.destination.lat, lng: plan.destination.lng }
          ];

    polylines.push(
      new mapsLib.Polyline({
        path: lastMileCoords,
        geodesic: true,
        strokeColor: '#FAF2EE',
        strokeOpacity: 0.85,
        strokeWeight: 6,
        map
      })
    );
    polylines.push(
      new mapsLib.Polyline({
        path: lastMileCoords,
        geodesic: true,
        strokeColor: '#B9552C',
        strokeOpacity: 1.0,
        strokeWeight: 3.5,
        icons: [
          {
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: 1,
              scale: 2.5,
              strokeColor: '#B9552C',
              strokeWeight: 3.5
            },
            offset: '0',
            repeat: '12px'
          }
        ],
        map
      })
    );
    extendBoundsWithPath(lastMileCoords);

    bounds.extend({ lat: plan.originStation.lat, lng: plan.originStation.lng });
    bounds.extend({ lat: plan.destinationStation.lat, lng: plan.destinationStation.lng });
    map.fitBounds(bounds, { top: 90, bottom: 90, left: 60, right: 60 });

    return () => {
      polylines.forEach(p => p.setMap(null));
    };
  }, [map, mapsLib, plan]);

  return null;
}

// Native Google Maps Transit & Live Traffic Overlays
function GoogleMapLayers({ showTransitLayer, showTrafficLayer }: { showTransitLayer: boolean; showTrafficLayer: boolean }) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib || !showTransitLayer) return;
    const transitLayer = new mapsLib.TransitLayer();
    transitLayer.setMap(map);
    return () => {
      transitLayer.setMap(null);
    };
  }, [map, mapsLib, showTransitLayer]);

  useEffect(() => {
    if (!map || !mapsLib || !showTrafficLayer) return;
    const trafficLayer = new mapsLib.TrafficLayer();
    trafficLayer.setMap(map);
    return () => {
      trafficLayer.setMap(null);
    };
  }, [map, mapsLib, showTrafficLayer]);

  return null;
}

// Controller component inside APIProvider to execute map interactions
function MapControls({
  plan,
  userCoords,
  isSatellite,
  setIsSatellite,
  showTransitLayer,
  setShowTransitLayer,
  showTrafficLayer,
  setShowTrafficLayer,
  onFocusExitGate,
  onFocusWaypoint
}: {
  plan: MultiModalTripPlan | null;
  userCoords: { lat: number; lng: number } | null;
  isSatellite: boolean;
  setIsSatellite: (val: boolean | ((prev: boolean) => boolean)) => void;
  showTransitLayer: boolean;
  setShowTransitLayer: (val: boolean | ((prev: boolean) => boolean)) => void;
  showTrafficLayer: boolean;
  setShowTrafficLayer: (val: boolean | ((prev: boolean) => boolean)) => void;
  onFocusExitGate: () => void;
  onFocusWaypoint: (type: 'origin' | 'originStation' | 'transferStation' | 'destStation' | 'destination') => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.setMapTypeId(isSatellite ? 'hybrid' : 'roadmap');
  }, [map, isSatellite]);

  useEffect(() => {
    if (!map || plan) return;
    if (userCoords) {
      map.panTo(userCoords);
      map.setZoom(15);
    }
  }, [map, userCoords, plan]);

  const handleFitRoute = useCallback(() => {
    if (!map) return;
    if (plan) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: plan.origin.lat, lng: plan.origin.lng });
      bounds.extend({ lat: plan.originStation.lat, lng: plan.originStation.lng });
      if (plan.metroLeg.transferStation) {
        bounds.extend({ lat: plan.metroLeg.transferStation.lat, lng: plan.metroLeg.transferStation.lng });
      }
      bounds.extend({ lat: plan.destinationStation.lat, lng: plan.destinationStation.lng });
      bounds.extend({ lat: plan.destination.lat, lng: plan.destination.lng });
      map.fitBounds(bounds, { top: 90, bottom: 90, left: 60, right: 60 });
    } else if (userCoords) {
      map.panTo(userCoords);
      map.setZoom(15);
    } else {
      map.panTo({ lat: 28.5355, lng: 77.21 });
      map.setZoom(11);
    }
  }, [map, plan, userCoords]);

  const handleZoomIn = () => {
    if (!map) return;
    map.setZoom((map.getZoom() || 13) + 1);
  };

  const handleZoomOut = () => {
    if (!map) return;
    map.setZoom((map.getZoom() || 13) - 1);
  };

  return (
    <>
      {/* Top Floating Header & Map Control Bar */}
      <div className="absolute top-3.5 left-3.5 right-3.5 flex flex-wrap items-center justify-between gap-2.5 pointer-events-none z-20">
        {/* Left: Waypoint Progression Trail */}
        {plan ? (
          <div className="pointer-events-auto bg-white/95 rounded-xl p-2 sm:p-2.5 shadow-sm border border-[#E2E4DC] text-xs flex flex-wrap items-center gap-2 max-w-full overflow-x-auto">
            <button
              onClick={() => onFocusWaypoint('origin')}
              className="flex items-center gap-1.5 font-bold text-[#143428] hover:text-[#B9552C] transition px-1.5 py-0.5 rounded hover:bg-[#F4F5F0]"
              title="Click to zoom to departure location"
            >
              <span className="w-2 h-2 rounded-full bg-[#143428]"></span>
              <span>Start</span>
            </button>

            {plan.travelMode !== 'driving' && plan.travelMode !== 'walking' && !plan.isDirectRoadRecommended && (
              <>
                <ArrowRight className="w-3 h-3 text-[#8E9487] shrink-0" strokeWidth={1.75} />

                <button
                  onClick={() => onFocusWaypoint('originStation')}
                  className="flex items-center gap-1.5 font-semibold text-[#17201B] hover:text-[#B9552C] transition px-1.5 py-0.5 rounded hover:bg-[#F4F5F0]"
                  title={`Board at ${plan.originStation.name}`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: plan.originStation.lineColor }}
                  ></span>
                  <span className="truncate max-w-[110px] sm:max-w-none">{plan.originStation.name}</span>
                </button>

                {plan.metroLeg.requiresTransfer && plan.metroLeg.transferStation && (
                  <>
                    <ArrowRight className="w-3 h-3 text-[#8E9487] shrink-0" strokeWidth={1.75} />
                    <button
                      onClick={() => onFocusWaypoint('transferStation')}
                      className="px-2 py-0.5 rounded-md bg-[#FAF2EE] text-[#B9552C] font-bold text-[11px] border border-[#E8C2B3] hover:bg-[#F4DDD3] transition flex items-center gap-1"
                      title="Interchange Station"
                    >
                      <span>{plan.metroLeg.transferStation.name}</span>
                    </button>
                  </>
                )}

                <ArrowRight className="w-3 h-3 text-[#8E9487] shrink-0" strokeWidth={1.75} />

                <button
                  onClick={() => onFocusWaypoint('destStation')}
                  className="flex items-center gap-1.5 font-semibold text-[#17201B] hover:text-[#B9552C] transition px-1.5 py-0.5 rounded hover:bg-[#F4F5F0]"
                  title={`Deboard at ${plan.destinationStation.name} (Exit Gate ${plan.metroExit.gateNumber})`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: plan.destinationStation.lineColor }}
                  ></span>
                  <span className="truncate max-w-[120px] sm:max-w-none">
                    {plan.destinationStation.name}
                  </span>
                  <span className="bg-[#B9552C] text-white text-[10px] font-bold px-1.5 py-0.2 rounded">
                    Gate {plan.metroExit.gateNumber}
                  </span>
                </button>
              </>
            )}

            <ArrowRight className="w-3 h-3 text-[#8E9487] shrink-0" strokeWidth={1.75} />

            <button
              onClick={() => onFocusWaypoint('destination')}
              className="flex items-center gap-1 font-bold text-[#B9552C] hover:opacity-80 transition px-1.5 py-0.5 rounded hover:bg-[#FAF2EE]"
              title="Click to zoom to destination"
            >
              <span className="w-2 h-2 rounded-full bg-[#B9552C]"></span>
              <span className="truncate max-w-[110px] sm:max-w-none">
                {plan.destination.name.split(',')[0]}
              </span>
            </button>
          </div>
        ) : (
          <div className="pointer-events-auto bg-white/95 rounded-xl px-3 py-2 shadow-sm border border-[#E2E4DC] text-xs font-semibold text-[#143428] flex items-center gap-2">
            <Compass className="w-3.5 h-3.5 text-[#143428]" />
            <span>Delhi • Gurgaon • Noida Google Maps Grid</span>
          </div>
        )}

        {/* Right: Map Layers (Satellite, Metro Transit, Live Traffic) & Fit */}
        <div className="pointer-events-auto flex items-center gap-1 bg-white/95 rounded-xl p-1 shadow-sm border border-[#E2E4DC]">
          <button
            onClick={() => setShowTransitLayer(prev => !prev)}
            className={`px-2 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              showTransitLayer
                ? 'bg-[#143428] text-white shadow-xs'
                : 'text-[#53584E] hover:text-[#17201B] hover:bg-[#F4F5F0]'
            }`}
            title="Show full Delhi Metro, Rapid Metro & Noida Aqua Line grid on map"
          >
            <TrainFront className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Metro Lines</span>
          </button>

          <button
            onClick={() => setShowTrafficLayer(prev => !prev)}
            className={`px-2 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              showTrafficLayer
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-[#53584E] hover:text-[#17201B] hover:bg-[#F4F5F0]'
            }`}
            title="Toggle Google Maps live road traffic overlay"
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Traffic</span>
          </button>

          <button
            onClick={() => setIsSatellite(prev => !prev)}
            className={`px-2 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              isSatellite
                ? 'bg-[#17201B] text-white shadow-xs'
                : 'text-[#53584E] hover:text-[#17201B] hover:bg-[#F4F5F0]'
            }`}
            title="Toggle between vector roadmap and satellite view"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isSatellite ? 'Satellite' : 'Map'}</span>
          </button>

          <button
            onClick={handleFitRoute}
            className="p-1.5 rounded-lg text-[#53584E] hover:text-[#17201B] hover:bg-[#F4F5F0] transition cursor-pointer"
            title="Fit full route in viewport"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Floating Control Dock */}
      <div className="absolute bottom-3.5 left-3.5 right-3.5 flex items-center justify-between pointer-events-none z-20">
        <div className="pointer-events-auto flex items-center gap-2">
          {plan && plan.travelMode !== 'driving' && plan.travelMode !== 'walking' && !plan.isDirectRoadRecommended && (
            <button
              onClick={onFocusExitGate}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#B9552C] hover:bg-[#A34722] text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
              title="Zoom directly to the station exit gate and last-mile path"
            >
              <DoorOpen className="w-4 h-4 text-white" strokeWidth={2} />
              <span>Focus Exit Gate {plan.metroExit.gateNumber}</span>
            </button>
          )}
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/95 border border-[#E2E4DC] text-[11px] font-semibold text-[#53584E] shadow-xs">
            <MapPin className="w-3 h-3 text-[#B9552C]" />
            <span>Tap anywhere on map to pick point</span>
          </span>
        </div>

        {/* Custom Zoom in/out buttons */}
        <div className="pointer-events-auto flex flex-col gap-1 bg-white/95 rounded-xl p-1 shadow-sm border border-[#E2E4DC]">
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#17201B] hover:bg-[#F4F5F0] transition cursor-pointer"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="h-px bg-[#E2E4DC] mx-1"></div>
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#17201B] hover:bg-[#F4F5F0] transition cursor-pointer"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}

// Inner map view component to manage map state and events
function MapView({
  plan,
  userCoords,
  onPickMapLocation
}: {
  plan: MultiModalTripPlan | null;
  userCoords: { lat: number; lng: number } | null;
  onPickMapLocation?: (role: 'origin' | 'destination', name: string, coords: { lat: number; lng: number }) => void;
}) {
  const map = useMap();
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [isSatellite, setIsSatellite] = useState(false);
  const [showTransitLayer, setShowTransitLayer] = useState(true);
  const [showTrafficLayer, setShowTrafficLayer] = useState(false);
  const [droppedPin, setDroppedPin] = useState<{
    lat: number;
    lng: number;
    name: string;
    loading: boolean;
  } | null>(null);

  const isDirectRoadMode =
    plan?.travelMode === 'driving' ||
    plan?.travelMode === 'walking' ||
    (plan?.isDirectRoadRecommended && (!plan?.metroLeg?.lines || plan.metroLeg.lines.length === 0));

  const transferMarkers = useMemo(() => {
    if (!plan || !plan.metroLeg?.requiresTransfer) return [];
    if (plan.metroLeg.transferStations && plan.metroLeg.transferStations.length > 0) {
      return plan.metroLeg.transferStations;
    }
    return plan.metroLeg.transferStation ? [plan.metroLeg.transferStation] : [];
  }, [plan]);

  const handleMapClick = useCallback(async (e: any) => {
    const latLng = e?.detail?.latLng;
    if (!latLng || typeof latLng.lat !== 'number' || typeof latLng.lng !== 'number') return;
    const coords = { lat: latLng.lat, lng: latLng.lng };
    const placeId: string | undefined = e?.detail?.placeId;

    setSelectedMarker(null);
    setDroppedPin({
      lat: coords.lat,
      lng: coords.lng,
      name: 'Fetching address...',
      loading: true
    });

    try {
      if (placeId) {
        const res = await apiFetch(`/api/places?placeId=${encodeURIComponent(placeId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.place) {
            setDroppedPin({
              lat: data.place.lat ?? coords.lat,
              lng: data.place.lng ?? coords.lng,
              name: data.place.name || data.place.formattedAddress || 'Selected Place',
              loading: false
            });
            return;
          }
        }
      }

      const geoRes = await apiFetch(`/api/geocode?lat=${coords.lat}&lng=${coords.lng}`);
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        setDroppedPin({
          lat: coords.lat,
          lng: coords.lng,
          name: geoData.locationName || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
          loading: false
        });
        return;
      }
    } catch {}

    setDroppedPin({
      lat: coords.lat,
      lng: coords.lng,
      name: `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
      loading: false
    });
  }, []);

  // Default Center
  const defaultCenter = useMemo(() => {
    if (plan) {
      return {
        lat: (plan.origin.lat + plan.destination.lat) / 2,
        lng: (plan.origin.lng + plan.destination.lng) / 2
      };
    }
    if (userCoords) {
      return userCoords;
    }
    return { lat: 28.4950, lng: 77.0890 };
  }, [plan, userCoords]);

  // Focus directly on exit gate with high zoom level
  const handleFocusExitGate = useCallback(() => {
    if (!map || !plan) return;
    map.panTo({
      lat: plan.destinationStation.lat,
      lng: plan.destinationStation.lng
    });
    map.setZoom(17);
    setSelectedMarker('destStation');
  }, [map, plan]);

  // Focus specific waypoint
  const handleFocusWaypoint = useCallback(
    (type: 'origin' | 'originStation' | 'transferStation' | 'destStation' | 'destination') => {
      if (!map || !plan) return;
      setSelectedMarker(type);

      switch (type) {
        case 'origin':
          map.panTo({ lat: plan.origin.lat, lng: plan.origin.lng });
          map.setZoom(16);
          break;
        case 'originStation':
          map.panTo({ lat: plan.originStation.lat, lng: plan.originStation.lng });
          map.setZoom(16);
          break;
        case 'transferStation':
          if (plan.metroLeg.transferStation) {
            map.panTo({
              lat: plan.metroLeg.transferStation.lat,
              lng: plan.metroLeg.transferStation.lng
            });
            map.setZoom(16);
          }
          break;
        case 'destStation':
          map.panTo({ lat: plan.destinationStation.lat, lng: plan.destinationStation.lng });
          map.setZoom(17);
          break;
        case 'destination':
          map.panTo({ lat: plan.destination.lat, lng: plan.destination.lng });
          map.setZoom(16);
          break;
      }
    },
    [map, plan]
  );

  return (
    <div className="relative w-full h-full min-h-[440px] rounded-2xl overflow-hidden bg-[#F4F5F0]">
      <Map
        defaultCenter={defaultCenter}
        defaultZoom={13}
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        gestureHandling="greedy"
        disableDefaultUI={true}
        onClick={handleMapClick}
        className="w-full h-full"
      >
        <GoogleMapLayers showTransitLayer={showTransitLayer} showTrafficLayer={showTrafficLayer} />
        {/* Render multi-layer transit and walking polylines */}
        {plan && <RoutePolylines plan={plan} />}

        {/* --- START ORIGIN MARKER (When route plan is active) --- */}
        {plan && (
          <AdvancedMarker
            position={{ lat: plan.origin.lat, lng: plan.origin.lng }}
            title={`Starting Point: ${plan.origin.name}`}
            onClick={() => setSelectedMarker('origin')}
          >
            <div className="flex flex-col items-center group cursor-pointer">
              {/* Floating Pill Tag */}
              <div className="mb-1 px-2.5 py-0.5 rounded-full bg-[#143428] text-[#5ee9b5] text-[11px] font-bold shadow-md border border-white/40 whitespace-nowrap flex items-center gap-1.5 transition-transform group-hover:scale-105">
                <span className="w-2 h-2 rounded-full bg-[#5ee9b5] animate-pulse"></span>
                <span>{plan.origin.name ? plan.origin.name.split(',')[0] : 'Start'}</span>
              </div>
              {/* Pin Badge with beacon ring */}
              <div className="relative flex items-center justify-center">
                <span className="absolute -inset-1.5 rounded-full bg-emerald-500/35 animate-ping"></span>
                <div className="relative w-8 h-8 rounded-full bg-[#143428] text-white shadow-lg border-2 border-white flex items-center justify-center">
                  <Navigation className="w-4 h-4 text-[#5ee9b5]" strokeWidth={2.2} />
                </div>
              </div>
            </div>
          </AdvancedMarker>
        )}

        {/* --- STANDALONE USER GPS PINPOINT MARKER (When no route plan is loaded) --- */}
        {!plan && userCoords && (
          <AdvancedMarker
            position={userCoords}
            title="Your Exact GPS Pinpoint Location"
            onClick={() => setSelectedMarker('userCoords')}
          >
            <div className="flex flex-col items-center group cursor-pointer">
              <div className="mb-1 px-2.5 py-0.5 rounded-full bg-[#143428] text-[#5ee9b5] text-[11px] font-bold shadow-md border border-white/40 whitespace-nowrap flex items-center gap-1.5 transition-transform group-hover:scale-105">
                <span className="w-2 h-2 rounded-full bg-[#5ee9b5] animate-pulse"></span>
                <span>Your GPS Pinpoint</span>
              </div>
              <div className="relative flex items-center justify-center">
                <span className="absolute -inset-2 rounded-full bg-emerald-500/40 animate-ping"></span>
                <div className="relative w-9 h-9 rounded-full bg-[#143428] text-white shadow-xl border-2 border-white flex items-center justify-center">
                  <Navigation className="w-4.5 h-4.5 text-[#5ee9b5]" strokeWidth={2.2} />
                </div>
              </div>
            </div>
          </AdvancedMarker>
        )}

        {/* --- BOARDING METRO STATION MARKER --- */}
        {plan && !isDirectRoadMode && (
          <AdvancedMarker
            position={{ lat: plan.originStation.lat, lng: plan.originStation.lng }}
            title={`Board at ${plan.originStation.name}`}
            onClick={() => setSelectedMarker('originStation')}
          >
            <div className="flex flex-col items-center group cursor-pointer">
              <div className="mb-1 px-2.5 py-0.5 rounded-full bg-white text-[#17201B] text-[11px] font-bold shadow-md border border-[#E2E4DC] whitespace-nowrap flex items-center gap-1.5 transition-transform group-hover:scale-105">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: plan.originStation.lineColor }}
                ></span>
                <span>Board: {plan.originStation.name}</span>
              </div>
              <div
                className="w-8 h-8 rounded-full text-white shadow-lg border-2 border-white flex items-center justify-center"
                style={{ backgroundColor: plan.originStation.lineColor }}
              >
                <TrainFront className="w-4 h-4 text-white" strokeWidth={2} />
              </div>
            </div>
          </AdvancedMarker>
        )}

        {/* --- INTERCHANGE STATION MARKERS (Supports 1 or multiple interchanges) --- */}
        {plan && !isDirectRoadMode &&
          transferMarkers.map((trSt, idx) => (
            <AdvancedMarker
              key={`transfer-${trSt.id}-${idx}`}
              position={{ lat: trSt.lat, lng: trSt.lng }}
              title={`Transfer at ${trSt.name}`}
              onClick={() => setSelectedMarker('transferStation')}
            >
              <div className="flex flex-col items-center group cursor-pointer">
                <div className="mb-1 px-2.5 py-0.5 rounded-full bg-[#FAF2EE] text-[#B9552C] text-[11px] font-bold shadow-md border border-[#E8C2B3] whitespace-nowrap flex items-center gap-1.5 transition-transform group-hover:scale-105">
                  <Sparkles className="w-3 h-3 text-[#B9552C]" />
                  <span>Change: {trSt.name}</span>
                </div>
                <div className="flex items-center justify-center px-2 py-1 rounded-full bg-[#FAF2EE] text-[#B9552C] shadow-lg border-2 border-white">
                  <div className="flex items-center gap-1 font-extrabold text-[10px] tracking-wider uppercase">
                    <span>Transfer {transferMarkers.length > 1 ? idx + 1 : ''}</span>
                  </div>
                </div>
              </div>
            </AdvancedMarker>
          ))}

        {/* --- DEBOARDING METRO STATION & EXIT GATE MARKER --- */}
        {plan && !isDirectRoadMode && (
          <AdvancedMarker
            position={{ lat: plan.destinationStation.lat, lng: plan.destinationStation.lng }}
            title={`Deboard at ${plan.destinationStation.name} (Gate ${plan.metroExit.gateNumber})`}
            onClick={() => setSelectedMarker('destStation')}
          >
            <div className="flex flex-col items-center group cursor-pointer">
              <div className="mb-1 px-2.5 py-0.5 rounded-full bg-[#17201B] text-white text-[11px] font-bold shadow-md border border-white/40 whitespace-nowrap flex items-center gap-1.5 transition-transform group-hover:scale-105">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: plan.destinationStation.lineColor }}
                ></span>
                <span>Deboard: {plan.destinationStation.name}</span>
                <span className="bg-[#B9552C] text-white text-[10px] px-1.5 py-0.2 rounded font-extrabold">
                  Gate {plan.metroExit.gateNumber}
                </span>
              </div>
              <div className="relative flex items-center justify-center">
                <span className="absolute -inset-1 rounded-full bg-[#B9552C]/30 animate-ping"></span>
                <div className="relative w-8 h-8 rounded-full bg-[#B9552C] text-white shadow-lg border-2 border-white flex items-center justify-center">
                  <DoorOpen className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
              </div>
            </div>
          </AdvancedMarker>
        )}

        {/* --- FINAL DESTINATION MARKER --- */}
        {plan && (
          <AdvancedMarker
            position={{ lat: plan.destination.lat, lng: plan.destination.lng }}
            title={plan.destination.name}
            onClick={() => setSelectedMarker('destination')}
          >
            <div className="flex flex-col items-center group cursor-pointer">
              <div className="mb-1 px-2.5 py-0.5 rounded-full bg-[#B9552C] text-white text-[11px] font-bold shadow-md border border-white/40 whitespace-nowrap flex items-center gap-1 transition-transform group-hover:scale-105">
                <MapPinned className="w-3 h-3 text-white" />
                <span>{plan.destination.name.split(',')[0]}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#B9552C] text-white shadow-lg border-2 border-white flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={2} />
              </div>
            </div>
          </AdvancedMarker>
        )}

        {/* --- DROPPED MAP CLICK PIN & GOOGLE MAPS PICKER --- */}
        {droppedPin && (
          <>
            <AdvancedMarker position={{ lat: droppedPin.lat, lng: droppedPin.lng }}>
              <div className="w-7 h-7 rounded-full bg-[#17201B] text-white border-2 border-white shadow-lg flex items-center justify-center">
                <MapPin className="w-3.5 h-3.5 text-[#5ee9b5]" />
              </div>
            </AdvancedMarker>
            <InfoWindow
              position={{ lat: droppedPin.lat, lng: droppedPin.lng }}
              onCloseClick={() => setDroppedPin(null)}
            >
              <div className="p-1.5 max-w-[240px] space-y-2 font-sans text-[#17201B]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7267]">
                  Dropped Map Pin
                </div>
                <div className="text-xs font-extrabold leading-snug">
                  {droppedPin.loading ? 'Resolving address...' : droppedPin.name}
                </div>
                {onPickMapLocation && !droppedPin.loading && (
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        onPickMapLocation('origin', droppedPin.name, {
                          lat: droppedPin.lat,
                          lng: droppedPin.lng
                        });
                        setDroppedPin(null);
                      }}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#143428] hover:bg-[#1A3E31] text-white text-[11px] font-bold cursor-pointer"
                    >
                      Set Start
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onPickMapLocation('destination', droppedPin.name, {
                          lat: droppedPin.lat,
                          lng: droppedPin.lng
                        });
                        setDroppedPin(null);
                      }}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#B9552C] hover:bg-[#A34722] text-white text-[11px] font-bold cursor-pointer"
                    >
                      Set Destination
                    </button>
                  </div>
                )}
              </div>
            </InfoWindow>
          </>
        )}

        {/* --- CUSTOM DESIGNED INFO WINDOWS --- */}
        {!plan && selectedMarker === 'userCoords' && userCoords && (
          <InfoWindow
            position={userCoords}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-1 text-[#17201B] max-w-xs space-y-1.5 font-sans">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] font-bold text-[#143428] uppercase tracking-wider">
                  Your Pinpoint GPS Location
                </span>
              </div>
              <div className="font-bold text-sm text-[#17201B]">
                {userCoords.lat.toFixed(5)}, {userCoords.lng.toFixed(5)}
              </div>
              <p className="text-xs text-[#53584E]">
                Select any destination in the Go Tab to calculate your multi-modal transit route from here.
              </p>
            </div>
          </InfoWindow>
        )}

        {plan && selectedMarker === 'origin' && (
          <InfoWindow
            position={{ lat: plan.origin.lat, lng: plan.origin.lng }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-1 text-[#17201B] max-w-xs space-y-1.5 font-sans">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#143428]"></span>
                <span className="text-[10px] font-bold text-[#143428] uppercase tracking-wider">
                  Departure Point
                </span>
              </div>
              <div className="font-bold text-sm text-[#17201B]">{plan.origin.name}</div>
              <div className="text-xs text-[#53584E] bg-[#F8F9F5] p-2 rounded-lg border border-[#E2E4DC] space-y-1">
                <div className="flex items-center gap-1.5 text-[#143428] font-semibold">
                  {plan.firstMile.mode === 'walk' ? (
                    <Footprints className="w-3.5 h-3.5" />
                  ) : (
                    <Car className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {plan.firstMile.mode === 'walk' ? 'Walking' : 'Auto / Cab'} ~
                    {plan.firstMile.distanceKm} km to {plan.originStation.name}
                  </span>
                </div>
                <div className="text-[11px] text-[#6B7267] leading-relaxed">
                  {plan.firstMile.instructions}
                </div>
              </div>
            </div>
          </InfoWindow>
        )}

        {plan && selectedMarker === 'originStation' && (
          <InfoWindow
            position={{ lat: plan.originStation.lat, lng: plan.originStation.lng }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-1 text-[#17201B] max-w-xs space-y-1.5 font-sans">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: plan.originStation.lineColor }}
                ></span>
                <span className="text-[10px] font-bold text-[#143428] uppercase tracking-wider">
                  Boarding Station
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-[#F4F5F0] text-[#53584E]">
                  {plan.originStation.line} Line
                </span>
              </div>
              <div className="font-bold text-sm text-[#17201B]">{plan.originStation.name}</div>
              <div className="text-xs text-[#53584E] bg-[#F8F9F5] p-2 rounded-lg border border-[#E2E4DC] space-y-1">
                <div className="text-[11px] font-semibold text-[#143428]">
                  {plan.metroLeg.lines[0]?.direction}
                </div>
                <div className="text-[11px] text-[#6B7267]">
                  {plan.metroLeg.lines[0]?.stopsCount} stops • ~
                  {Math.round(plan.metroLeg.lines[0]?.stopsCount * 2.5)} min ride
                </div>
                <div className="text-[10px] text-[#8E9487] pt-0.5">
                  💡 Tip: Scan WhatsApp QR ticket or Paytm at gate for frictionless entry.
                </div>
              </div>
            </div>
          </InfoWindow>
        )}

        {plan && plan.metroLeg.requiresTransfer && plan.metroLeg.transferStation && selectedMarker === 'transferStation' && (
          <InfoWindow
            position={{
              lat: plan.metroLeg.transferStation.lat,
              lng: plan.metroLeg.transferStation.lng
            }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-1 text-[#17201B] max-w-xs space-y-1.5 font-sans">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-[#B9552C] uppercase tracking-wider">
                  Interchange Station
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-[#FAF2EE] text-[#B9552C]">
                  Direct Skywalk
                </span>
              </div>
              <div className="font-bold text-sm text-[#17201B]">
                {plan.metroLeg.transferStation.name}
              </div>
              <div className="text-xs text-[#53584E] bg-[#F8F9F5] p-2 rounded-lg border border-[#E2E4DC] space-y-1">
                <p className="text-[11px] text-[#17201B] leading-relaxed">
                  Switch from <strong className="text-[#143428]">{plan.originStation.line} Line</strong>{' '}
                  to <strong className="text-[#B9552C]">{plan.destinationStation.line} Line</strong>.
                </p>
                <p className="text-[11px] text-[#6B7267]">
                  🚶 Walk through the elevated enclosed footbridge. You do <em>not</em> need to exit
                  fare gates or buy a separate ticket.
                </p>
              </div>
            </div>
          </InfoWindow>
        )}

        {plan && selectedMarker === 'destStation' && (
          <InfoWindow
            position={{ lat: plan.destinationStation.lat, lng: plan.destinationStation.lng }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-1 text-[#17201B] max-w-xs space-y-1.5 font-sans">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: plan.destinationStation.lineColor }}
                ></span>
                <span className="text-[10px] font-bold text-[#143428] uppercase tracking-wider">
                  Deboarding Station
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-[#F4F5F0] text-[#53584E]">
                  {plan.destinationStation.line}
                </span>
              </div>
              <div className="font-bold text-sm text-[#17201B]">
                {plan.destinationStation.name}
              </div>

              {/* Highlighting Exit Gate prominently */}
              <div className="bg-[#FAF2EE] border border-[#E8C2B3] p-2.5 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#B9552C]">
                  <DoorOpen className="w-4 h-4" />
                  <span>Crucial: Use Exit Gate {plan.metroExit.gateNumber}</span>
                </div>
                <div className="text-[11px] text-[#53584E] font-medium leading-relaxed">
                  {plan.metroExit.leadsTo}
                </div>
                {plan.metroExit.signageTip && (
                  <div className="text-[10px] text-[#B9552C] pt-0.5 italic">
                    {plan.metroExit.signageTip}
                  </div>
                )}
              </div>

              <div className="text-[11px] text-[#6B7267]">
                Last-mile: ~{plan.lastMile.distanceKm} km to {plan.destination.name.split(',')[0]}
              </div>
            </div>
          </InfoWindow>
        )}

        {plan && selectedMarker === 'destination' && (
          <InfoWindow
            position={{ lat: plan.destination.lat, lng: plan.destination.lng }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-1 text-[#17201B] max-w-xs space-y-1.5 font-sans">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#B9552C]"></span>
                <span className="text-[10px] font-bold text-[#B9552C] uppercase tracking-wider">
                  Target Destination
                </span>
              </div>
              <div className="font-bold text-sm text-[#17201B]">{plan.destination.name}</div>
              <div className="text-xs text-[#53584E] bg-[#F8F9F5] p-2 rounded-lg border border-[#E2E4DC] space-y-1">
                <div className="text-[11px] font-medium text-[#17201B]">
                  Nearest Metro: {plan.destinationStation.name} (Gate {plan.metroExit.gateNumber})
                </div>
                <div className="text-[11px] text-[#6B7267]">
                  {plan.lastMile.options[0]?.description || plan.lastMile.exactInstructions}
                </div>
              </div>
            </div>
          </InfoWindow>
        )}

        {/* Floating Controls Overlay Component */}
        <MapControls
          plan={plan}
          userCoords={userCoords}
          isSatellite={isSatellite}
          setIsSatellite={setIsSatellite}
          showTransitLayer={showTransitLayer}
          setShowTransitLayer={setShowTransitLayer}
          showTrafficLayer={showTrafficLayer}
          setShowTrafficLayer={setShowTrafficLayer}
          onFocusExitGate={handleFocusExitGate}
          onFocusWaypoint={handleFocusWaypoint}
        />
      </Map>
    </div>
  );
}

export function MapComponent({ plan, userCoords, onPickMapLocation }: MapComponentProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  return (
    <div className="w-full h-full min-h-[440px]">
      <APIProvider apiKey={apiKey} libraries={['places', 'geometry']}>
        <MapView plan={plan} userCoords={userCoords} onPickMapLocation={onPickMapLocation} />
      </APIProvider>
    </div>
  );
}

