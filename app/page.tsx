'use client';

import React, { useState, useEffect, useMemo, useTransition, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FAMOUS_DESTINATIONS,
  FamousDestination,
  planMultiModalTrip,
  MultiModalTripPlan,
  RideMode,
  TravelModeChoice,
  FareBreakdown,
  LiveTrafficInfo,
  METRO_STATIONS,
  findNearestMetroStation
} from '@/lib/delhi-ncr-transit';
import {
  resolvePlaceSuggestion,
  resolveFreeformLocation,
  getRecentPlaces,
  saveRecentPlace,
  formatDistanceBetweenCoords,
  RecentPlaceItem
} from '@/lib/utils';
import { MapComponent } from '@/components/MapComponent';
import { IntrovertGuideCard } from '@/components/IntrovertGuideCard';
import { CityQuickGuide } from '@/components/CityQuickGuide';
import { LiveTransitRadarModal } from '@/components/LiveTransitRadarModal';
import { MobileAppShell } from '@/components/MobileAppShell';
import { MapPinPickerModal } from '@/components/MapPinPickerModal';
import { ActiveTicketFloatingPill } from '@/components/ActiveTicketFloatingPill';
import { triggerPwaInstall } from '@/components/PwaInstallPrompt';
import { LiquidGlass } from '@/components/ui/liquid-glass';
import { useIsAppInstalled } from '@/hooks/useIsAppInstalled';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { SplashScreen } from '@capacitor/splash-screen';
import { apiFetch } from '@/lib/api-client';
import { useStageNavigationNotifier } from '@/hooks/useStageNavigationNotifier';
import {
  TrainFront,
  Radar,
  Waypoints,
  Route,
  Milestone,
  MapPinned,
  MapPin,
  Clock,
  Globe,
  CircleDot,
  LocateFixed,
  Search,
  ArrowUpRight,
  ArrowRight,
  ArrowLeftRight,
  Headphones,
  BadgeCheck,
  Landmark,
  Layers,
  Sparkle,
  Building2,
  Utensils,
  ShoppingBag,
  X,
  ChevronRight,
  Plane,
  Compass,
  Download,
  Check,
  CheckCircle2,
  AlertCircle,
  Hospital,
  GraduationCap,
  Store,
  Loader2
} from 'lucide-react';



const COMMON_ORIGINS = [
  { name: 'DLF Cyber City, Gurgaon', lat: 28.4950, lng: 77.0890 },
  { name: 'Sector 29 / Leisure Valley, Gurgaon', lat: 28.4682, lng: 77.0655 },
  { name: 'Connaught Place, Central Delhi', lat: 28.6328, lng: 77.2195 },
  { name: 'Sector 18 / Mall of India, Noida', lat: 28.5672, lng: 77.3210 },
  { name: 'Sector 62 IT Park, Noida', lat: 28.6279, lng: 77.3649 },
  { name: 'Saket / Malviya Nagar, Delhi', lat: 28.5204, lng: 77.2014 },
  { name: 'Hauz Khas, South Delhi', lat: 28.5494, lng: 77.2001 },
  { name: 'IGI Airport Terminal 3', lat: 28.5562, lng: 77.0864 }
];

export default function HomePage() {
  const isAppInstalled = useIsAppInstalled();
  // Origin State
  const [originName, setOriginName] = useState('DLF Cyber City, Gurgaon');
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number }>({
    lat: 28.4950,
    lng: 77.0890
  });
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [detectedLocation, setDetectedLocation] = useState<{
    name: string;
    coords: { lat: number; lng: number };
    nearestStation?: string;
    distanceKm?: number;
    accuracyM?: number;
  } | null>(null);
  const [locationToast, setLocationToast] = useState<{
    message: string;
    subtext?: string;
  } | null>(null);

  // Destination Search & State
  const [searchQuery, setSearchQuery] = useState(FAMOUS_DESTINATIONS[0].name);
  const [selectedDestination, setSelectedDestination] = useState<FamousDestination | null>(
    FAMOUS_DESTINATIONS[0] // Defaults to Ambience Mall, Gurugram as requested!
  );
  const [customDestCoords, setCustomDestCoords] = useState<{
    name: string;
    lat: number;
    lng: number;
  } | null>(null);

  // Search autocomplete results for Destination
  const [placesResults, setPlacesResults] = useState<
    { id: string; name: string; formattedAddress: string; category?: string; lat?: number; lng?: number }[]
  >([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isTransitRadarOpen, setIsTransitRadarOpen] = useState(false);

  // Search autocomplete results for Departure Location (Origin)
  const [originSearchQuery, setOriginSearchQuery] = useState(originName);
  const [originPlacesResults, setOriginPlacesResults] = useState<any[]>([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [isOriginFocused, setIsOriginFocused] = useState(false);

  // Refs for robust click-outside detection (replacing intrusive backdrops)
  const originContainerRef = useRef<HTMLDivElement>(null);
  const destContainerRef = useRef<HTMLDivElement>(null);

  // Popular Places Filter & Explorer Modal State
  const [activeRegionFilter, setActiveRegionFilter] = useState<'All' | 'Gurgaon' | 'Delhi' | 'Noida' | 'Transit'>('All');
  const [isAllPlacesModalOpen, setIsAllPlacesModalOpen] = useState(false);
  const [placesModalSearch, setPlacesModalSearch] = useState('');
  const [placesModalCategory, setPlacesModalCategory] = useState<string>('All');
  const [isResolvingPlace, setIsResolvingPlace] = useState(false);
  const [placesScope, setPlacesScope] = useState<'ncr' | 'india'>('ncr');
  const [recentPlaces, setRecentPlaces] = useState<RecentPlaceItem[]>(() => getRecentPlaces());
  const [desktopMapPickerRole, setDesktopMapPickerRole] = useState<'origin' | 'destination' | null>(null);
  const [isLoadingMoreOrigin, setIsLoadingMoreOrigin] = useState(false);
  const [isLoadingMoreDest, setIsLoadingMoreDest] = useState(false);
  const originSessionRef = useRef('');
  const destSessionRef = useRef('');

  const getToken = (ref: React.MutableRefObject<string>) => {
    if (!ref.current) {
      ref.current =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
    }
    return ref.current;
  };

  // Mobile App Experience: Segmented View & Floating Map Modal
  const [isMobileMapModalOpen, setIsMobileMapModalOpen] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<'steps' | 'map'>('steps');

  // Gemini AI with Maps Grounding State
  const [aiGuide, setAiGuide] = useState<{
    routeKey?: string;
    loading: boolean;
    text: string | null;
    error: string | null;
    links: { title: string; uri: string; source?: string }[];
  }>({
    loading: false,
    text: null,
    error: null,
    links: []
  });

  // Passenger, Travel Mode & Ride Mode State
  const [travelMode, setTravelMode] = useState<TravelModeChoice>('multimodal');
  const [passengerCount, setPassengerCount] = useState<number>(1);
  const [firstMileMode, setFirstMileMode] = useState<RideMode>('cab');
  const [lastMileMode, setLastMileMode] = useState<RideMode>('cab');

  // Live Trip Estimate & Real Google Traffic State
  const [liveTripEstimate, setLiveTripEstimate] = useState<{
    routeKey?: string;
    dataSource?: 'google-live' | 'local-fallback';
    isDirectRoadRecommended?: boolean;
    resolvedRoute?: any;
    liveTraffic?: LiveTrafficInfo;
    fareBreakdown?: FareBreakdown;
    deepLinks?: {
      uberFirstMileUrl?: string;
      uberLastMileUrl?: string;
      uberDirectUrl?: string;
      rapidoUrl?: string;
      googleMapsUrl?: string;
    };
    loading: boolean;
  }>({ loading: false });

  // Calculate base route plan when origin or destination changes (pure memoized computation)
  const baseTripPlan = useMemo(() => {
    const destName = selectedDestination
      ? selectedDestination.name
      : customDestCoords?.name || 'Ambience Mall, Gurugram';
    const destLat = selectedDestination ? selectedDestination.lat : customDestCoords?.lat || 28.5049;
    const destLng = selectedDestination ? selectedDestination.lng : customDestCoords?.lng || 77.0968;

    return planMultiModalTrip(
      originName,
      originCoords.lat,
      originCoords.lng,
      destName,
      destLat,
      destLng,
      selectedDestination || undefined,
      passengerCount,
      firstMileMode,
      lastMileMode
    );
  }, [originName, originCoords, selectedDestination, customDestCoords, passengerCount, firstMileMode, lastMileMode]);

  const currentRouteKey = useMemo(() => {
    if (!baseTripPlan) return '';
    return `${baseTripPlan.origin.lat.toFixed(4)},${baseTripPlan.origin.lng.toFixed(4)}->${baseTripPlan.destination.lat.toFixed(4)},${baseTripPlan.destination.lng.toFixed(4)}:${travelMode}:${firstMileMode}:${lastMileMode}:${passengerCount}`;
  }, [baseTripPlan, travelMode, firstMileMode, lastMileMode, passengerCount]);

  // Combine base plan with live Google Directions route, traffic, and dynamic fare estimation
  const tripPlan = useMemo(() => {
    if (!baseTripPlan) return null;
    const matchingEstimate = liveTripEstimate.routeKey === currentRouteKey ? liveTripEstimate : null;
    if (!matchingEstimate) {
      return {
        ...baseTripPlan,
        travelMode,
      };
    }

    const rr = matchingEstimate.resolvedRoute;
    const keepCuratedExit =
      Boolean(selectedDestination) &&
      (!rr?.destinationStation?.id || selectedDestination?.nearestStationId === rr.destinationStation.id);

    return {
      ...baseTripPlan,
      travelMode,
      dataSource: matchingEstimate.dataSource || baseTripPlan.dataSource,
      isDirectRoadRecommended:
        matchingEstimate.isDirectRoadRecommended !== undefined
          ? matchingEstimate.isDirectRoadRecommended
          : baseTripPlan.isDirectRoadRecommended,
      originStation: rr?.originStation || baseTripPlan.originStation,
      destinationStation: rr?.destinationStation || baseTripPlan.destinationStation,
      firstMile: rr?.firstMile || baseTripPlan.firstMile,
      metroLeg: rr?.metroLeg || baseTripPlan.metroLeg,
      metroExit: keepCuratedExit ? baseTripPlan.metroExit : rr?.metroExit || baseTripPlan.metroExit,
      lastMile: rr?.lastMile || baseTripPlan.lastMile,
      directSteps: rr?.directSteps || baseTripPlan.directSteps,
      transitSteps: rr?.transitSteps || baseTripPlan.transitSteps,
      fareBreakdown: matchingEstimate.fareBreakdown || baseTripPlan.fareBreakdown,
      liveTraffic: matchingEstimate.liveTraffic || baseTripPlan.liveTraffic
    };
  }, [baseTripPlan, liveTripEstimate, currentRouteKey, travelMode, selectedDestination]);

  const stageNav = useStageNavigationNotifier(tripPlan, travelMode);

  useEffect(() => {
    try {
      if (Capacitor.isNativePlatform()) {
        void SplashScreen.hide();
      }
    } catch {}
  }, []);

  // Query /api/trip-estimate for live Google Maps transit/driving/walking routes, polylines & traffic
  useEffect(() => {
    if (!baseTripPlan) return;
    let isCancelled = false;
    const requestRouteKey = currentRouteKey;

    const fetchEstimate = async () => {
      try {
        setLiveTripEstimate(prev => ({ ...prev, loading: true }));
        const res = await apiFetch('/api/trip-estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: {
              lat: baseTripPlan.origin.lat,
              lng: baseTripPlan.origin.lng,
              name: baseTripPlan.origin.name
            },
            destination: {
              lat: baseTripPlan.destination.lat,
              lng: baseTripPlan.destination.lng,
              name: baseTripPlan.destination.name
            },
            originStation: {
              lat: baseTripPlan.originStation.lat,
              lng: baseTripPlan.originStation.lng,
              name: baseTripPlan.originStation.name,
              line: baseTripPlan.originStation.line
            },
            destinationStation: {
              lat: baseTripPlan.destinationStation.lat,
              lng: baseTripPlan.destinationStation.lng,
              name: baseTripPlan.destinationStation.name,
              line: baseTripPlan.destinationStation.line
            },
            travelMode,
            passengerCount,
            firstMileMode,
            lastMileMode,
            totalStops: baseTripPlan.metroLeg.totalStops
          })
        });

        if (isCancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setLiveTripEstimate({
              routeKey: requestRouteKey,
              dataSource: data.dataSource,
              isDirectRoadRecommended: data.isDirectRoadRecommended,
              resolvedRoute: data.resolvedRoute,
              liveTraffic: data.liveTraffic,
              fareBreakdown: data.fareBreakdown,
              deepLinks: data.deepLinks,
              loading: false
            });
          }
        }
      } catch (err) {
        console.warn('Trip estimate fetch error:', err);
      } finally {
        if (!isCancelled) {
          setLiveTripEstimate(prev => ({ ...prev, loading: false }));
        }
      }
    };

    const timer = setTimeout(fetchEstimate, 100);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [
    currentRouteKey,
    baseTripPlan,
    travelMode,
    passengerCount,
    firstMileMode,
    lastMileMode
  ]);

  // Fetch AI Transit Grounding via /api/transit-ai
  const fetchAiTransitGrounding = async (
    oName: string,
    dName: string,
    oCoords: { lat: number; lng: number },
    dCoords: { lat: number; lng: number }
  ) => {
    const reqKey = currentRouteKey;
    setAiGuide({ routeKey: reqKey, loading: true, text: null, error: null, links: [] });
    try {
      const res = await apiFetch('/api/transit-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originName: oName,
          destName: dName,
          originLat: oCoords.lat,
          originLng: oCoords.lng,
          destLat: dCoords.lat,
          destLng: dCoords.lng
        })
      });

      const data = await res.json();
      if (data.success && data.guideMarkdown) {
        setAiGuide({
          routeKey: reqKey,
          loading: false,
          text: data.guideMarkdown,
          error: null,
          links: data.groundingLinks || []
        });
      } else {
        setAiGuide({
          routeKey: reqKey,
          loading: false,
          text: null,
          error: data.error || 'Could not fetch live AI suggestions',
          links: []
        });
      }
    } catch (e: any) {
      setAiGuide({
        routeKey: reqKey,
        loading: false,
        text: null,
        error: e?.message || 'Network error',
        links: []
      });
    }
  };

  // Derive current-route AI state cleanly without synchronous effect writes
  const activeAiGuide = useMemo(() => {
    if (aiGuide.routeKey === currentRouteKey) {
      return aiGuide;
    }
    return { loading: false, text: null, error: null, links: [] };
  }, [aiGuide, currentRouteKey]);

  // Persistent, Zero-Friction Browser Geolocation with Silent Auto-Pickup
  const handleDetectLocation = async (options?: { silent?: boolean }) => {
    const isSilent = options?.silent ?? false;
    const isNative = (() => {
      try {
        return Capacitor.isNativePlatform();
      } catch {
        return false;
      }
    })();

    if (!isNative && !navigator.geolocation) {
      if (!isSilent) {
        setLocationError('Geolocation is not supported by your browser.');
        setLocationToast({
          message: 'GPS Not Supported',
          subtext: 'Your device or browser does not support geolocation detection.'
        });
        setTimeout(() => setLocationToast(null), 6000);
      }
      return;
    }

    if (!isSilent) {
      setIsDetectingLocation(true);
      setLocationError(null);
    }

    // Helper: Acquire coordinates with Capacitor native GPS first on Android, or Web Geolocation on browser
    const acquirePosition = async (): Promise<{ lat: number; lng: number; accuracyM: number }> => {
      if (isNative) {
        try {
          const permStatus = await Geolocation.checkPermissions();
          if (permStatus.location !== 'granted' && permStatus.coarseLocation !== 'granted') {
            const reqStatus = await Geolocation.requestPermissions();
            if (reqStatus.location !== 'granted' && reqStatus.coarseLocation !== 'granted') {
              throw new Error('PERMISSION_DENIED');
            }
          }
          const nativePos = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: isSilent ? 8000 : 12000,
            maximumAge: isSilent ? 300000 : 30000
          });
          return {
            lat: nativePos.coords.latitude,
            lng: nativePos.coords.longitude,
            accuracyM: Math.round(nativePos.coords.accuracy || 25)
          };
        } catch (nativeErr: any) {
          const msg = String(nativeErr?.message || nativeErr || '');
          if (msg === 'PERMISSION_DENIED' || /denied|permission/i.test(msg)) {
            throw new Error('PERMISSION_DENIED');
          }
          if (/timeout/i.test(msg)) {
            throw new Error('TIMEOUT');
          }
          throw new Error('POSITION_UNAVAILABLE');
        }
      }

      return new Promise((resolve, reject) => {
        // High Accuracy GPS (Hardware/Satellite lock)
        navigator.geolocation.getCurrentPosition(
          pos => {
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracyM: Math.round(pos.coords.accuracy)
            });
          },
          highAccErr => {
            // If the user denied permission, stop immediately
            if (highAccErr.code === highAccErr.PERMISSION_DENIED) {
              reject(new Error('PERMISSION_DENIED'));
              return;
            }

            console.warn('High accuracy GPS timed out or unavailable, attempting standard network/Wi-Fi fix...', highAccErr);

            // Standard Network/Wi-Fi Geolocation (Cell tower / Wi-Fi triangulation)
            navigator.geolocation.getCurrentPosition(
              netPos => {
                resolve({
                  lat: netPos.coords.latitude,
                  lng: netPos.coords.longitude,
                  accuracyM: Math.round(netPos.coords.accuracy)
                });
              },
              netErr => {
                if (netErr.code === netErr.PERMISSION_DENIED) {
                  reject(new Error('PERMISSION_DENIED'));
                } else if (netErr.code === netErr.POSITION_UNAVAILABLE) {
                  reject(new Error('POSITION_UNAVAILABLE'));
                } else if (netErr.code === netErr.TIMEOUT) {
                  reject(new Error('TIMEOUT'));
                } else {
                  reject(new Error(netErr.message || 'UNKNOWN_ERROR'));
                }
              },
              {
                enableHighAccuracy: false,
                timeout: isSilent ? 6000 : 10000,
                maximumAge: isSilent ? 300000 : 60000
              }
            );
          },
          {
            enableHighAccuracy: true,
            timeout: isSilent ? 8000 : 12000,
            maximumAge: isSilent ? 300000 : 30000
          }
        );
      });
    };

    try {
      const { lat, lng, accuracyM } = await acquirePosition();

      // Set origin coordinates immediately
      setOriginCoords({ lat, lng });

      // Calculate nearest metro station immediately
      const nearest = findNearestMetroStation(lat, lng);
      let resolvedName = `Near ${nearest.station.name} (${nearest.station.line})`;
      let nearestStationName = nearest.station.name;
      let distance = nearest.distanceKm;

      // Reverse geocode to exact street/block/building address
      try {
        const res = await apiFetch(`/api/geocode?lat=${lat}&lng=${lng}`);
        if (res.ok) {
          const data = await res.json();
          if (data.locationName) {
            resolvedName = data.locationName;
          }
          if (data.nearestStation) {
            nearestStationName = data.nearestStation;
          }
          if (data.distanceKm !== undefined) {
            distance = data.distanceKm;
          }
        }
      } catch (e) {
        console.warn('Geocoding fetch error:', e);
      }

      const detectedInfo = {
        name: resolvedName,
        coords: { lat, lng },
        nearestStation: nearestStationName,
        distanceKm: distance,
        accuracyM
      };

      setOriginName(resolvedName);
      setDetectedLocation(detectedInfo);
      setLocationError(null);
      setIsDetectingLocation(false);

      // Persist in localStorage so subsequent page visits remember your exact location immediately
      try {
        localStorage.setItem('metronav_user_location', JSON.stringify(detectedInfo));
        localStorage.setItem('metronav_location_permission', 'granted');
      } catch {}

      // Show prominent toast notification confirming exact pinpoint location if manually triggered
      if (!isSilent) {
        setLocationToast({
          message: resolvedName,
          subtext: `Nearest Metro: ${nearestStationName} (~${distance} km away) • GPS Accuracy: ±${accuracyM}m`
        });
        setTimeout(() => setLocationToast(null), 6000);
      }
    } catch (err: any) {
      setIsDetectingLocation(false);

      if (err.message === 'PERMISSION_DENIED') {
        try {
          localStorage.setItem('metronav_location_permission', 'denied');
        } catch {}
      }

      if (!isSilent) {
        let userFriendlyTitle = 'Unable to pinpoint your GPS location';
        let subtext = 'Please check your connection or choose a starting point below.';

        if (err.message === 'PERMISSION_DENIED') {
          userFriendlyTitle = 'Location Access Denied';
          subtext = 'Please enable location permission in your browser address bar so we can detect your exact spot.';
        } else if (err.message === 'POSITION_UNAVAILABLE') {
          userFriendlyTitle = 'GPS Signal Unavailable';
          subtext = 'Your device cannot lock your coordinates. Please check your GPS/Wi-Fi toggle and retry.';
        } else if (err.message === 'TIMEOUT') {
          userFriendlyTitle = 'GPS Request Timed Out';
          subtext = 'Could not acquire coordinates in time. Please check your signal and tap to retry.';
        }

        setLocationError(subtext);
        setLocationToast({
          message: userFriendlyTitle,
          subtext: subtext
        });
        setTimeout(() => setLocationToast(null), 7000);
      }
    }
  };

  // Persistent Auto-Pickup: Always load user location on startup and refresh silently if permission granted
  useEffect(() => {
    // 1. Immediately restore saved location from localStorage (0ms instant display)
    try {
      const saved = localStorage.getItem('metronav_user_location');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name && parsed.coords?.lat && parsed.coords?.lng) {
          setOriginName(parsed.name);
          setOriginCoords(parsed.coords);
          setDetectedLocation(parsed);
        }
      }
    } catch {}

    // 2. Query browser permission status and silently refresh location
    const initLocation = async () => {
      if (typeof window === 'undefined' || !navigator.geolocation) return;

      if (navigator.permissions && navigator.permissions.query) {
        try {
          const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName });

          // Keep in sync if permission changes
          perm.onchange = () => {
            if (perm.state === 'granted') {
              handleDetectLocation({ silent: true });
            }
          };

          if (perm.state === 'granted') {
            // Permission already granted! Silently refresh in background with zero prompts
            handleDetectLocation({ silent: true });
            return;
          }

          if (perm.state === 'prompt') {
            const previouslyDenied = localStorage.getItem('metronav_location_permission') === 'denied';
            if (!previouslyDenied) {
              // Ask once for permission on first visit
              handleDetectLocation({ silent: false });
            }
            return;
          }

          // If 'denied', do not prompt or show error toasts automatically
          return;
        } catch {
          // Fall through to fallback below
        }
      }

      // Fallback for browsers without permissions.query
      const savedPerm = localStorage.getItem('metronav_location_permission');
      if (savedPerm === 'granted') {
        handleDetectLocation({ silent: true });
      } else if (savedPerm !== 'denied') {
        handleDetectLocation({ silent: false });
      }
    };

    initLocation();
  }, []);

  // Handle destination live search query (Uber-style hyperlocal autocomplete with distance & AbortController)
  useEffect(() => {
    const q = searchQuery.trim();
    if (!isSearchFocused || q.length < 2) {
      if (q.length < 2) setPlacesResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsSearchingPlaces(true);
      try {
        const qs = new URLSearchParams({
          q,
          lat: String(originCoords.lat),
          lng: String(originCoords.lng),
          scope: placesScope,
          sessionToken: getToken(destSessionRef),
        });
        const res = await apiFetch(`/api/places?${qs.toString()}`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setPlacesResults(data.places || []);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') console.error(err);
      } finally {
        if (!controller.signal.aborted) setIsSearchingPlaces(false);
      }
    }, 160);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, isSearchFocused, originCoords.lat, originCoords.lng, placesScope]);

  // Handle origin live search query
  useEffect(() => {
    const q = originSearchQuery.trim();
    if (!isOriginFocused || q.length < 2) {
      if (q.length < 2) setOriginPlacesResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsSearchingOrigin(true);
      try {
        const qs = new URLSearchParams({
          q,
          lat: String(originCoords.lat),
          lng: String(originCoords.lng),
          scope: placesScope,
          sessionToken: getToken(originSessionRef),
        });
        const res = await apiFetch(`/api/places?${qs.toString()}`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setOriginPlacesResults(data.places || []);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') console.warn('Origin search error:', err);
      } finally {
        if (!controller.signal.aborted) setIsSearchingOrigin(false);
      }
    }, 160);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [originSearchQuery, isOriginFocused, originCoords.lat, originCoords.lng, placesScope]);

  // Synchronize originSearchQuery when originName changes via GPS or preset pills
  useEffect(() => {
    setOriginSearchQuery(originName);
  }, [originName]);

  // Clean outside-click handler for both Origin and Destination dropdowns
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (originContainerRef.current && !originContainerRef.current.contains(e.target as Node)) {
        setIsOriginFocused(false);
      }
      if (destContainerRef.current && !destContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Category Icon helper for dropdown items
  const renderPlaceCategoryIcon = (place: any) => {
    const text = `${place.name} ${place.category || ''} ${place.formattedAddress || ''}`.toLowerCase();
    if (text.includes('hospital') || text.includes('clinic') || text.includes('medanta') || text.includes('fortis') || text.includes('apollo') || text.includes('max ')) {
      return <Hospital className="w-4 h-4 text-red-600" />;
    }
    if (text.includes('college') || text.includes('university') || text.includes('campus') || text.includes('institute')) {
      return <GraduationCap className="w-4 h-4 text-indigo-600" />;
    }
    if (text.includes('mall') || text.includes('shopping') || text.includes('plaza') || text.includes('promenade') || text.includes('citywalk')) {
      return <ShoppingBag className="w-4 h-4 text-[#B9552C]" />;
    }
    if (text.includes('metro') || text.includes('station') || text.includes('railway')) {
      return <TrainFront className="w-4 h-4 text-[#143428]" />;
    }
    if (text.includes('restaurant') || text.includes('cafe') || text.includes('food') || text.includes('dhaba') || text.includes('kitchen')) {
      return <Utensils className="w-4 h-4 text-[#B9552C]" />;
    }
    if (text.includes('cyber') || text.includes('tech') || text.includes('tower') || text.includes('horizon') || text.includes('building') || text.includes('complex')) {
      return <Building2 className="w-4 h-4 text-[#143428]" />;
    }
    return <MapPinned className="w-4 h-4 text-[#143428]" strokeWidth={1.75} />;
  };

  // Select an origin place from dropdown (Google Places or Curated)
  const handleSelectOriginSearchResult = async (rawPlace: any) => {
    let place = rawPlace;
    if (place?.needsResolve || typeof place?.lat !== 'number' || typeof place?.lng !== 'number') {
      setIsResolvingPlace(true);
      const resolved = await resolvePlaceSuggestion(place, {
        sessionToken: getToken(originSessionRef),
        originCoords,
      });
      setIsResolvingPlace(false);
      if (!resolved) return;
      place = resolved;
    }
    originSessionRef.current = '';

    const chosenName = place.name;
    setOriginName(chosenName);
    setOriginSearchQuery(chosenName);
    if (typeof place.lat === 'number' && typeof place.lng === 'number') {
      setOriginCoords({ lat: place.lat, lng: place.lng });
      saveRecentPlace(place);
      setRecentPlaces(getRecentPlaces());
      try {
        localStorage.setItem(
          'metronav_user_location',
          JSON.stringify({
            name: chosenName,
            coords: { lat: place.lat, lng: place.lng },
            nearestStation: place.nearestStation?.name,
            distanceKm: place.nearestStation?.distanceKm
          })
        );
      } catch {}
    }
    setOriginPlacesResults([]);
    setIsOriginFocused(false);
    setLocationError(null);
  };

  // Select a famous landmark
  const handleSelectFamousDest = (dest: FamousDestination) => {
    setSelectedDestination(dest);
    setCustomDestCoords(null);
    setSearchQuery(dest.name);
    setPlacesResults([]);
    setIsSearchFocused(false);
  };

  // Select a place from search dropdown (Google Places or Curated)
  const handleSelectSearchResult = async (rawPlace: any) => {
    let place = rawPlace;
    if (!place?.curatedData && (place?.needsResolve || typeof place?.lat !== 'number' || typeof place?.lng !== 'number')) {
      setIsResolvingPlace(true);
      const resolved = await resolvePlaceSuggestion(place, {
        sessionToken: getToken(destSessionRef),
        originCoords,
      });
      setIsResolvingPlace(false);
      if (!resolved) return;
      place = resolved;
    }
    destSessionRef.current = '';

    if (typeof place?.lat === 'number' && typeof place?.lng === 'number') {
      saveRecentPlace(place);
      setRecentPlaces(getRecentPlaces());
    }

    if (place.curatedData) {
      handleSelectFamousDest(place.curatedData);
      return;
    }

    const matchedCurated = FAMOUS_DESTINATIONS.find(
      d =>
        d.id === place.curatedId ||
        d.name.toLowerCase() === place.name.toLowerCase() ||
        (place.lat && place.lng && Math.abs(d.lat - place.lat) < 0.005 && Math.abs(d.lng - place.lng) < 0.005)
    );

    if (matchedCurated) {
      handleSelectFamousDest(matchedCurated);
      return;
    }

    if (typeof place.lat === 'number' && typeof place.lng === 'number') {
      setSelectedDestination(null);
      setCustomDestCoords({
        name: place.name,
        lat: place.lat,
        lng: place.lng
      });
    }
    setSearchQuery(place.name);
    setPlacesResults([]);
    setIsSearchFocused(false);
  };

  // Deep "Get more results for <query>" action for Desktop dropdowns
  const handleLoadMoreDesktopResults = async (role: 'origin' | 'destination') => {
    const q = (role === 'origin' ? originSearchQuery : searchQuery).trim();
    if (q.length < 2) return;
    if (role === 'origin') setIsLoadingMoreOrigin(true);
    else setIsLoadingMoreDest(true);
    try {
      const qs = new URLSearchParams({
        q,
        lat: String(originCoords.lat),
        lng: String(originCoords.lng),
        scope: placesScope,
        mode: 'more',
      });
      const res = await apiFetch(`/api/places?${qs.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const extra: any[] = data.places || [];
        const mergeList = (prev: any[]) => {
          const out = [...prev];
          const seen = new Set(out.map((p) => `${p.name?.toLowerCase()}-${p.formattedAddress?.slice(0, 20).toLowerCase()}`));
          for (const item of extra) {
            const k = `${item.name?.toLowerCase()}-${item.formattedAddress?.slice(0, 20).toLowerCase()}`;
            if (!seen.has(k)) {
              seen.add(k);
              out.push(item);
            }
          }
          return out;
        };
        if (role === 'origin') setOriginPlacesResults(mergeList);
        else setPlacesResults(mergeList);
      }
    } finally {
      if (role === 'origin') setIsLoadingMoreOrigin(false);
      else setIsLoadingMoreDest(false);
    }
  };

  // Generic destination selector handling both curated landmarks and arbitrary Google Maps places
  const handleSelectAnyDestination = (placeOrDest: any) => {
    if (placeOrDest.curatedData) {
      handleSelectFamousDest(placeOrDest.curatedData);
    } else if (placeOrDest.nearestStationId && typeof placeOrDest.nearestStationId === 'string' && !placeOrDest.curatedData) {
      handleSelectFamousDest(placeOrDest as FamousDestination);
    } else {
      void handleSelectSearchResult(placeOrDest);
    }
  };

  // Submit freeform address or Enter key in Origin input
  const handleSubmitOriginQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = originSearchQuery.trim();
    if (!q || isResolvingPlace) return;
    if (originPlacesResults.length > 0) {
      await handleSelectOriginSearchResult(originPlacesResults[0]);
      return;
    }
    setIsResolvingPlace(true);
    try {
      const resolved = await resolveFreeformLocation(q, {
        originCoords,
        scope: placesScope,
        sessionToken: getToken(originSessionRef),
      });
      if (resolved) {
        await handleSelectOriginSearchResult(resolved);
      }
    } finally {
      setIsResolvingPlace(false);
    }
  };

  // Submit freeform address or Enter key in Destination input
  const handleSubmitDestQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q || isResolvingPlace) return;
    if (placesResults.length > 0) {
      await handleSelectSearchResult(placesResults[0]);
      return;
    }
    setIsResolvingPlace(true);
    try {
      const resolved = await resolveFreeformLocation(q, {
        originCoords,
        scope: placesScope,
        sessionToken: getToken(destSessionRef),
      });
      if (resolved) {
        await handleSelectSearchResult(resolved);
      }
    } finally {
      setIsResolvingPlace(false);
    }
  };

  // Swap Origin and Destination cleanly
  const handleSwapLocations = () => {
    const prevOriginName = originName;
    const prevOriginCoords = { ...originCoords };
    const destName = selectedDestination
      ? selectedDestination.name
      : customDestCoords?.name || 'Ambience Mall, Gurugram';
    const destCoords = selectedDestination
      ? { lat: selectedDestination.lat, lng: selectedDestination.lng }
      : customDestCoords
      ? { lat: customDestCoords.lat, lng: customDestCoords.lng }
      : { lat: 28.5049, lng: 77.0968 };

    setOriginName(destName);
    setOriginSearchQuery(destName);
    setOriginCoords(destCoords);

    setSelectedDestination(null);
    setCustomDestCoords({
      name: prevOriginName,
      lat: prevOriginCoords.lat,
      lng: prevOriginCoords.lng,
    });
    setSearchQuery(prevOriginName);
    setIsOriginFocused(false);
    setIsSearchFocused(false);
  };

  // Set Origin or Destination from clicking anywhere on the Google Map
  const handlePickMapLocation = (
    role: 'origin' | 'destination',
    name: string,
    coords: { lat: number; lng: number }
  ) => {
    if (role === 'origin') {
      setOriginName(name);
      setOriginSearchQuery(name);
      setOriginCoords(coords);
      setLocationError(null);
      try {
        localStorage.setItem(
          'metronav_user_location',
          JSON.stringify({ name, coords })
        );
      } catch {}
    } else {
      setSelectedDestination(null);
      setCustomDestCoords({ name, lat: coords.lat, lng: coords.lng });
      setSearchQuery(name);
      setPlacesResults([]);
      setIsSearchFocused(false);
    }
  };

  return (
    <>
      {/* Floating GPS Location Detection Toast */}
      <AnimatePresence>
        {locationToast && (
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-3 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md z-[115] p-3.5 rounded-2xl bg-[#143428] text-white border border-emerald-400/50 shadow-2xl flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#5ee9b5] text-[#0d211a] flex items-center justify-center font-bold shrink-0 shadow-xs">
                <Check className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                    GPS Location Detected
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-extrabold text-white truncate mt-0.5">
                  {locationToast.message}
                </h4>
                {locationToast.subtext && (
                  <p className="text-[11px] text-emerald-200/80 truncate">
                    {locationToast.subtext}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLocationToast(null)}
              className="text-emerald-200/60 hover:text-white p-1 rounded-lg transition shrink-0 cursor-pointer"
              aria-label="Dismiss toast"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile-First Experience (<1024px) */}
      <MobileAppShell
        originName={originName}
        originCoords={originCoords}
        detectedLocation={detectedLocation}
        locationError={locationError}
        selectedDestination={selectedDestination}
        customDestCoords={customDestCoords}
        tripPlan={tripPlan}
        travelMode={travelMode}
        onTravelModeChange={setTravelMode}
        passengerCount={passengerCount}
        onPassengerCountChange={setPassengerCount}
        firstMileMode={firstMileMode}
        onFirstMileModeChange={setFirstMileMode}
        lastMileMode={lastMileMode}
        onLastMileModeChange={setLastMileMode}
        deepLinks={liveTripEstimate.deepLinks}
        aiGuide={activeAiGuide}
        isDetectingLocation={isDetectingLocation}
        onDetectLocation={() => handleDetectLocation({ silent: false })}
        onSelectOrigin={(name, coords) => {
          setOriginName(name);
          setOriginCoords(coords);
          try {
            localStorage.setItem(
              'metronav_user_location',
              JSON.stringify({
                name,
                coords
              })
            );
          } catch {}
        }}
        onSelectDestination={handleSelectAnyDestination}
        onSwapLocations={handleSwapLocations}
        onPickMapLocation={handlePickMapLocation}
        onOpenTransitRadar={() => setIsTransitRadarOpen(true)}
        stageNav={stageNav}
        onRequestAiRefresh={() => {
          if (tripPlan) {
            fetchAiTransitGrounding(
              tripPlan.origin.name,
              tripPlan.destination.name,
              { lat: tripPlan.origin.lat, lng: tripPlan.origin.lng },
              { lat: tripPlan.destination.lat, lng: tripPlan.destination.lng }
            );
          }
        }}
      />

      {/* Desktop Dashboard Experience (>=1024px) */}
      <div className="hidden lg:block min-h-screen bg-[#F4F5F0] dark:bg-[#000000] text-[#17201B] dark:text-[#F2F5F3] antialiased selection:bg-[#143428] selection:text-white pb-20 relative overflow-x-hidden">
        {/* Top Application Header with Apple iOS Liquid Glass Specular Reflection */}
        <header className="sticky top-0 z-40 ios-liquid-glass border-b border-white/70 dark:border-white/10 shadow-[0_8px_32px_-4px_rgba(20,52,40,0.08)] relative">
          {/* Apple Specular Top Rim */}
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white dark:via-white/15 to-transparent pointer-events-none" />

          <div className="w-full max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-10 xl:px-12 h-16 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#143428] dark:bg-[#0E251D] border border-emerald-400/30 text-white flex items-center justify-center shadow-xs shrink-0">
                <TrainFront className="w-5 h-5 text-[#5ee9b5]" strokeWidth={1.85} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[#17201B] dark:text-white font-sans leading-none shrink-0">
                    MetroNav
                  </span>
                  <span className="hidden sm:inline-flex whitespace-nowrap px-2.5 py-0.5 rounded-full bg-[#143428]/10 dark:bg-emerald-500/15 border border-[#143428]/20 dark:border-emerald-400/30 text-[#143428] dark:text-emerald-300 text-[10px] font-bold tracking-wide uppercase shrink-0 leading-tight">
                    Delhi • Gurgaon • Noida
                  </span>
                </div>
                <p className="text-[11px] text-[#6B7267] dark:text-[#9BA8A0] font-medium hidden sm:block truncate mt-0.5">
                  Full-coverage Google Maps routing • Metro, Rapid Metro, Aqua Line, Bus &amp; Cab/Walk
                </p>
                <p className="text-[10px] text-[#6B7267] dark:text-[#9BA8A0] font-bold uppercase tracking-wider sm:hidden leading-none mt-1 truncate">
                  Delhi • Gurgaon • Noida
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
              {/* Theme Toggle Button */}
              <ThemeToggle variant="pill" showLabel />

              {/* Download / Install App Button - hidden when app is installed */}
              {!isAppInstalled && (
                <button
                  onClick={triggerPwaInstall}
                  className="ios-liquid-pill flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-[#143428] dark:text-emerald-300 text-xs font-bold transition shadow-xs shrink-0 cursor-pointer group border border-white/60 dark:border-white/10"
                  title="Download & Install App (PWA)"
                >
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#143428] dark:text-emerald-300 group-hover:-translate-y-0.5 transition-transform" strokeWidth={2} />
                  <span>Download App</span>
                </button>
              )}

              <button
                onClick={() => setIsTransitRadarOpen(true)}
                className="ios-liquid-pill flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-[#143428] to-[#1A3E31] dark:from-emerald-950 dark:to-[#143428] text-white text-xs font-bold transition shadow-xs shrink-0 cursor-pointer group border border-white/20"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                <Radar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300 group-hover:rotate-45 transition-transform" strokeWidth={1.75} />
                <span className="hidden xs:inline">Live Transit Radar</span>
                <span className="xs:hidden">Radar</span>
              </button>

              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl ios-liquid-pill text-[#17201B] dark:text-emerald-200 text-xs font-semibold">
                <Headphones className="w-3.5 h-3.5 text-[#143428] dark:text-emerald-400" strokeWidth={1.75} />
                <span>Quiet Protocol</span>
                <BadgeCheck className="w-3.5 h-3.5 text-[#143428] dark:text-emerald-400" strokeWidth={2} />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Hub - Expanded Wide Canvas */}
        <main className="w-full max-w-[1720px] mx-auto px-3.5 sm:px-6 lg:px-10 xl:px-12 pt-4 sm:pt-6 relative z-10">
          {/* Network Status Banner */}
          <LiquidGlass
            radius={16}
            bevelDepth={59}
            scale={120}
            aberration={14}
            frost={2.8}
            tint={0.06}
            className="mb-4 sm:mb-6 rounded-xl sm:rounded-2xl border border-white/80 dark:border-white/10 px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-3 text-xs shadow-sm text-[#53584E] dark:text-[#D1DDD6] relative overflow-hidden"
          >
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/15 to-transparent pointer-events-none" />
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 whitespace-nowrap min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#143428]/10 dark:bg-emerald-500/20 text-[#143428] dark:text-[#5ee9b5] text-[10px] sm:text-[11px] font-bold border border-[#143428]/20 dark:border-emerald-400/30 shrink-0 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-[#143428] dark:bg-[#5ee9b5]"></span>
                Live Normal
              </span>
              <span className="flex items-center gap-1.5 text-[11px] shrink-0 font-medium text-[#17201B] dark:text-[#F3F5EE]">
                <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0"></span>
                <span>Yellow Line (~3m)</span>
              </span>
              <span className="text-[#8E9487] dark:text-[#6B7A70] shrink-0">•</span>
              <span className="flex items-center gap-1.5 text-[11px] shrink-0 font-medium text-[#17201B] dark:text-[#F3F5EE]">
                <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0"></span>
                <span>Rapid Metro (~4m)</span>
              </span>
              <span className="text-[#8E9487] dark:text-[#6B7A70] shrink-0">•</span>
              <span className="flex items-center gap-1.5 text-[11px] shrink-0 font-medium text-[#17201B] dark:text-[#F3F5EE]">
                <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                <span>Blue Line (~3m)</span>
              </span>
              <span className="text-[#8E9487] dark:text-[#6B7A70] hidden md:inline shrink-0">•</span>
              <span className="text-[#6B7267] dark:text-[#9BAAA0] hidden md:inline text-[11px] shrink-0">
                Sikanderpur skywalk air-conditioned
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsTransitRadarOpen(true)}
              className="ios-liquid-pill inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold text-[#143428] dark:text-[#5ee9b5] hover:text-[#B9552C] dark:hover:text-[#FF7A45] shrink-0 transition whitespace-nowrap"
            >
              <span>All 7 Lines</span>
              <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </LiquidGlass>

          {/* Navigation Query Bar (Origin & Destination Selection) */}
          <section className="ios-liquid-glass rounded-2xl sm:rounded-[28px] p-4 sm:p-6 xl:p-8 border border-white/85 dark:border-white/10 shadow-[0_20px_50px_-8px_rgba(20,52,40,0.12)] dark:shadow-[0_20px_50px_-8px_rgba(0,0,0,0.65)] mb-5 sm:mb-8 relative z-30">
            {/* Apple Specular Top Rim */}
            <div className="absolute inset-x-6 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white dark:via-white/15 to-transparent pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 xl:gap-8 relative z-10">
              {/* Origin Location Selector with Live Google Places Autocomplete */}
              <div className="space-y-2.5 relative z-40" ref={originContainerRef}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#17201B] dark:text-[#E6EEE9] flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-[#143428]/10 dark:bg-emerald-500/20 text-[#143428] dark:text-[#5ee9b5] flex items-center justify-center">
                      <CircleDot className="w-3.5 h-3.5" strokeWidth={2} />
                    </div>
                    <span>Departure Location</span>
                  </label>
                  <button
                    onClick={() => handleDetectLocation({ silent: false })}
                    disabled={isDetectingLocation}
                    className="ios-liquid-pill text-xs font-bold text-[#143428] dark:text-[#5ee9b5] hover:text-[#B9552C] dark:hover:text-[#FF7A45] flex items-center gap-1.5 transition px-2.5 py-1 rounded-lg cursor-pointer"
                  >
                    <LocateFixed className={`w-3.5 h-3.5 ${isDetectingLocation ? 'animate-spin' : ''}`} strokeWidth={1.75} />
                    <span>{isDetectingLocation ? 'Detecting...' : 'Use GPS'}</span>
                  </button>
                </div>

                <div className="relative">
                  <form onSubmit={handleSubmitOriginQuery} className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8E9487] dark:text-[#9BAAA0]">
                      <CircleDot className="w-4 h-4 text-[#143428] dark:text-[#5ee9b5]" strokeWidth={2} />
                    </div>
                    <input
                      type="text"
                      value={originSearchQuery}
                      onChange={e => {
                        const val = e.target.value;
                        setOriginSearchQuery(val);
                        if (!isOriginFocused) setIsOriginFocused(true);
                        if (val.trim().length < 2) {
                          setOriginPlacesResults([]);
                        }
                      }}
                      onFocus={() => setIsOriginFocused(true)}
                      placeholder="Type any address, sector, landmark in Delhi / Gurgaon / Noida..."
                      className="w-full pl-10 pr-24 py-3.5 rounded-xl ios-liquid-input text-sm text-[#17201B] dark:text-[#F3F5EE] font-medium placeholder:text-[#8E9487] dark:placeholder:text-[#768478] shadow-xs"
                    />

                    <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
                      {(isSearchingOrigin || isResolvingPlace) && (
                        <div className="w-4 h-4 rounded-full border-2 border-[#143428] dark:border-[#5ee9b5] border-t-transparent animate-spin mr-1"></div>
                      )}
                      {originSearchQuery.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setOriginSearchQuery('');
                            setOriginPlacesResults([]);
                            setIsOriginFocused(true);
                          }}
                          className="p-1 rounded-md text-[#8E9487] dark:text-[#9BAAA0] hover:text-[#17201B] dark:hover:text-white hover:bg-[#EAECE4] dark:hover:bg-white/10 transition cursor-pointer"
                          title="Clear origin"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {originSearchQuery.trim().length >= 2 && (
                        <button
                          type="submit"
                          disabled={isResolvingPlace}
                          className="px-2.5 py-1 rounded-lg bg-[#143428] dark:bg-emerald-500 text-white dark:text-[#061C12] text-[11px] font-bold hover:bg-[#1E4837] dark:hover:bg-emerald-400 disabled:opacity-50 cursor-pointer"
                        >
                          Go
                        </button>
                      )}
                    </div>
                  </form>

                  {/* Live Origin Autocomplete Dropdown */}
                  <AnimatePresence>
                    {isOriginFocused && (
                      <motion.div
                        key="origin-dropdown-card"
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute top-full left-0 right-0 mt-2 ios-liquid-glass-thin rounded-2xl shadow-2xl border border-white/90 dark:border-white/15 p-2 z-50 max-h-96 overflow-y-auto ring-1 ring-[#143428]/10 dark:ring-white/10"
                      >
                      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#E2E4DC] dark:border-white/10 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7267] dark:text-[#9BAAA0] flex items-center gap-1.5">
                          {originSearchQuery.trim().length >= 2 ? (
                            <>
                              <Compass className="w-3 h-3 text-[#143428] dark:text-[#5ee9b5]" />
                              <span>Starting Point Suggestions ({originPlacesResults.length} found)</span>
                            </>
                          ) : (
                            <span>Popular Starting Hubs (Delhi-NCR)</span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsOriginFocused(false)}
                          className="text-[10px] text-[#6B7267] dark:text-[#9BAAA0] hover:text-[#17201B] dark:hover:text-white font-semibold cursor-pointer"
                        >
                          Close
                        </button>
                      </div>

                      {originSearchQuery.trim().length >= 2 ? (
                        <div className="divide-y divide-[#E2E4DC]/70 dark:divide-white/10">
                          {originPlacesResults.map((p: any) => {
                            const distLabel =
                              p.distanceText ||
                              (typeof p.lat === 'number' && typeof p.lng === 'number'
                                ? formatDistanceBetweenCoords(originCoords.lat, originCoords.lng, p.lat, p.lng)
                                : '');
                            return (
                            <button
                              key={p.id}
                              onClick={() => handleSelectOriginSearchResult(p)}
                              className="w-full text-left p-2.5 rounded-xl hover:bg-[#F8F9F5] dark:hover:bg-white/10 text-xs flex items-center justify-between transition group cursor-pointer"
                            >
                              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                <div className="w-11 flex flex-col items-center shrink-0 gap-0.5 pt-0.5">
                                  <div className="w-6 h-6 rounded-full bg-[#F4F5F0] dark:bg-[#16231D] group-hover:bg-[#EAECE4] dark:group-hover:bg-[#1E2E26] flex items-center justify-center border border-[#E2E4DC] dark:border-white/10">
                                    {renderPlaceCategoryIcon(p)}
                                  </div>
                                  {distLabel && (
                                    <span className="text-[10px] font-bold text-[#6B7267] dark:text-[#9BAAA0] tabular-nums whitespace-nowrap">
                                      {distLabel}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-[#17201B] dark:text-[#F3F5EE] text-xs">{p.name}</span>
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider bg-[#F4F5F0] dark:bg-white/10 text-[#143428] dark:text-[#5ee9b5] border border-[#D5D8CD] dark:border-white/10">
                                      {p.city}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-[#6B7267] dark:text-[#9BAAA0] truncate mt-0.5">
                                    {p.formattedAddress}
                                  </div>
                                </div>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-[#8E9487] dark:text-[#9BAAA0] group-hover:text-[#143428] dark:group-hover:text-[#5ee9b5] shrink-0 ml-2 transition" />
                            </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => setPlacesScope((prev) => (prev === 'ncr' ? 'india' : 'ncr'))}
                            className="w-full text-left px-3 py-2.5 hover:bg-[#F8F9F5] dark:hover:bg-white/10 text-xs font-semibold text-[#17201B] dark:text-[#F3F5EE] flex items-center gap-2.5 cursor-pointer"
                          >
                            <Globe className="w-3.5 h-3.5 text-[#143428] dark:text-[#5ee9b5] shrink-0" />
                            <span>{placesScope === 'ncr' ? 'Search in a different city' : 'Searching All India (click for Delhi NCR)'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLoadMoreDesktopResults('origin')}
                            disabled={isLoadingMoreOrigin}
                            className="w-full text-left px-3 py-2.5 hover:bg-[#F8F9F5] dark:hover:bg-white/10 text-xs font-bold text-[#143428] dark:text-[#5ee9b5] flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5 truncate">
                              {isLoadingMoreOrigin ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                              ) : (
                                <Search className="w-3.5 h-3.5 shrink-0" />
                              )}
                              <span className="truncate">Get more results for &quot;{originSearchQuery.trim()}&quot;</span>
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsOriginFocused(false);
                              setDesktopMapPickerRole('origin');
                            }}
                            className="w-full text-left px-3 py-2.5 hover:bg-[#F8F9F5] dark:hover:bg-white/10 text-xs font-bold text-[#17201B] dark:text-[#F3F5EE] flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <MapPin className="w-3.5 h-3.5 text-[#143428] dark:text-[#5ee9b5] shrink-0" />
                              <span>Set location on map</span>
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-[#8E9487] dark:text-[#9BAAA0]" />
                          </button>
                        </div>
                      ) : (
                        <div className="divide-y divide-[#E2E4DC]/60 dark:divide-white/10">
                          {recentPlaces.slice(0, 4).map((rp) => (
                            <button
                              key={`rec-o-${rp.id}`}
                              onClick={() => handleSelectOriginSearchResult(rp)}
                              className="w-full text-left px-2.5 py-2 hover:bg-[#F8F9F5] dark:hover:bg-white/10 text-xs flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Clock className="w-3.5 h-3.5 text-[#6B7267] dark:text-[#9BAAA0] shrink-0" />
                                <div className="min-w-0">
                                  <div className="font-bold text-[#17201B] dark:text-[#F3F5EE] truncate">{rp.name}</div>
                                  <div className="text-[11px] text-[#6B7267] dark:text-[#9BAAA0] truncate">{rp.formattedAddress}</div>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold text-[#6B7267] dark:text-[#9BAAA0] shrink-0">
                                {formatDistanceBetweenCoords(originCoords.lat, originCoords.lng, rp.lat, rp.lng)}
                              </span>
                            </button>
                          ))}
                          {COMMON_ORIGINS.map((orig, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setOriginName(orig.name);
                                setOriginSearchQuery(orig.name);
                                setOriginCoords({ lat: orig.lat, lng: orig.lng });
                                try {
                                  localStorage.setItem(
                                    'metronav_user_location',
                                    JSON.stringify({
                                      name: orig.name,
                                      coords: { lat: orig.lat, lng: orig.lng }
                                    })
                                  );
                                } catch {}
                                setIsOriginFocused(false);
                                setLocationError(null);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-[#F8F9F5] dark:hover:bg-white/10 text-xs flex items-center justify-between transition cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5">
                                <CircleDot className="w-3.5 h-3.5 text-[#143428] dark:text-[#5ee9b5] shrink-0" strokeWidth={2} />
                                <span className="font-bold text-[#17201B] dark:text-[#F3F5EE]">{orig.name}</span>
                              </div>
                              <ChevronRight className="w-3 h-3 text-[#8E9487] dark:text-[#9BAAA0]" />
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setIsOriginFocused(false);
                              setDesktopMapPickerRole('origin');
                            }}
                            className="w-full text-left px-3 py-2.5 hover:bg-[#F8F9F5] dark:hover:bg-white/10 text-xs font-bold text-[#143428] dark:text-[#5ee9b5] flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span>Set pickup location on map</span>
                            </span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {locationError && (
                <div className="flex items-start gap-2.5 text-xs font-medium text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/40 p-3 rounded-xl animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="font-bold block text-amber-950 dark:text-amber-100">GPS Signal Note</span>
                    <span className="text-amber-900 dark:text-amber-200/90 leading-relaxed">{locationError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDetectLocation({ silent: false })}
                    disabled={isDetectingLocation}
                    className="text-xs font-bold text-[#143428] dark:text-[#5ee9b5] hover:text-[#B9552C] dark:hover:text-[#FF7A45] underline shrink-0 cursor-pointer"
                  >
                    Retry GPS
                  </button>
                </div>
              )}

              {detectedLocation && originName === detectedLocation.name && (
                <div className="flex items-center justify-between gap-3 text-xs font-semibold text-emerald-900 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/55 border border-emerald-300 dark:border-emerald-500/35 p-3 rounded-xl animate-in fade-in">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#5ee9b5] shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-emerald-950 dark:text-white">Exact Pinpoint Active</span>
                        {detectedLocation.accuracyM !== undefined && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-400/30 font-bold">
                            ±{detectedLocation.accuracyM}m accuracy
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-300/90 font-normal truncate mt-0.5">
                        Nearest Metro: <strong>{detectedLocation.nearestStation}</strong>
                        {detectedLocation.distanceKm !== undefined ? ` (~${detectedLocation.distanceKm} km away)` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDetectLocation({ silent: false })}
                    disabled={isDetectingLocation}
                    className="text-[11px] font-bold text-[#143428] dark:text-[#5ee9b5] hover:text-[#B9552C] dark:hover:text-[#FF7A45] underline shrink-0 cursor-pointer"
                  >
                    {isDetectingLocation ? 'Updating...' : 'Re-detect'}
                  </button>
                </div>
              )}

              {/* Quick Origin Preset Pills (Horizontal Scroll on Mobile) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                <span className="text-[11px] font-semibold text-[#6B7267] dark:text-[#9BAAA0] mr-0.5 shrink-0">Quick:</span>
                {COMMON_ORIGINS.slice(0, 4).map((loc, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setOriginName(loc.name);
                      setOriginCoords({ lat: loc.lat, lng: loc.lng });
                      try {
                        localStorage.setItem(
                          'metronav_user_location',
                          JSON.stringify({
                            name: loc.name,
                            coords: { lat: loc.lat, lng: loc.lng }
                          })
                        );
                      } catch {}
                    }}
                    className={`text-[11px] px-3 py-1 rounded-lg border transition font-medium shrink-0 whitespace-nowrap cursor-pointer ${
                      originName === loc.name
                        ? 'bg-[#143428] dark:bg-emerald-500 text-white dark:text-[#061C12] font-bold border-[#143428] dark:border-emerald-500 shadow-xs'
                        : 'bg-[#F8F9F5] dark:bg-[#16231D] text-[#53584E] dark:text-[#D1DDD6] border-[#E2E4DC] dark:border-white/10 hover:border-[#8E9487] dark:hover:border-white/25 hover:text-[#17201B] dark:hover:text-white'
                    }`}
                  >
                    {loc.name.split(',')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Destination Search & Pick with Google Places Dropdown */}
            <div className="space-y-2.5 relative z-40" ref={destContainerRef}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[#17201B] dark:text-[#E6EEE9] flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-[#FAF2EE] dark:bg-[#2A160E] text-[#B9552C] dark:text-[#FF7A45] flex items-center justify-center">
                    <Milestone className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </div>
                  <span>Target Destination</span>
                </label>
                <button
                  type="button"
                  onClick={handleSwapLocations}
                  className="ios-liquid-pill text-xs font-bold text-[#143428] dark:text-[#5ee9b5] hover:text-[#B9552C] dark:hover:text-[#FF7A45] flex items-center gap-1.5 transition px-2.5 py-1 rounded-lg cursor-pointer"
                  title="Swap Origin and Destination"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" strokeWidth={1.85} />
                  <span>Swap</span>
                </button>
              </div>

              <div className="relative">
                <form onSubmit={handleSubmitDestQuery} className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8E9487] dark:text-[#9BAAA0]">
                    <Search className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => {
                      const val = e.target.value;
                      setSearchQuery(val);
                      if (!isSearchFocused) setIsSearchFocused(true);
                      if (val.trim().length < 2) {
                        setPlacesResults([]);
                      }
                    }}
                    onFocus={() => setIsSearchFocused(true)}
                    placeholder="Type any address, sector, mall, hospital in Delhi / Gurgaon / Noida..."
                    className="w-full pl-10 pr-24 py-3.5 rounded-xl ios-liquid-input text-sm text-[#17201B] dark:text-[#F3F5EE] font-medium placeholder:text-[#8E9487] dark:placeholder:text-[#768478] shadow-xs"
                  />

                  <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
                    {(isSearchingPlaces || isResolvingPlace) && (
                      <div className="w-4 h-4 rounded-full border-2 border-[#143428] dark:border-[#5ee9b5] border-t-transparent animate-spin mr-1"></div>
                    )}
                    {searchQuery.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setPlacesResults([]);
                          setIsSearchFocused(true);
                        }}
                        className="p-1 rounded-md text-[#8E9487] dark:text-[#9BAAA0] hover:text-[#17201B] dark:hover:text-white hover:bg-[#EAECE4] dark:hover:bg-white/10 transition cursor-pointer"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {searchQuery.trim().length >= 2 && (
                      <button
                        type="submit"
                        disabled={isResolvingPlace}
                        className="px-2.5 py-1 rounded-lg bg-[#143428] dark:bg-emerald-500 text-white dark:text-[#061C12] text-[11px] font-bold hover:bg-[#1E4837] dark:hover:bg-emerald-400 disabled:opacity-50 cursor-pointer"
                      >
                        Go
                      </button>
                    )}
                  </div>
                </form>

                {/* Autocomplete Dropdown anchored directly below the input */}
                <AnimatePresence>
                  {isSearchFocused && (
                    <motion.div
                      key="search-dropdown-card"
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute top-full left-0 right-0 mt-2 ios-liquid-glass-thin rounded-2xl shadow-2xl border border-white/90 dark:border-white/15 p-2 z-50 max-h-96 overflow-y-auto ring-1 ring-[#143428]/10 dark:ring-white/10"
                    >
                      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#E2E4DC] dark:border-white/10 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7267] dark:text-[#9BAAA0] flex items-center gap-1.5">
                          {searchQuery.trim().length >= 2 ? (
                            <>
                              <Compass className="w-3 h-3 text-[#143428] dark:text-[#5ee9b5]" />
                              <span>Live Google Maps Results ({placesResults.length} found)</span>
                            </>
                          ) : (
                            <span>Popular Curated Destinations (Delhi, Gurgaon &amp; Noida)</span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsSearchFocused(false)}
                          className="text-[10px] text-[#6B7267] dark:text-[#9BAAA0] hover:text-[#17201B] dark:hover:text-white font-semibold cursor-pointer"
                        >
                          Close
                        </button>
                      </div>

                      {/* When user has typed 2+ characters: Smart Uber-style Google Places results with Distance */}
                      {searchQuery.trim().length >= 2 ? (
                        <div className="divide-y divide-[#E2E4DC]/70 dark:divide-white/10">
                          {placesResults.map((p: any) => {
                            const distLabel =
                              p.distanceText ||
                              (typeof p.lat === 'number' && typeof p.lng === 'number'
                                ? formatDistanceBetweenCoords(originCoords.lat, originCoords.lng, p.lat, p.lng)
                                : '');
                            return (
                            <button
                              key={p.id}
                              onClick={() => handleSelectSearchResult(p)}
                              className="w-full text-left p-2.5 rounded-xl hover:bg-[#F8F9F5] dark:hover:bg-white/10 text-xs flex items-center justify-between transition group cursor-pointer"
                            >
                              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                <div className="w-11 flex flex-col items-center shrink-0 gap-0.5 pt-0.5">
                                  <div className="w-6 h-6 rounded-full bg-[#F4F5F0] dark:bg-[#16231D] group-hover:bg-[#EAECE4] dark:group-hover:bg-[#1E2E26] flex items-center justify-center border border-[#E2E4DC] dark:border-white/10">
                                    {renderPlaceCategoryIcon(p)}
                                  </div>
                                  {distLabel && (
                                    <span className="text-[10px] font-bold text-[#6B7267] dark:text-[#9BAAA0] tabular-nums whitespace-nowrap">
                                      {distLabel}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-[#17201B] dark:text-[#F3F5EE] text-xs">{p.name}</span>
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
                                        p.city === 'Gurgaon'
                                          ? 'bg-[#FAF2EE] dark:bg-[#2A160E] text-[#B9552C] dark:text-[#FF7A45] border border-[#E8C2B3] dark:border-[#B9552C]/40'
                                          : p.city === 'Noida'
                                          ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                          : 'bg-[#F4F5F0] dark:bg-white/10 text-[#143428] dark:text-[#5ee9b5] border border-[#D5D8CD] dark:border-white/10'
                                      }`}
                                    >
                                      {p.city}
                                    </span>
                                  </div>

                                  <div className="text-[11px] text-[#6B7267] dark:text-[#9BAAA0] truncate mt-0.5">
                                    {p.formattedAddress}
                                  </div>
                                </div>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-[#8E9487] dark:text-[#9BAAA0] group-hover:text-[#143428] dark:group-hover:text-[#5ee9b5] shrink-0 ml-2 transition" />
                            </button>
                            );
                          })}

                          <button
                            type="button"
                            onClick={() => setPlacesScope((prev) => (prev === 'ncr' ? 'india' : 'ncr'))}
                            className="w-full text-left px-3 py-2.5 hover:bg-[#F8F9F5] dark:hover:bg-white/10 text-xs font-semibold text-[#17201B] dark:text-[#F3F5EE] flex items-center gap-2.5 cursor-pointer"
                          >
                            <Globe className="w-3.5 h-3.5 text-[#143428] dark:text-[#5ee9b5] shrink-0" />
                            <span>{placesScope === 'ncr' ? 'Search in a different city' : 'Searching All India (click for Delhi NCR)'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleLoadMoreDesktopResults('destination')}
                            disabled={isLoadingMoreDest}
                            className="w-full text-left px-3 py-2.5 hover:bg-[#F8F9F5] dark:hover:bg-white/10 text-xs font-bold text-[#143428] dark:text-[#5ee9b5] flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5 truncate">
                              {isLoadingMoreDest ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                              ) : (
                                <Search className="w-3.5 h-3.5 shrink-0" />
                              )}
                              <span className="truncate">Get more results for &quot;{searchQuery.trim()}&quot;</span>
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsSearchFocused(false);
                              setDesktopMapPickerRole('destination');
                            }}
                            className="w-full text-left px-3 py-2.5 hover:bg-[#F8F9F5] dark:hover:bg-white/10 text-xs font-bold text-[#17201B] dark:text-[#F3F5EE] flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <MapPin className="w-3.5 h-3.5 text-[#B9552C] dark:text-[#FF7A45] shrink-0" />
                              <span>Set location on map</span>
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-[#8E9487] dark:text-[#9BAAA0]" />
                          </button>
                        </div>
                      ) : (
                        <div className="divide-y divide-[#E2E4DC]/60 dark:divide-white/10">
                          {recentPlaces.slice(0, 4).map((rp) => (
                            <button
                              key={`rec-d-${rp.id}`}
                              onClick={() => handleSelectSearchResult(rp)}
                              className="w-full text-left px-2.5 py-2 hover:bg-[#F8F9F5] dark:hover:bg-white/10 text-xs flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Clock className="w-3.5 h-3.5 text-[#6B7267] dark:text-[#9BAAA0] shrink-0" />
                                <div className="min-w-0">
                                  <div className="font-bold text-[#17201B] dark:text-[#F3F5EE] truncate">{rp.name}</div>
                                  <div className="text-[11px] text-[#6B7267] dark:text-[#9BAAA0] truncate">{rp.formattedAddress}</div>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold text-[#6B7267] dark:text-[#9BAAA0] shrink-0">
                                {formatDistanceBetweenCoords(originCoords.lat, originCoords.lng, rp.lat, rp.lng)}
                              </span>
                            </button>
                          ))}
                          {FAMOUS_DESTINATIONS.slice(0, 8).map(d => (
                            <button
                              key={d.id}
                              onClick={() => handleSelectFamousDest(d)}
                              className="w-full text-left px-3 py-2 hover:bg-[#F8F9F5] dark:hover:bg-white/10 text-xs flex items-center justify-between transition cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <ShoppingBag className="w-3.5 h-3.5 text-[#B9552C] dark:text-[#FF7A45] shrink-0" strokeWidth={1.75} />
                                <div className="min-w-0">
                                  <div className="font-bold text-[#17201B] dark:text-[#F3F5EE] truncate">{d.name}</div>
                                  <div className="text-[11px] text-[#6B7267] dark:text-[#9BAAA0]">
                                    {formatDistanceBetweenCoords(originCoords.lat, originCoords.lng, d.lat, d.lng)} • Nearest: {METRO_STATIONS[d.nearestStationId]?.name || 'Metro'}
                                  </div>
                                </div>
                              </div>
                              <ChevronRight className="w-3 h-3 text-[#8E9487] dark:text-[#9BAAA0] shrink-0" />
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setIsSearchFocused(false);
                              setDesktopMapPickerRole('destination');
                            }}
                            className="w-full text-left px-3 py-2.5 hover:bg-[#F8F9F5] dark:hover:bg-white/10 text-xs font-bold text-[#B9552C] dark:text-[#FF7A45] flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span>Set destination on map</span>
                            </span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Popular Curated Destinations Section with Region Filters */}
              <div className="space-y-2 pt-0.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-semibold text-[#6B7267] dark:text-[#9BAAA0] mr-1">Popular Places:</span>
                    {(['All', 'Gurgaon', 'Delhi', 'Noida'] as const).map(reg => (
                      <button
                        key={reg}
                        onClick={() => setActiveRegionFilter(reg)}
                        className={`text-[10px] px-3 py-1 rounded-full transition font-semibold ios-liquid-pill ${
                          activeRegionFilter === reg
                            ? 'bg-[#143428] dark:bg-emerald-500 text-white dark:text-[#061C12] font-bold border-[#143428] dark:border-emerald-500'
                            : 'text-[#6B7267] dark:text-[#9BAAA0] hover:text-[#17201B] dark:hover:text-white'
                        }`}
                      >
                        {reg}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAllPlacesModalOpen(true)}
                    className="ios-liquid-pill text-[11px] text-[#143428] dark:text-[#5ee9b5] hover:text-[#B9552C] dark:hover:text-[#FF7A45] font-bold flex items-center gap-1 transition px-2.5 py-1 rounded-lg"
                  >
                    <span>View All {FAMOUS_DESTINATIONS.length} Places</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {FAMOUS_DESTINATIONS
                    .filter(dest => {
                      if (activeRegionFilter === 'All') return true;
                      if (activeRegionFilter === 'Gurgaon') return dest.city === 'Gurgaon';
                      if (activeRegionFilter === 'Delhi') return dest.city === 'Delhi';
                      if (activeRegionFilter === 'Noida') return dest.city === 'Noida';
                      return true;
                    })
                    .slice(0, 16)
                    .map(dest => {
                      let label = dest.name.split(',')[0];
                      if (dest.name.includes('Ambience Mall')) {
                        label = dest.city === 'Gurgaon' ? 'Ambience Mall (Gurgaon)' : 'Ambience Mall (Vasant Kunj)';
                      } else if (dest.name.includes('Worldmark')) {
                        label = dest.city === 'Gurgaon' ? 'Worldmark (Sec 65)' : 'Worldmark (Aerocity)';
                      }
                      const isSelected = selectedDestination?.id === dest.id;
                      return (
                        <button
                          key={dest.id}
                          onClick={() => handleSelectFamousDest(dest)}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border transition font-medium flex items-center gap-1.5 shrink-0 whitespace-nowrap ios-liquid-pill ${
                            isSelected
                              ? 'bg-gradient-to-r from-[#B9552C] to-[#A84B25] text-white font-bold border-white/30 shadow-xs'
                              : 'bg-white/80 dark:bg-[#16231D] text-[#53584E] dark:text-[#D1DDD6] border-[#E2E4DC] dark:border-white/10 hover:border-[#B9552C]/40 dark:hover:border-[#FF7A45]/40 hover:text-[#17201B] dark:hover:text-white'
                          }`}
                        >
                          <span>{label}</span>
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                              isSelected
                                ? 'bg-black/20 text-white'
                                : dest.city === 'Gurgaon'
                                ? 'bg-[#FAF2EE] dark:bg-[#2A160E] text-[#B9552C] dark:text-[#FF7A45]'
                                : dest.city === 'Noida'
                                ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                                : 'bg-[#F4F5F0] dark:bg-white/10 text-[#143428] dark:text-[#5ee9b5]'
                            }`}
                          >
                            {dest.city === 'Gurgaon' ? 'GGN' : dest.city === 'Noida' ? 'NOI' : 'DEL'}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dual-Pane Interface: Step-by-step Guide & Interactive Map */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Left Column: Multi-modal Navigation Guide */}
          <div className="lg:col-span-7 xl:col-span-7 space-y-6 sm:space-y-8">
            {tripPlan && (
              <IntrovertGuideCard
                plan={tripPlan}
                travelMode={travelMode}
                onTravelModeChange={setTravelMode}
                passengerCount={passengerCount}
                onPassengerCountChange={setPassengerCount}
                firstMileMode={firstMileMode}
                onFirstMileModeChange={setFirstMileMode}
                lastMileMode={lastMileMode}
                onLastMileModeChange={setLastMileMode}
                deepLinks={liveTripEstimate.deepLinks}
                aiGuide={activeAiGuide}
                onOpenTransitRadar={() => setIsTransitRadarOpen(true)}
                stageNav={stageNav}
                onRequestAiRefresh={() => {
                  if (tripPlan) {
                    fetchAiTransitGrounding(
                      tripPlan.origin.name,
                      tripPlan.destination.name,
                      { lat: tripPlan.origin.lat, lng: tripPlan.origin.lng },
                      { lat: tripPlan.destination.lat, lng: tripPlan.destination.lng }
                    );
                  }
                }}
              />
            )}

            {/* Delhi & Gurgaon Newcomer Survival Guide */}
            <CityQuickGuide />
          </div>

          {/* Right Column: Sticky Google Map with Route Visualization */}
          <div id="interactive-transit-map" className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#143428]/10 dark:bg-emerald-500/20 text-[#143428] dark:text-[#5ee9b5] flex items-center justify-center">
                  <Waypoints className="w-3.5 h-3.5" strokeWidth={1.75} />
                </div>
                <h3 className="font-bold text-sm text-[#17201B] dark:text-[#F3F5EE] font-sans">
                  Interactive Transit Radar & Exit Gate Map
                </h3>
              </div>
              <span className="text-[11px] text-[#143428] dark:text-[#5ee9b5] font-bold bg-[#143428]/10 dark:bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-[#143428]/20 dark:border-emerald-400/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#143428] dark:bg-[#5ee9b5] animate-ping"></span>
                Live Vector Maps
              </span>
            </div>

            <div className="h-[480px] sm:h-[560px] xl:h-[640px] w-full rounded-2xl overflow-hidden border border-[#E2E4DC] dark:border-white/10 shadow-sm relative bg-[#F4F5F0] dark:bg-[#111915]">
              <MapComponent plan={tripPlan} userCoords={originCoords} onPickMapLocation={handlePickMapLocation} />
            </div>

            {/* Station Legend Helper */}
            {tripPlan && (
              <div className="rounded-2xl bg-white dark:bg-[#111A15] p-4 border border-[#E2E4DC] dark:border-white/10 text-xs space-y-2.5 text-[#53584E] dark:text-[#D1DDD6] shadow-xs">
                <div className="font-bold text-[#17201B] dark:text-[#F3F5EE] text-[11px] uppercase tracking-wider flex items-center justify-between">
                  <span>Transit Track Legend</span>
                  <span className="text-[#8E9487] dark:text-[#9BAAA0] font-normal">Real-time GPS routing</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#143428] dark:bg-[#5ee9b5]"></span>
                    <span>Start: {tripPlan.origin.name.split(',')[0]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: tripPlan.originStation.lineColor }}
                    ></span>
                    <span className="truncate">Board: {tripPlan.originStation.name}</span>
                  </div>
                  {tripPlan.metroLeg.requiresTransfer && (
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#B9552C] dark:bg-[#FF7A45]"></span>
                      <span>Interchange Link</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: tripPlan.destinationStation.lineColor }}
                    ></span>
                    <span className="truncate">Deboard: {tripPlan.destinationStation.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#B9552C] dark:bg-[#FF7A45]"></span>
                    <span className="truncate">Destination: {tripPlan.destination.name.split(',')[0]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-1 rounded-full bg-[#143428] dark:bg-[#5ee9b5]"></span>
                    <span>Gate {tripPlan.metroExit.gateNumber} Last-Mile</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>

      {/* All 39 Popular Destinations Explorer Modal */}
      <AnimatePresence>
        {isAllPlacesModalOpen && (
          <motion.div
            key="all-places-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsAllPlacesModalOpen(false)}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-2.5 sm:p-4 pb-[max(env(safe-area-inset-bottom,0px),12px)] sm:pb-4 bg-black/70"
          >
            <motion.div
              key="all-places-dialog"
              initial={{ opacity: 0, scale: 0.95, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#111A15] border border-[#E2E4DC] dark:border-white/15 w-full max-w-4xl max-h-[88dvh] sm:max-h-[88vh] rounded-2xl sm:rounded-[24px] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-[#1E4837] dark:border-white/10 flex items-center justify-between bg-[#143428] dark:bg-[#0D1E17] text-white">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 text-emerald-300 flex items-center justify-center border border-white/15">
                    <Compass className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
                      <span>Popular Places Directory</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/15 text-white border border-white/20 font-semibold">
                        {FAMOUS_DESTINATIONS.length} Curated Hotspots
                      </span>
                    </h3>
                    <p className="text-xs text-white/80">
                      Direct multi-modal transit routes from Delhi to Gurgaon with exit gates & introvert tips
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAllPlacesModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Search & Filter Bar */}
              <div className="p-4 border-b border-[#E2E4DC] dark:border-white/10 bg-[#F8F9F5] dark:bg-[#0D1410] space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E9487] dark:text-[#9BAAA0]" />
                  <input
                    type="text"
                    value={placesModalSearch}
                    onChange={e => setPlacesModalSearch(e.target.value)}
                    placeholder="Filter by name, market, mall, or metro station (e.g., Cyber Hub, Khan Market, 32nd Avenue)..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#16231D] border border-[#E2E4DC] dark:border-white/10 text-xs text-[#17201B] dark:text-[#F3F5EE] placeholder:text-[#8E9487] dark:placeholder:text-[#768478] focus:outline-none focus:border-[#143428] dark:focus:border-emerald-400 focus:ring-1 focus:ring-[#143428] dark:focus:ring-emerald-400"
                  />
                  {placesModalSearch && (
                    <button
                      onClick={() => setPlacesModalSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E9487] dark:text-[#9BAAA0] hover:text-[#17201B] dark:hover:text-white text-xs font-semibold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Category Pills inside Modal */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {['All', 'Mall', 'Dining / Nightlife', 'Tech Park / Hub', 'Attraction / Market'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setPlacesModalCategory(cat)}
                      className={`px-3 py-1 rounded-lg border text-xs transition font-semibold ${
                        placesModalCategory === cat
                          ? 'bg-[#143428] dark:bg-emerald-500 text-white dark:text-[#061C12] border-[#143428] dark:border-emerald-500'
                          : 'bg-white dark:bg-[#16231D] text-[#53584E] dark:text-[#D1DDD6] border-[#E2E4DC] dark:border-white/10 hover:border-[#8E9487] dark:hover:border-white/25 hover:text-[#17201B] dark:hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Places Grid */}
              <div className="p-4 overflow-y-auto flex-1 space-y-3 max-h-[55vh]">
                {FAMOUS_DESTINATIONS
                  .filter(dest => {
                    const matchesSearch =
                      placesModalSearch.trim() === '' ||
                      dest.name.toLowerCase().includes(placesModalSearch.toLowerCase()) ||
                      dest.city.toLowerCase().includes(placesModalSearch.toLowerCase()) ||
                      (METRO_STATIONS[dest.nearestStationId]?.name || '').toLowerCase().includes(placesModalSearch.toLowerCase());
                    const matchesCategory =
                      placesModalCategory === 'All' || dest.category === placesModalCategory;
                    return matchesSearch && matchesCategory;
                  })
                  .map(dest => {
                    const station = METRO_STATIONS[dest.nearestStationId];
                    return (
                      <div
                        key={dest.id}
                        className="p-3.5 rounded-xl bg-[#F8F9F5] dark:bg-[#16231D] border border-[#E2E4DC] dark:border-white/10 hover:border-[#143428]/30 dark:hover:border-emerald-400/35 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[#17201B] dark:text-[#F3F5EE] text-sm">{dest.name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                              dest.city === 'Gurgaon'
                                ? 'bg-[#FAF2EE] dark:bg-[#2A160E] text-[#B9552C] dark:text-[#FF7A45] border border-[#E8C2B3] dark:border-[#B9552C]/40'
                                : dest.city === 'Noida'
                                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : 'bg-[#F4F5F0] dark:bg-white/10 text-[#143428] dark:text-[#5ee9b5] border border-[#D5D8CD] dark:border-white/10'
                            }`}>
                              {dest.city}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-white dark:bg-[#111A15] text-[#53584E] dark:text-[#D1DDD6] border border-[#E2E4DC] dark:border-white/10 font-medium">
                              {dest.category}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-[#6B7267] dark:text-[#9BAAA0] flex-wrap">
                            {station && (
                              <span className="flex items-center gap-1.5">
                                <span
                                  className="w-2 h-2 rounded-full inline-block"
                                  style={{ backgroundColor: station.lineColor }}
                                ></span>
                                <strong className="text-[#17201B] dark:text-[#F3F5EE]">{station.name}</strong>
                                <span className="text-[11px] text-[#6B7267] dark:text-[#9BAAA0]">({station.line} Line)</span>
                              </span>
                            )}
                            <span>•</span>
                            <span className="text-[#143428] dark:text-[#5ee9b5] font-bold">
                              Best Exit: Gate {dest.bestExitGate}
                            </span>
                            <span>•</span>
                            <span>{dest.distanceFromStationKm} km from station</span>
                          </div>

                          {/* First Introvert tip teaser */}
                          {dest.introvertTips && dest.introvertTips[0] && (
                            <p className="text-[11px] text-[#53584E] dark:text-[#A7B2A8] italic line-clamp-1">
                              💡 {dest.introvertTips[0]}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            handleSelectFamousDest(dest);
                            setIsAllPlacesModalOpen(false);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-[#143428] dark:bg-emerald-500 hover:bg-[#1A3E31] dark:hover:bg-emerald-400 text-white dark:text-[#061C12] font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 transition shadow-xs"
                        >
                          <span>Plan Route</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
              </div>

              {/* Modal Footer */}
              <div className="p-3.5 border-t border-[#E2E4DC] dark:border-white/10 bg-[#F8F9F5] dark:bg-[#0D1410] text-center text-xs text-[#6B7267] dark:text-[#9BAAA0]">
                Showing curated hotspots across Gurgaon, Noida, Airport Corridor, South Delhi, and Central/Old Delhi — plus live Google Maps search for any address.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Transit Radar Modal */}
      <LiveTransitRadarModal
        isOpen={isTransitRadarOpen}
        onClose={() => setIsTransitRadarOpen(false)}
        defaultOrigin={originName}
        defaultDest={selectedDestination ? selectedDestination.name : customDestCoords?.name || 'Ambience Mall, Gurugram'}
      />

      {/* Floating Active Metro Pass Pill */}
      <ActiveTicketFloatingPill />

      {/* Uber-style Center-Pin Map Picker for Desktop */}
      <MapPinPickerModal
        isOpen={desktopMapPickerRole !== null}
        mode={desktopMapPickerRole === 'origin' ? 'origin' : 'destination'}
        initialCoords={
          desktopMapPickerRole === 'origin'
            ? originCoords
            : selectedDestination
            ? { lat: selectedDestination.lat, lng: selectedDestination.lng }
            : customDestCoords
            ? { lat: customDestCoords.lat, lng: customDestCoords.lng }
            : originCoords
        }
        initialName={
          desktopMapPickerRole === 'origin'
            ? originName
            : selectedDestination?.name || customDestCoords?.name
        }
        onClose={() => setDesktopMapPickerRole(null)}
        onConfirm={(res) => {
          const role = desktopMapPickerRole || 'destination';
          setDesktopMapPickerRole(null);
          saveRecentPlace({
            name: res.name,
            formattedAddress: res.formattedAddress,
            lat: res.lat,
            lng: res.lng,
          });
          setRecentPlaces(getRecentPlaces());
          handlePickMapLocation(role, res.name, { lat: res.lat, lng: res.lng });
        }}
      />
    </>
  );
}

