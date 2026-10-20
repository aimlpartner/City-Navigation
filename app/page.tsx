'use client';

import React, { useState, useEffect, useMemo, useTransition, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FAMOUS_DESTINATIONS,
  FamousDestination,
  planMultiModalTrip,
  MultiModalTripPlan,
  RideMode,
  FareBreakdown,
  LiveTrafficInfo,
  METRO_STATIONS,
  findNearestMetroStation
} from '@/lib/delhi-ncr-transit';
import { MapComponent } from '@/components/MapComponent';
import { IntrovertGuideCard } from '@/components/IntrovertGuideCard';
import { CityQuickGuide } from '@/components/CityQuickGuide';
import { LiveTransitRadarModal } from '@/components/LiveTransitRadarModal';
import { MobileAppShell } from '@/components/MobileAppShell';
import { ActiveTicketFloatingPill } from '@/components/ActiveTicketFloatingPill';
import { triggerPwaInstall } from '@/components/PwaInstallPrompt';
import dynamic from 'next/dynamic';
import {
  TrainFront,
  Radar,
  Waypoints,
  Route,
  Milestone,
  MapPinned,
  CircleDot,
  LocateFixed,
  Search,
  ArrowUpRight,
  ArrowRight,
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

const LivingTransitCanvas = dynamic(
  () => import('@/components/LivingTransitCanvas').then((mod) => mod.LivingTransitCanvas),
  { ssr: false }
);


const COMMON_ORIGINS = [
  { name: 'DLF Cyber City, Gurgaon', lat: 28.4950, lng: 77.0890 },
  { name: 'Sector 29 / Leisure Valley, Gurgaon', lat: 28.4682, lng: 77.0655 },
  { name: 'DLF Phase 3 (U-Block), Gurgaon', lat: 28.4912, lng: 77.0967 },
  { name: 'Golf Course Road (Sec 54), Gurgaon', lat: 28.4417, lng: 77.1065 },
  { name: 'Saket / Malviya Nagar, Delhi', lat: 28.5204, lng: 77.2014 },
  { name: 'Hauz Khas, South Delhi', lat: 28.5494, lng: 77.2001 },
  { name: 'Connaught Place, Central Delhi', lat: 28.6328, lng: 77.2195 },
  { name: 'IGI Airport Terminal 3', lat: 28.5562, lng: 77.0864 }
];

export default function HomePage() {
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
  const [activeRegionFilter, setActiveRegionFilter] = useState<'All' | 'Gurgaon' | 'Delhi' | 'Transit'>('All');
  const [isAllPlacesModalOpen, setIsAllPlacesModalOpen] = useState(false);
  const [placesModalSearch, setPlacesModalSearch] = useState('');
  const [placesModalCategory, setPlacesModalCategory] = useState<string>('All');

  // Mobile App Experience: Segmented View & Floating Map Modal
  const [isMobileMapModalOpen, setIsMobileMapModalOpen] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<'steps' | 'map'>('steps');

  // Gemini AI with Maps Grounding State
  const [aiGuide, setAiGuide] = useState<{
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

  // Passenger & Ride Mode State
  const [passengerCount, setPassengerCount] = useState<number>(1);
  const [firstMileMode, setFirstMileMode] = useState<RideMode>('cab');
  const [lastMileMode, setLastMileMode] = useState<RideMode>('cab');

  // Live Trip Estimate & Real Google Traffic State
  const [liveTripEstimate, setLiveTripEstimate] = useState<{
    liveTraffic?: LiveTrafficInfo;
    fareBreakdown?: FareBreakdown;
    deepLinks?: {
      uberFirstMileUrl?: string;
      uberLastMileUrl?: string;
      uberDirectUrl?: string;
      rapidoUrl?: string;
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

  // Combine base plan with live traffic & dynamic fare estimation
  const tripPlan = useMemo(() => {
    if (!baseTripPlan) return null;
    if (!liveTripEstimate.fareBreakdown && !liveTripEstimate.liveTraffic) return baseTripPlan;

    return {
      ...baseTripPlan,
      fareBreakdown: liveTripEstimate.fareBreakdown || baseTripPlan.fareBreakdown,
      liveTraffic: liveTripEstimate.liveTraffic || baseTripPlan.liveTraffic
    };
  }, [baseTripPlan, liveTripEstimate]);

  // Query /api/trip-estimate for live Google Maps traffic and real-world ride-hailing fares
  useEffect(() => {
    if (!baseTripPlan) return;
    let isCancelled = false;

    const fetchEstimate = async () => {
      try {
        setLiveTripEstimate(prev => ({ ...prev, loading: true }));
        const res = await fetch('/api/trip-estimate', {
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
    baseTripPlan.origin.lat,
    baseTripPlan.origin.lng,
    baseTripPlan.destination.lat,
    baseTripPlan.destination.lng,
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
    setAiGuide(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch('/api/transit-ai', {
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
          loading: false,
          text: data.guideMarkdown,
          error: null,
          links: data.groundingLinks || []
        });
      } else {
        setAiGuide({
          loading: false,
          text: null,
          error: data.error || 'Could not fetch live AI suggestions',
          links: []
        });
      }
    } catch (e: any) {
      setAiGuide({
        loading: false,
        text: null,
        error: e?.message || 'Network error',
        links: []
      });
    }
  };

  // Synchronize AI transit grounding when tripPlan changes
  useEffect(() => {
    if (!tripPlan) return;

    let isSubscribed = true;
    const loadAi = async () => {
      await Promise.resolve(); // shift past synchronous render frame
      if (!isSubscribed) return;
      setAiGuide(prev => ({ ...prev, loading: true, error: null }));
      try {
        const res = await fetch('/api/transit-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originName: tripPlan.origin.name,
            destName: tripPlan.destination.name,
            originLat: tripPlan.origin.lat,
            originLng: tripPlan.origin.lng,
            destLat: tripPlan.destination.lat,
            destLng: tripPlan.destination.lng
          })
        });

        const data = await res.json();
        if (!isSubscribed) return;
        if (data.success && data.guideMarkdown) {
          setAiGuide({
            loading: false,
            text: data.guideMarkdown,
            error: null,
            links: data.groundingLinks || []
          });
        } else {
          setAiGuide({
            loading: false,
            text: null,
            error: data.error || 'Could not fetch live AI suggestions',
            links: []
          });
        }
      } catch (e: any) {
        if (!isSubscribed) return;
        setAiGuide({
          loading: false,
          text: null,
          error: e?.message || 'Network error',
          links: []
        });
      }
    };

    loadAi();
    return () => {
      isSubscribed = false;
    };
  }, [tripPlan]);

  // Persistent, Zero-Friction Browser Geolocation with Silent Auto-Pickup
  const handleDetectLocation = async (options?: { silent?: boolean }) => {
    const isSilent = options?.silent ?? false;

    if (!navigator.geolocation) {
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

    // Helper: Acquire coordinates with High Accuracy first, falling back to Network positioning
    const acquirePosition = (): Promise<{ lat: number; lng: number; accuracyM: number }> => {
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
        const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
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

  // Handle destination live search query
  useEffect(() => {
    const q = searchQuery.trim();
    if (!isSearchFocused || q.length < 2) {
      if (q.length < 2) setPlacesResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingPlaces(true);
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          setPlacesResults(data.places || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingPlaces(false);
      }
    }, 240);

    return () => clearTimeout(timer);
  }, [searchQuery, isSearchFocused]);

  // Handle origin live search query
  useEffect(() => {
    const q = originSearchQuery.trim();
    if (!isOriginFocused || q.length < 2) {
      if (q.length < 2) setOriginPlacesResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingOrigin(true);
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          setOriginPlacesResults(data.places || []);
        }
      } catch (err) {
        console.warn('Origin search error:', err);
      } finally {
        setIsSearchingOrigin(false);
      }
    }, 240);

    return () => clearTimeout(timer);
  }, [originSearchQuery, isOriginFocused]);

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
  const handleSelectOriginSearchResult = (place: any) => {
    const chosenName = place.name;
    setOriginName(chosenName);
    setOriginSearchQuery(chosenName);
    if (place.lat && place.lng) {
      setOriginCoords({ lat: place.lat, lng: place.lng });
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
  const handleSelectSearchResult = (place: any) => {
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

    if (place.lat && place.lng) {
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

  // Generic destination selector handling both curated landmarks and arbitrary Google Maps places
  const handleSelectAnyDestination = (placeOrDest: any) => {
    if (placeOrDest.curatedData) {
      handleSelectFamousDest(placeOrDest.curatedData);
    } else if (placeOrDest.nearestStationId && typeof placeOrDest.nearestStationId === 'string' && !placeOrDest.curatedData) {
      handleSelectFamousDest(placeOrDest as FamousDestination);
    } else {
      handleSelectSearchResult(placeOrDest);
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
        passengerCount={passengerCount}
        onPassengerCountChange={setPassengerCount}
        firstMileMode={firstMileMode}
        onFirstMileModeChange={setFirstMileMode}
        lastMileMode={lastMileMode}
        onLastMileModeChange={setLastMileMode}
        deepLinks={liveTripEstimate.deepLinks}
        aiGuide={aiGuide}
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
        onOpenTransitRadar={() => setIsTransitRadarOpen(true)}
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
      <div className="hidden lg:block min-h-screen bg-[#F4F5F0] text-[#17201B] antialiased selection:bg-[#143428] selection:text-white pb-20 relative overflow-x-hidden">
        {/* Moving Water from Metal Shader (Drawn 30 FPS, Paused in Low Power / Reduce Motion) */}
        <LivingTransitCanvas />
        {/* Top Application Header with Apple iOS Liquid Glass Specular Reflection */}
        <header className="sticky top-0 z-40 ios-liquid-glass border-b border-white/70 shadow-[0_8px_32px_-4px_rgba(20,52,40,0.08)] relative">
          {/* Apple Specular Top Rim */}
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

          <div className="w-full max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-10 xl:px-12 h-16 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#143428] border border-emerald-400/30 text-white flex items-center justify-center shadow-xs shrink-0">
                <TrainFront className="w-5 h-5 text-[#5ee9b5]" strokeWidth={1.85} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[#17201B] font-sans leading-none shrink-0">
                    MetroNav
                  </span>
                  <span className="hidden sm:inline-flex whitespace-nowrap px-2.5 py-0.5 rounded-full bg-[#143428]/10 border border-[#143428]/20 text-[#143428] text-[10px] font-bold tracking-wide uppercase shrink-0 leading-tight">
                    Delhi & Gurugram
                  </span>
                </div>
                <p className="text-[11px] text-[#6B7267] font-medium hidden sm:block truncate mt-0.5">
                  Quiet, confident transit navigation • exact station exit gates & feeder buses
                </p>
                <p className="text-[10px] text-[#6B7267] font-bold uppercase tracking-wider sm:hidden leading-none mt-1 truncate">
                  Delhi & Gurugram
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
              {/* Download / Install App Button */}
              <button
                onClick={triggerPwaInstall}
                className="ios-liquid-pill flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-[#143428] text-xs font-bold transition shadow-xs shrink-0 cursor-pointer group border border-white/60"
                title="Download & Install App (PWA)"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#143428] group-hover:-translate-y-0.5 transition-transform" strokeWidth={2} />
                <span>Download App</span>
              </button>

              <button
                onClick={() => setIsTransitRadarOpen(true)}
                className="ios-liquid-pill flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-[#143428] to-[#1A3E31] text-white text-xs font-bold transition shadow-xs shrink-0 cursor-pointer group border border-white/20"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                <Radar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300 group-hover:rotate-45 transition-transform" strokeWidth={1.75} />
                <span className="hidden xs:inline">Live Transit Radar</span>
                <span className="xs:hidden">Radar</span>
              </button>

              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl ios-liquid-pill text-[#17201B] text-xs font-semibold">
                <Headphones className="w-3.5 h-3.5 text-[#143428]" strokeWidth={1.75} />
                <span>Quiet Protocol</span>
                <BadgeCheck className="w-3.5 h-3.5 text-[#143428]" strokeWidth={2} />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Hub - Expanded Wide Canvas */}
        <main className="w-full max-w-[1720px] mx-auto px-3.5 sm:px-6 lg:px-10 xl:px-12 pt-4 sm:pt-6 relative z-10">
          {/* Network Status Banner */}
          <div className="mb-4 sm:mb-6 rounded-xl sm:rounded-2xl ios-liquid-glass border border-white/80 px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-3 text-xs shadow-sm text-[#53584E] relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 whitespace-nowrap min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#143428]/10 text-[#143428] text-[10px] sm:text-[11px] font-bold border border-[#143428]/20 shrink-0 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-[#143428]"></span>
                Live Normal
              </span>
              <span className="flex items-center gap-1.5 text-[11px] shrink-0 font-medium text-[#17201B]">
                <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0"></span>
                <span>Yellow Line (~3m)</span>
              </span>
              <span className="text-[#8E9487] shrink-0">•</span>
              <span className="flex items-center gap-1.5 text-[11px] shrink-0 font-medium text-[#17201B]">
                <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0"></span>
                <span>Rapid Metro (~4m)</span>
              </span>
              <span className="text-[#8E9487] shrink-0">•</span>
              <span className="flex items-center gap-1.5 text-[11px] shrink-0 font-medium text-[#17201B]">
                <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                <span>Blue Line (~3m)</span>
              </span>
              <span className="text-[#8E9487] hidden md:inline shrink-0">•</span>
              <span className="text-[#6B7267] hidden md:inline text-[11px] shrink-0">
                Sikanderpur skywalk air-conditioned
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsTransitRadarOpen(true)}
              className="ios-liquid-pill inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold text-[#143428] hover:text-[#B9552C] shrink-0 transition whitespace-nowrap"
            >
              <span>All 7 Lines</span>
              <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </div>

          {/* Navigation Query Bar (Origin & Destination Selection) */}
          <section className="ios-liquid-glass rounded-2xl sm:rounded-[28px] p-4 sm:p-6 xl:p-8 border border-white/85 shadow-[0_20px_50px_-8px_rgba(20,52,40,0.12)] mb-5 sm:mb-8 relative z-30">
            {/* Apple Specular Top Rim */}
            <div className="absolute inset-x-6 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 xl:gap-8 relative z-10">
              {/* Origin Location Selector with Live Google Places Autocomplete */}
              <div className="space-y-2.5 relative z-40" ref={originContainerRef}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#17201B] flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-[#143428]/10 text-[#143428] flex items-center justify-center">
                      <CircleDot className="w-3.5 h-3.5" strokeWidth={2} />
                    </div>
                    <span>Departure Location</span>
                  </label>
                  <button
                    onClick={() => handleDetectLocation({ silent: false })}
                    disabled={isDetectingLocation}
                    className="ios-liquid-pill text-xs font-bold text-[#143428] hover:text-[#B9552C] flex items-center gap-1.5 transition px-2.5 py-1 rounded-lg cursor-pointer"
                  >
                    <LocateFixed className={`w-3.5 h-3.5 ${isDetectingLocation ? 'animate-spin' : ''}`} strokeWidth={1.75} />
                    <span>{isDetectingLocation ? 'Detecting...' : 'Use GPS'}</span>
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8E9487]">
                    <CircleDot className="w-4 h-4 text-[#143428]" strokeWidth={2} />
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
                    placeholder="Type any starting place, mall, sector, hospital..."
                    className="w-full pl-10 pr-16 py-3.5 rounded-xl ios-liquid-input text-sm text-[#17201B] font-medium placeholder:text-[#8E9487] shadow-xs"
                  />

                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
                    {isSearchingOrigin && (
                      <div className="w-4 h-4 rounded-full border-2 border-[#143428] border-t-transparent animate-spin"></div>
                    )}
                    {originSearchQuery.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setOriginSearchQuery('');
                          setOriginPlacesResults([]);
                          setIsOriginFocused(true);
                        }}
                        className="p-1 rounded-md text-[#8E9487] hover:text-[#17201B] hover:bg-[#EAECE4] transition cursor-pointer"
                        title="Clear origin"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Live Origin Autocomplete Dropdown */}
                  <AnimatePresence>
                    {isOriginFocused && (
                      <motion.div
                        key="origin-dropdown-card"
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute top-full left-0 right-0 mt-2 ios-liquid-glass-thin rounded-2xl shadow-2xl border border-white/90 p-2 z-50 max-h-96 overflow-y-auto ring-1 ring-[#143428]/10"
                      >
                      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#E2E4DC] mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7267] flex items-center gap-1.5">
                          {originSearchQuery.trim().length >= 2 ? (
                            <>
                              <Compass className="w-3 h-3 text-[#143428]" />
                              <span>Starting Point Suggestions ({originPlacesResults.length} found)</span>
                            </>
                          ) : (
                            <span>Popular Starting Hubs (Delhi-NCR)</span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsOriginFocused(false)}
                          className="text-[10px] text-[#6B7267] hover:text-[#17201B] font-semibold cursor-pointer"
                        >
                          Close
                        </button>
                      </div>

                      {originSearchQuery.trim().length >= 2 ? (
                        <div className="divide-y divide-[#E2E4DC]/70">
                          {originPlacesResults.map((p: any) => (
                            <button
                              key={p.id}
                              onClick={() => handleSelectOriginSearchResult(p)}
                              className="w-full text-left p-2.5 rounded-xl hover:bg-[#F8F9F5] text-xs flex items-center justify-between transition group cursor-pointer"
                            >
                              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                <div className="mt-0.5 w-6 h-6 rounded-md bg-[#F4F5F0] group-hover:bg-[#EAECE4] flex items-center justify-center shrink-0 border border-[#E2E4DC]">
                                  {renderPlaceCategoryIcon(p)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-[#17201B] text-xs">{p.name}</span>
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider bg-[#F4F5F0] text-[#143428] border border-[#D5D8CD]">
                                      {p.city}
                                    </span>
                                    {p.areaHint && (
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#F4F5F0] text-[#53584E] border border-[#E2E4DC] font-medium">
                                        {p.areaHint}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-[#6B7267] truncate mt-0.5">
                                    {p.formattedAddress}
                                  </div>
                                  {p.nearestStation && (
                                    <div className="text-[10px] text-[#6B7267] flex items-center gap-2 mt-1 flex-wrap">
                                      <span className="flex items-center gap-1">
                                        <span
                                          className="w-2 h-2 rounded-full inline-block"
                                          style={{ backgroundColor: p.nearestStation.lineColor }}
                                        />
                                        <span className="text-[#17201B] font-medium">
                                          Near {p.nearestStation.name}
                                        </span>
                                        <span className="text-[#6B7267]">({p.nearestStation.line} Line)</span>
                                        <span className="text-[#6B7267]">• ~{p.nearestStation.distanceKm} km</span>
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-[#8E9487] group-hover:text-[#143428] shrink-0 ml-2 transition" />
                            </button>
                          ))}
                          {originPlacesResults.length === 0 && !isSearchingOrigin && (
                            <div className="py-6 text-center text-xs text-[#6B7267] space-y-1">
                              <p>No direct matches found for &quot;{originSearchQuery}&quot;</p>
                              <p className="text-[11px] text-[#8E9487]">
                                Try typing any mall, colony, sector, or hospital across Delhi-NCR
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
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
                              className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F8F9F5] text-xs flex items-center justify-between transition cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5">
                                <CircleDot className="w-3.5 h-3.5 text-[#143428] shrink-0" strokeWidth={2} />
                                <span className="font-bold text-[#17201B]">{orig.name}</span>
                              </div>
                              <ChevronRight className="w-3 h-3 text-[#8E9487]" />
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {locationError && (
                <div className="flex items-start gap-2.5 text-xs font-medium text-amber-900 bg-amber-50 border border-amber-300 p-3 rounded-xl animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="font-bold block text-amber-950">GPS Signal Note</span>
                    <span className="text-amber-900 leading-relaxed">{locationError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDetectLocation({ silent: false })}
                    disabled={isDetectingLocation}
                    className="text-xs font-bold text-[#143428] hover:text-[#B9552C] underline shrink-0 cursor-pointer"
                  >
                    Retry GPS
                  </button>
                </div>
              )}

              {detectedLocation && originName === detectedLocation.name && (
                <div className="flex items-center justify-between gap-3 text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-300 p-3 rounded-xl animate-in fade-in">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-emerald-950">Exact Pinpoint Active</span>
                        {detectedLocation.accuracyM !== undefined && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                            ±{detectedLocation.accuracyM}m accuracy
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-emerald-800 font-normal truncate mt-0.5">
                        Nearest Metro: <strong>{detectedLocation.nearestStation}</strong>
                        {detectedLocation.distanceKm !== undefined ? ` (~${detectedLocation.distanceKm} km away)` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDetectLocation({ silent: false })}
                    disabled={isDetectingLocation}
                    className="text-[11px] font-bold text-[#143428] hover:text-[#B9552C] underline shrink-0 cursor-pointer"
                  >
                    {isDetectingLocation ? 'Updating...' : 'Re-detect'}
                  </button>
                </div>
              )}

              {/* Quick Origin Preset Pills (Horizontal Scroll on Mobile) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                <span className="text-[11px] font-semibold text-[#6B7267] mr-0.5 shrink-0">Quick:</span>
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
                        ? 'bg-[#143428] text-white font-bold border-[#143428] shadow-xs'
                        : 'bg-[#F8F9F5] text-[#53584E] border-[#E2E4DC] hover:border-[#8E9487] hover:text-[#17201B]'
                    }`}
                  >
                    {loc.name.split(',')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Destination Search & Pick with Google Places Dropdown */}
            <div className="space-y-2.5 relative z-40" ref={destContainerRef}>
              <label className="text-xs font-bold uppercase tracking-wider text-[#17201B] flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-[#FAF2EE] text-[#B9552C] flex items-center justify-center">
                  <Milestone className="w-3.5 h-3.5" strokeWidth={1.75} />
                </div>
                <span>Target Destination</span>
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8E9487]">
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
                  placeholder="Type any mall (Pacific, Vegas, Citywalk), sector, hospital..."
                  className="w-full pl-10 pr-16 py-3.5 rounded-xl ios-liquid-input text-sm text-[#17201B] font-medium placeholder:text-[#8E9487] shadow-xs"
                />

                <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
                  {isSearchingPlaces && (
                    <div className="w-4 h-4 rounded-full border-2 border-[#143428] border-t-transparent animate-spin"></div>
                  )}
                  {searchQuery.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setPlacesResults([]);
                        setIsSearchFocused(true);
                      }}
                      className="p-1 rounded-md text-[#8E9487] hover:text-[#17201B] hover:bg-[#EAECE4] transition cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Autocomplete Dropdown anchored directly below the input */}
                <AnimatePresence>
                  {isSearchFocused && (
                    <motion.div
                      key="search-dropdown-card"
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute top-full left-0 right-0 mt-2 ios-liquid-glass-thin rounded-2xl shadow-2xl border border-white/90 p-2 z-50 max-h-96 overflow-y-auto ring-1 ring-[#143428]/10"
                    >
                      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#E2E4DC] mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7267] flex items-center gap-1.5">
                          {searchQuery.trim().length >= 2 ? (
                            <>
                              <Compass className="w-3 h-3 text-[#143428]" />
                              <span>Live Google Maps Results ({placesResults.length} found)</span>
                            </>
                          ) : (
                            <span>Popular Curated Destinations (Delhi & Gurgaon)</span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsSearchFocused(false)}
                          className="text-[10px] text-[#6B7267] hover:text-[#17201B] font-semibold cursor-pointer"
                        >
                          Close
                        </button>
                      </div>

                      {/* When user has typed 2+ characters: Smart Google Places + Curated results */}
                      {searchQuery.trim().length >= 2 ? (
                        <div className="divide-y divide-[#E2E4DC]/70">
                          {placesResults.map((p: any) => (
                            <button
                              key={p.id}
                              onClick={() => handleSelectSearchResult(p)}
                              className="w-full text-left p-2.5 rounded-xl hover:bg-[#F8F9F5] text-xs flex items-center justify-between transition group cursor-pointer"
                            >
                              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                <div className="mt-0.5 w-6 h-6 rounded-md bg-[#F4F5F0] group-hover:bg-[#EAECE4] flex items-center justify-center shrink-0 border border-[#E2E4DC]">
                                  {renderPlaceCategoryIcon(p)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-[#17201B] text-xs">{p.name}</span>
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
                                        p.city === 'Gurgaon'
                                          ? 'bg-[#FAF2EE] text-[#B9552C] border border-[#E8C2B3]'
                                          : p.city === 'Noida'
                                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                          : 'bg-[#F4F5F0] text-[#143428] border border-[#D5D8CD]'
                                      }`}
                                    >
                                      {p.city}
                                    </span>
                                    {p.areaHint && (
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#F4F5F0] text-[#53584E] border border-[#E2E4DC] font-medium">
                                        {p.areaHint}
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-[11px] text-[#6B7267] truncate mt-0.5">
                                    {p.formattedAddress}
                                  </div>

                                  {p.nearestStation && (
                                    <div className="text-[10px] text-[#6B7267] flex items-center gap-2 mt-1 flex-wrap">
                                      <span className="flex items-center gap-1">
                                        <span
                                          className="w-2 h-2 rounded-full inline-block"
                                          style={{ backgroundColor: p.nearestStation.lineColor }}
                                        />
                                        <span className="text-[#17201B] font-medium">
                                          Nearest: {p.nearestStation.name}
                                        </span>
                                        <span className="text-[#6B7267]">({p.nearestStation.line} Line)</span>
                                        <span className="text-[#6B7267]">• ~{p.nearestStation.distanceKm} km away</span>
                                      </span>
                                      {p.bestExitGate && (
                                        <span className="text-[#143428] font-bold">
                                          • Best Exit: Gate {p.bestExitGate}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-[#8E9487] group-hover:text-[#143428] shrink-0 ml-2 transition" />
                            </button>
                          ))}

                          {placesResults.length === 0 && !isSearchingPlaces && (
                            <div className="py-6 text-center text-xs text-[#6B7267] space-y-1">
                              <p>No direct matches found for &quot;{searchQuery}&quot;</p>
                              <p className="text-[11px] text-[#8E9487]">
                                Try searching by landmark, sector, or metro station across Delhi-NCR
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {FAMOUS_DESTINATIONS.slice(0, 10).map(d => (
                            <button
                              key={d.id}
                              onClick={() => handleSelectFamousDest(d)}
                              className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F8F9F5] text-xs flex items-center justify-between transition cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5">
                                <ShoppingBag className="w-3.5 h-3.5 text-[#B9552C] shrink-0" strokeWidth={1.75} />
                                <div>
                                  <div className="font-bold text-[#17201B] flex items-center gap-1.5">
                                    <span>{d.name}</span>
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FAF2EE] text-[#B9552C] font-semibold border border-[#E8C2B3]">
                                      {d.category}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-[#6B7267]">
                                    Nearest Metro: {METRO_STATIONS[d.nearestStationId]?.name || 'Metro'} (~{d.distanceFromStationKm} km)
                                  </div>
                                </div>
                              </div>
                              <ChevronRight className="w-3 h-3 text-[#8E9487]" />
                            </button>
                          ))}
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
                    <span className="text-[11px] font-semibold text-[#6B7267] mr-1">Popular Places:</span>
                    {(['All', 'Gurgaon', 'Delhi'] as const).map(reg => (
                      <button
                        key={reg}
                        onClick={() => setActiveRegionFilter(reg)}
                        className={`text-[10px] px-3 py-1 rounded-full transition font-semibold ios-liquid-pill ${
                          activeRegionFilter === reg
                            ? 'bg-[#143428] text-white font-bold border-[#143428]'
                            : 'text-[#6B7267] hover:text-[#17201B]'
                        }`}
                      >
                        {reg}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAllPlacesModalOpen(true)}
                    className="ios-liquid-pill text-[11px] text-[#143428] hover:text-[#B9552C] font-bold flex items-center gap-1 transition px-2.5 py-1 rounded-lg"
                  >
                    <span>View All 39 Places</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {FAMOUS_DESTINATIONS
                    .filter(dest => {
                      if (activeRegionFilter === 'All') return true;
                      if (activeRegionFilter === 'Gurgaon') return dest.city === 'Gurgaon';
                      if (activeRegionFilter === 'Delhi') return dest.city === 'Delhi';
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
                              : 'bg-white/80 text-[#53584E] border-[#E2E4DC] hover:border-[#B9552C]/40 hover:text-[#17201B]'
                          }`}
                        >
                          <span>{label}</span>
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                              isSelected
                                ? 'bg-black/20 text-white'
                                : dest.city === 'Gurgaon'
                                ? 'bg-[#FAF2EE] text-[#B9552C]'
                                : 'bg-[#F4F5F0] text-[#143428]'
                            }`}
                          >
                            {dest.city === 'Gurgaon' ? 'GGN' : 'DEL'}
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
                passengerCount={passengerCount}
                onPassengerCountChange={setPassengerCount}
                firstMileMode={firstMileMode}
                onFirstMileModeChange={setFirstMileMode}
                lastMileMode={lastMileMode}
                onLastMileModeChange={setLastMileMode}
                deepLinks={liveTripEstimate.deepLinks}
                aiGuide={aiGuide}
                onOpenTransitRadar={() => setIsTransitRadarOpen(true)}
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
                <div className="w-6 h-6 rounded-md bg-[#143428]/10 text-[#143428] flex items-center justify-center">
                  <Waypoints className="w-3.5 h-3.5" strokeWidth={1.75} />
                </div>
                <h3 className="font-bold text-sm text-[#17201B] font-sans">
                  Interactive Transit Radar & Exit Gate Map
                </h3>
              </div>
              <span className="text-[11px] text-[#143428] font-bold bg-[#143428]/10 px-2.5 py-0.5 rounded-full border border-[#143428]/20 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#143428] animate-ping"></span>
                Live Vector Maps
              </span>
            </div>

            <div className="h-[480px] sm:h-[560px] xl:h-[640px] w-full rounded-2xl overflow-hidden border border-[#E2E4DC] shadow-sm relative bg-[#F4F5F0]">
              <MapComponent plan={tripPlan} userCoords={originCoords} />
            </div>

            {/* Station Legend Helper */}
            {tripPlan && (
              <div className="rounded-2xl bg-white p-4 border border-[#E2E4DC] text-xs space-y-2.5 text-[#53584E] shadow-xs">
                <div className="font-bold text-[#17201B] text-[11px] uppercase tracking-wider flex items-center justify-between">
                  <span>Transit Track Legend</span>
                  <span className="text-[#8E9487] font-normal">Real-time GPS routing</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#143428]"></span>
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
                      <span className="w-2.5 h-2.5 rounded-full bg-[#B9552C]"></span>
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
                    <span className="w-2.5 h-2.5 rounded-full bg-[#B9552C]"></span>
                    <span className="truncate">Destination: {tripPlan.destination.name.split(',')[0]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-1 rounded-full bg-[#143428]"></span>
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
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-2.5 sm:p-4 pb-[max(env(safe-area-inset-bottom,0px),12px)] sm:pb-4 bg-black/60 backdrop-blur-xs"
          >
            <motion.div
              key="all-places-dialog"
              initial={{ opacity: 0, scale: 0.95, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()}
              className="bg-white border border-[#E2E4DC] w-full max-w-4xl max-h-[88dvh] sm:max-h-[88vh] rounded-2xl sm:rounded-[24px] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-[#1E4837] flex items-center justify-between bg-[#143428] text-white">
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
              <div className="p-4 border-b border-[#E2E4DC] bg-[#F8F9F5] space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E9487]" />
                  <input
                    type="text"
                    value={placesModalSearch}
                    onChange={e => setPlacesModalSearch(e.target.value)}
                    placeholder="Filter by name, market, mall, or metro station (e.g., Cyber Hub, Khan Market, 32nd Avenue)..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E2E4DC] text-xs text-[#17201B] placeholder:text-[#8E9487] focus:outline-none focus:border-[#143428] focus:ring-1 focus:ring-[#143428]"
                  />
                  {placesModalSearch && (
                    <button
                      onClick={() => setPlacesModalSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E9487] hover:text-[#17201B] text-xs font-semibold"
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
                          ? 'bg-[#143428] text-white border-[#143428]'
                          : 'bg-white text-[#53584E] border-[#E2E4DC] hover:border-[#8E9487] hover:text-[#17201B]'
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
                        className="p-3.5 rounded-xl bg-[#F8F9F5] border border-[#E2E4DC] hover:border-[#143428]/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[#17201B] text-sm">{dest.name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                              dest.city === 'Gurgaon'
                                ? 'bg-[#FAF2EE] text-[#B9552C] border border-[#E8C2B3]'
                                : 'bg-[#F4F5F0] text-[#143428] border border-[#D5D8CD]'
                            }`}>
                              {dest.city}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-white text-[#53584E] border border-[#E2E4DC] font-medium">
                              {dest.category}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-[#6B7267] flex-wrap">
                            {station && (
                              <span className="flex items-center gap-1.5">
                                <span
                                  className="w-2 h-2 rounded-full inline-block"
                                  style={{ backgroundColor: station.lineColor }}
                                ></span>
                                <strong className="text-[#17201B]">{station.name}</strong>
                                <span className="text-[11px] text-[#6B7267]">({station.line} Line)</span>
                              </span>
                            )}
                            <span>•</span>
                            <span className="text-[#143428] font-bold">
                              Best Exit: Gate {dest.bestExitGate}
                            </span>
                            <span>•</span>
                            <span>{dest.distanceFromStationKm} km from station</span>
                          </div>

                          {/* First Introvert tip teaser */}
                          {dest.introvertTips && dest.introvertTips[0] && (
                            <p className="text-[11px] text-[#53584E] italic line-clamp-1">
                              💡 {dest.introvertTips[0]}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            handleSelectFamousDest(dest);
                            setIsAllPlacesModalOpen(false);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-[#143428] hover:bg-[#1A3E31] text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 transition shadow-xs"
                        >
                          <span>Plan Route</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
              </div>

              {/* Modal Footer */}
              <div className="p-3.5 border-t border-[#E2E4DC] bg-[#F8F9F5] text-center text-xs text-[#6B7267]">
                Showing destinations across Gurgaon, Airport Corridor, South Delhi, and Central/Old Delhi
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
    </>
  );
}

