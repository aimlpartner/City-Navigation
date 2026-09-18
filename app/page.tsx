'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FAMOUS_DESTINATIONS,
  FamousDestination,
  planMultiModalTrip,
  MultiModalTripPlan,
  METRO_STATIONS
} from '@/lib/delhi-ncr-transit';
import { MapComponent } from '@/components/MapComponent';
import { IntrovertGuideCard } from '@/components/IntrovertGuideCard';
import { CityQuickGuide } from '@/components/CityQuickGuide';
import { LiveTransitRadarModal } from '@/components/LiveTransitRadarModal';
import { MobileAppShell } from '@/components/MobileAppShell';
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
  Download
} from 'lucide-react';
import { triggerPwaInstall } from '@/components/PwaInstallPrompt';


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

  // Search autocomplete results
  const [placesResults, setPlacesResults] = useState<
    { id: string; name: string; formattedAddress: string; category?: string; lat?: number; lng?: number }[]
  >([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isTransitRadarOpen, setIsTransitRadarOpen] = useState(false);

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

  // Calculate route plan when origin or destination changes (pure memoized computation)
  const tripPlan = useMemo(() => {
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
      selectedDestination || undefined
    );
  }, [originName, originCoords, selectedDestination, customDestCoords]);

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

  // Browser Geolocation
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setIsDetectingLocation(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setOriginCoords({ lat, lng });
        setOriginName('My Detected GPS Location');
      },
      err => {
        setIsDetectingLocation(false);
        console.warn('Geolocation failed:', err);
        // Default to Gurgaon Cyber City if location permission denied
        setOriginCoords({ lat: 28.4950, lng: 77.0890 });
        setOriginName('DLF Cyber City, Gurgaon');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Handle destination live search query
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingPlaces(true);
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setPlacesResults(data.places || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingPlaces(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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
        name: place.areaHint ? `${place.name} (${place.areaHint})` : place.name,
        lat: place.lat,
        lng: place.lng
      });
    }
    setSearchQuery(place.name);
    setPlacesResults([]);
    setIsSearchFocused(false);
  };

  return (
    <>
      {/* Mobile-First Experience (<1024px) */}
      <MobileAppShell
        originName={originName}
        originCoords={originCoords}
        selectedDestination={selectedDestination}
        tripPlan={tripPlan}
        aiGuide={aiGuide}
        isDetectingLocation={isDetectingLocation}
        onDetectLocation={handleDetectLocation}
        onSelectOrigin={(name, coords) => {
          setOriginName(name);
          setOriginCoords(coords);
        }}
        onSelectDestination={handleSelectFamousDest}
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
        {/* Top Application Header */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-[#E2E4DC] shadow-xs">
        <div className="w-full max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-10 xl:px-12 h-16 flex items-center justify-between">
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
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl bg-white hover:bg-[#F8F9F5] text-[#143428] border border-[#D5D8CD] text-xs font-bold transition shadow-xs shrink-0 cursor-pointer active:scale-95"
              title="Download & Install App (PWA)"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#143428]" strokeWidth={2} />
              <span>Download App</span>
            </button>

            <button
              onClick={() => setIsTransitRadarOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl bg-[#143428] hover:bg-[#1A3E31] text-white text-xs font-bold transition shadow-xs shrink-0"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <Radar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300" strokeWidth={1.75} />
              <span className="hidden xs:inline">Live Transit Radar</span>
              <span className="xs:hidden">Radar</span>
            </button>

            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F8F9F5] text-[#17201B] text-xs font-semibold border border-[#E2E4DC]">
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
        <div className="mb-4 sm:mb-6 rounded-xl sm:rounded-2xl bg-white border border-[#E2E4DC] px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-3 text-xs shadow-xs text-[#53584E]">
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
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F8F9F5] hover:bg-[#EAECE4] border border-[#E2E4DC] text-[11px] font-bold text-[#143428] hover:text-[#B9552C] shrink-0 transition whitespace-nowrap"
          >
            <span>All 7 Lines</span>
            <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Navigation Query Bar (Origin & Destination Selection) */}
        <section className="bg-white rounded-2xl sm:rounded-[24px] p-4 sm:p-6 xl:p-8 border border-[#E2E4DC] shadow-xs mb-5 sm:mb-8 relative z-30">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 xl:gap-8">
            {/* Origin Location Selector */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[#17201B] flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-[#143428]/10 text-[#143428] flex items-center justify-center">
                    <CircleDot className="w-3.5 h-3.5" strokeWidth={2} />
                  </div>
                  <span>Departure Location</span>
                </label>
                <button
                  onClick={handleDetectLocation}
                  disabled={isDetectingLocation}
                  className="text-xs font-bold text-[#143428] hover:text-[#B9552C] flex items-center gap-1.5 transition px-2.5 py-1 rounded-lg bg-[#F8F9F5] border border-[#E2E4DC]"
                >
                  <LocateFixed className={`w-3.5 h-3.5 ${isDetectingLocation ? 'animate-spin' : ''}`} strokeWidth={1.75} />
                  <span>{isDetectingLocation ? 'Detecting...' : 'Use GPS'}</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={originName}
                  onChange={e => setOriginName(e.target.value)}
                  placeholder="e.g. DLF Cyber City, Sector 29, or colony"
                  className="w-full px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-xl bg-[#F8F9F5] border border-[#E2E4DC] text-sm text-[#17201B] font-medium placeholder:text-[#8E9487] focus:bg-white focus:border-[#143428] focus:ring-2 focus:ring-[#143428]/15 focus:outline-none transition shadow-xs"
                />
              </div>

              {/* Quick Origin Preset Pills (Horizontal Scroll on Mobile) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                <span className="text-[11px] font-semibold text-[#6B7267] mr-0.5 shrink-0">Quick:</span>
                {COMMON_ORIGINS.slice(0, 4).map((loc, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setOriginName(loc.name);
                      setOriginCoords({ lat: loc.lat, lng: loc.lng });
                    }}
                    className={`text-[11px] px-3 py-1 rounded-lg border transition font-medium shrink-0 whitespace-nowrap ${
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

            {/* Destination Search & Pick */}
            <div className="space-y-2.5 relative z-40">
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
                  placeholder="Type any place (e.g. Ambience Mall, DLF, Cyber Hub, Pacific, Vegas)..."
                  className="w-full pl-10 pr-16 py-3.5 rounded-xl bg-[#F8F9F5] border border-[#E2E4DC] text-sm text-[#17201B] font-medium placeholder:text-[#8E9487] focus:bg-white focus:border-[#143428] focus:ring-2 focus:ring-[#143428]/15 focus:outline-none transition shadow-xs"
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
                      className="p-1 rounded-md text-[#8E9487] hover:text-[#17201B] hover:bg-[#EAECE4] transition"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Autocomplete Dropdown anchored directly below the input */}
                <AnimatePresence>
                  {isSearchFocused && (
                    <>
                      {/* Backdrop to close dropdown on click outside */}
                      <motion.div
                        key="search-dropdown-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 z-40"
                        onClick={() => setIsSearchFocused(false)}
                      />

                      <motion.div
                        key="search-dropdown-card"
                        initial={{ opacity: 0, y: -8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-[#E2E4DC] p-2 z-50 max-h-96 overflow-y-auto ring-1 ring-[#143428]/10"
                      >
                        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#E2E4DC] mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7267] flex items-center gap-1.5">
                            {searchQuery.trim().length >= 2 ? (
                              <>
                                <Compass className="w-3 h-3 text-[#143428]" />
                                <span>Smart Live Suggestions ({placesResults.length} found)</span>
                              </>
                            ) : (
                              <span>Popular Curated Destinations (Delhi & Gurgaon)</span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsSearchFocused(false)}
                            className="text-[10px] text-[#6B7267] hover:text-[#17201B] font-semibold"
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
                                className="w-full text-left p-2.5 rounded-xl hover:bg-[#F8F9F5] text-xs flex items-center justify-between transition group"
                              >
                                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                  <div className="mt-0.5 w-6 h-6 rounded-md bg-[#F4F5F0] group-hover:bg-[#EAECE4] flex items-center justify-center shrink-0 border border-[#E2E4DC]">
                                    {p.isCurated ? (
                                      <Landmark className="w-3.5 h-3.5 text-[#143428]" strokeWidth={1.75} />
                                    ) : (
                                      <MapPinned className="w-3.5 h-3.5 text-[#B9552C]" strokeWidth={1.75} />
                                    )}
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
                                          <span className="text-[#6B7267]">• {p.nearestStation.distanceKm} km away</span>
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
                                  Try searching by landmark, sector, or metro station (e.g. Ambience Mall, Cyber Hub, Khan Market)
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* When user hasn't typed yet: Curated Hotspots */
                          <div className="space-y-1">
                            {FAMOUS_DESTINATIONS.slice(0, 8).map(d => (
                              <button
                                key={d.id}
                                onClick={() => handleSelectFamousDest(d)}
                                className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F8F9F5] text-xs flex items-center justify-between transition"
                              >
                                <div className="flex items-center gap-2.5">
                                  <Landmark className="w-3.5 h-3.5 text-[#143428] shrink-0" strokeWidth={1.75} />
                                  <div>
                                    <div className="font-bold text-[#17201B] flex items-center gap-1.5">
                                      <span>{d.name}</span>
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FAF2EE] text-[#B9552C] font-semibold border border-[#E8C2B3]">
                                        {d.category}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-[#6B7267]">
                                      Nearest: {METRO_STATIONS[d.nearestStationId]?.name} • Exit Gate {d.bestExitGate}
                                    </div>
                                  </div>
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    d.city === 'Gurgaon'
                                      ? 'bg-[#FAF2EE] text-[#B9552C] border border-[#E8C2B3]'
                                      : 'bg-[#F4F5F0] text-[#143428] border border-[#D5D8CD]'
                                  }`}
                                >
                                  {d.city}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    </>
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
                        className={`text-[10px] px-2.5 py-0.5 rounded-full transition font-semibold ${
                          activeRegionFilter === reg
                            ? 'bg-[#143428] text-white'
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
                    className="text-[11px] text-[#143428] hover:text-[#B9552C] font-bold flex items-center gap-1 transition"
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
                          className={`text-[11px] px-2.5 py-1 rounded-lg border transition font-medium flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                            isSelected
                              ? 'bg-[#B9552C] text-white font-bold border-[#B9552C] shadow-xs'
                              : 'bg-[#F8F9F5] text-[#53584E] border-[#E2E4DC] hover:border-[#B9552C]/40 hover:text-[#17201B]'
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
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs"
          >
            <motion.div
              key="all-places-dialog"
              initial={{ opacity: 0, scale: 0.95, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()}
              className="bg-white border border-[#E2E4DC] w-full max-w-4xl max-h-[88vh] rounded-2xl sm:rounded-[24px] shadow-2xl flex flex-col overflow-hidden"
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
    </>
  );
}

