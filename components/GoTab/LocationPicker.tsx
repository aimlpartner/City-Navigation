'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LocateFixed,
  Building2,
  Utensils,
  Landmark,
  Plane,
  MapPin,
  Check,
  Sparkles,
  Loader2,
  AlertCircle,
  Search,
  X,
  Compass,
  ChevronRight,
  ShoppingBag,
  Hospital,
  GraduationCap,
  TrainFront,
  MapPinned
} from 'lucide-react';

export interface OriginOption {
  name: string;
  lat: number;
  lng: number;
  subtitle?: string;
  iconType?: 'office' | 'food' | 'metro' | 'airport' | 'landmark';
}

export const POPULAR_ORIGINS: OriginOption[] = [
  {
    name: 'DLF Cyber City, Gurgaon',
    subtitle: 'Cyber Hub, Belvedere Towers & Rapid Metro',
    lat: 28.4950,
    lng: 77.0890,
    iconType: 'office',
  },
  {
    name: 'Sector 29 / Leisure Valley, Gurgaon',
    subtitle: 'IFFCO Chowk & Huda City Centre area',
    lat: 28.4682,
    lng: 77.0655,
    iconType: 'food',
  },
  {
    name: 'DLF Phase 3 (U-Block), Gurgaon',
    subtitle: 'Moulsari Avenue, Cyber City Walkway',
    lat: 28.4912,
    lng: 77.0967,
    iconType: 'office',
  },
  {
    name: 'Golf Course Road (Sec 54), Gurgaon',
    subtitle: 'Sector 54 Chowk & Rapid Metro South',
    lat: 28.4417,
    lng: 77.1065,
    iconType: 'office',
  },
  {
    name: 'Saket / Malviya Nagar, Delhi',
    subtitle: 'Select CITYWALK & Saket Metro Gate 2',
    lat: 28.5204,
    lng: 77.2014,
    iconType: 'metro',
  },
  {
    name: 'Hauz Khas, South Delhi',
    subtitle: 'Yellow / Magenta Line Interchange & HKV',
    lat: 28.5494,
    lng: 77.2001,
    iconType: 'food',
  },
  {
    name: 'Connaught Place, Central Delhi',
    subtitle: 'Rajiv Chowk Metro, Inner & Outer Circle',
    lat: 28.6328,
    lng: 77.2195,
    iconType: 'metro',
  },
  {
    name: 'IGI Airport Terminal 3',
    subtitle: 'Airport Express Line & Aerocity Hub',
    lat: 28.5562,
    lng: 77.0864,
    iconType: 'airport',
  },
];

interface LocationPickerProps {
  currentOriginName: string;
  isDetectingLocation: boolean;
  locationError?: string | null;
  detectedLocation?: {
    name: string;
    coords: { lat: number; lng: number };
    nearestStation?: string;
    distanceKm?: number;
    accuracyM?: number;
  } | null;
  onDetectLocation: () => void;
  onSelectOrigin: (name: string, coords: { lat: number; lng: number }) => void;
  onProceedToDestination?: () => void;
}

export function LocationPicker({
  currentOriginName,
  isDetectingLocation,
  locationError,
  detectedLocation,
  onDetectLocation,
  onSelectOrigin,
  onProceedToDestination,
}: LocationPickerProps) {
  const isDetected = Boolean(
    detectedLocation && currentOriginName === detectedLocation.name
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [placesResults, setPlacesResults] = useState<any[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounced search querying Google Places API via /api/places
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
        console.warn('Origin places fetch error:', err);
      } finally {
        setIsSearchingPlaces(false);
      }
    }, 240);

    return () => clearTimeout(timer);
  }, [searchQuery, isSearchFocused]);

  // Click outside listener for dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPlaceIcon = (place: any) => {
    const text = `${place.name} ${place.category || ''} ${place.formattedAddress || ''}`.toLowerCase();
    if (text.includes('hospital') || text.includes('clinic') || text.includes('medanta') || text.includes('fortis') || text.includes('max ')) {
      return <Hospital className="w-4 h-4 text-red-600" />;
    }
    if (text.includes('college') || text.includes('university') || text.includes('campus') || text.includes('school')) {
      return <GraduationCap className="w-4 h-4 text-indigo-600" />;
    }
    if (text.includes('mall') || text.includes('shopping') || text.includes('plaza') || text.includes('citywalk')) {
      return <ShoppingBag className="w-4 h-4 text-[#B9552C]" />;
    }
    if (text.includes('metro') || text.includes('station')) {
      return <TrainFront className="w-4 h-4 text-[#143428]" />;
    }
    if (text.includes('restaurant') || text.includes('cafe') || text.includes('food')) {
      return <Utensils className="w-4 h-4 text-[#B9552C]" />;
    }
    if (text.includes('park') || text.includes('tower') || text.includes('cyber') || text.includes('tech')) {
      return <Building2 className="w-4 h-4 text-[#143428]" />;
    }
    return <MapPinned className="w-4 h-4 text-[#143428]" strokeWidth={2} />;
  };

  const getOriginIcon = (type?: string) => {
    switch (type) {
      case 'airport':
        return <Plane className="w-5 h-5 text-[#143428]" strokeWidth={2} />;
      case 'food':
        return <Utensils className="w-5 h-5 text-[#B9552C]" strokeWidth={2} />;
      case 'landmark':
      case 'metro':
        return <Landmark className="w-5 h-5 text-[#143428]" strokeWidth={2} />;
      default:
        return <Building2 className="w-5 h-5 text-[#143428]" strokeWidth={2} />;
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header with high legibility */}
      <div>
        <h2 className="text-2xl font-black text-[#17201B] tracking-tight font-sans">
          Where are you starting from?
        </h2>
        <p className="text-sm text-[#53584E] mt-0.5">
          Type any mall, colony, hospital, or tap GPS / preset station below.
        </p>
      </div>

      {/* Live Google Maps Connected Search Bar for Starting Point */}
      <div className="relative z-20" ref={searchContainerRef}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8E9487]">
            <Search className="w-4 h-4 text-[#143428]" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!isSearchFocused) setIsSearchFocused(true);
            }}
            onFocus={() => setIsSearchFocused(true)}
            placeholder="Type any mall (Pacific, Ambience), sector, colony..."
            className="w-full pl-10 pr-10 py-3.5 rounded-2xl ios-liquid-input text-[#17201B] placeholder-[#8E9487] text-sm font-medium shadow-xs outline-none transition duration-200"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
            {isSearchingPlaces && <Loader2 className="w-4 h-4 text-[#143428] animate-spin" />}
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPlacesResults([]);
                  setIsSearchFocused(false);
                }}
                className="p-1 rounded-full text-[#8E9487] hover:text-[#17201B] hover:bg-[#F4F5F0] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Live Dropdown */}
        <AnimatePresence>
          {isSearchFocused && placesResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="absolute top-full left-0 right-0 mt-2 ios-liquid-glass-thin rounded-2xl shadow-2xl border border-white/85 p-2 z-30 max-h-80 overflow-y-auto ring-1 ring-[#143428]/10"
            >
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#E2E4DC] mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7267] flex items-center gap-1.5">
                  <Compass className="w-3 h-3 text-[#143428]" />
                  <span>Google Maps Suggestions ({placesResults.length} found)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsSearchFocused(false)}
                  className="text-[10px] text-[#6B7267] hover:text-[#17201B] font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
              <div className="divide-y divide-[#E2E4DC]/70">
                {placesResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelectOrigin(p.name, { lat: p.lat, lng: p.lng });
                      setSearchQuery(p.name);
                      setIsSearchFocused(false);
                      setPlacesResults([]);
                      if (onProceedToDestination) onProceedToDestination();
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-[#F8F9F5] text-xs flex items-center justify-between transition group cursor-pointer"
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="mt-0.5 w-6 h-6 rounded-md bg-[#F4F5F0] flex items-center justify-center shrink-0 border border-[#E2E4DC]">
                        {getPlaceIcon(p)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-[#17201B] text-xs">{p.name}</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-[#F4F5F0] text-[#143428] border border-[#D5D8CD]">
                            {p.city}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#6B7267] truncate mt-0.5">
                          {p.formattedAddress}
                        </div>
                        {p.nearestStation && (
                          <div className="text-[10px] text-[#53584E] mt-1 flex items-center gap-1.5 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: p.nearestStation.lineColor || '#0284c7' }} />
                            <span>Near <strong>{p.nearestStation.name}</strong> ({p.nearestStation.line} Line)</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#8E9487] group-hover:text-[#143428] shrink-0 ml-1.5" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Location Error Notice if GPS encountered an issue */}
      {locationError && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/95 p-4 text-[#17201B] space-y-3 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                GPS Signal Notice
              </h4>
              <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                {locationError}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDetectLocation}
            disabled={isDetectingLocation}
            className="btn-tactile w-full py-2.5 px-3 rounded-xl bg-[#143428] hover:bg-[#1A3E31] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <LocateFixed className={`w-3.5 h-3.5 ${isDetectingLocation ? 'animate-spin' : ''}`} />
            <span>{isDetectingLocation ? 'Pinpointing GPS...' : 'Retry Pinpoint GPS Detection'}</span>
          </button>
        </div>
      )}

      {/* Giant GPS Auto-Detect Button or Verified Detected Card */}
      {isDetected && detectedLocation ? (
        <div className="rounded-2xl border-2 border-emerald-600/70 ios-liquid-glass p-4 sm:p-5 shadow-lg space-y-3.5 transition-all relative overflow-hidden">
          {/* Apple Specular Top Rim */}
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/90 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between gap-2 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-800 text-[#5ee9b5] text-[11px] font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#5ee9b5] animate-pulse" />
              <span>Exact Pinpoint Detected</span>
            </div>
            <button
              type="button"
              onClick={onDetectLocation}
              disabled={isDetectingLocation}
              className="ios-liquid-pill text-xs font-bold text-[#143428] hover:text-[#B9552C] flex items-center gap-1 cursor-pointer px-2.5 py-1 rounded-lg"
            >
              <LocateFixed className={`w-3.5 h-3.5 ${isDetectingLocation ? 'animate-spin' : ''}`} />
              <span>{isDetectingLocation ? 'Re-detecting...' : 'Re-detect'}</span>
            </button>
          </div>

          <div className="flex items-start gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-xl bg-[#143428] text-[#5ee9b5] flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <MapPin className="w-5 h-5" strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold text-[#6B7267] uppercase tracking-wider block">
                  Starting Pinpoint:
                </span>
                {detectedLocation.accuracyM !== undefined && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                    ±{detectedLocation.accuracyM}m accuracy
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black text-[#17201B] leading-snug break-words mt-1">
                {detectedLocation.name}
              </h3>
              {detectedLocation.nearestStation && (
                <p className="text-xs text-[#53584E] mt-2 flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                  <span>
                    Nearest Metro Hub: <strong className="text-[#143428]">{detectedLocation.nearestStation}</strong>
                    {detectedLocation.distanceKm !== undefined ? ` (~${detectedLocation.distanceKm} km away)` : ''}
                  </span>
                </p>
              )}
            </div>
          </div>

          {onProceedToDestination && (
            <button
              type="button"
              onClick={onProceedToDestination}
              className="ios-liquid-pill w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#143428] to-[#1A3E31] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer group border border-white/20 relative z-10"
            >
              <span>Next: Choose Where to Go</span>
              <span className="text-[#5ee9b5] font-black group-hover:translate-x-1 transition-transform">➔</span>
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={onDetectLocation}
          disabled={isDetectingLocation}
          className="ios-liquid-pill w-full relative overflow-hidden flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#143428] via-[#163B2E] to-[#1E4837] text-white shadow-lg border border-white/20 group cursor-pointer"
        >
          {/* Apple Specular Top Rim */}
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
              {isDetectingLocation ? (
                <Loader2 className="w-6 h-6 text-[#5ee9b5] animate-spin" />
              ) : (
                <LocateFixed className="w-6 h-6 text-[#5ee9b5] group-hover:scale-110 transition-transform" strokeWidth={2.2} />
              )}
            </div>
            <div className="text-left">
              <span className="text-base font-extrabold block text-white">
                {isDetectingLocation ? 'Acquiring Exact Coordinates...' : 'Use My Current Location'}
              </span>
              <span className="text-xs text-emerald-200/90 font-medium">
                {isDetectingLocation ? 'Resolving street, block & nearest metro gate...' : 'Finds nearest metro gate automatically'}
              </span>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/80 shrink-0 group-hover:scale-110 transition-transform relative z-10">
            <MapPin className="w-4 h-4 text-[#5ee9b5]" />
          </div>
        </button>
      )}

      {/* Section Divider */}
      <div className="flex items-center gap-3 pt-1">
        <div className="h-px flex-1 bg-[#E2E4DC]" />
        <span className="text-xs font-bold uppercase tracking-wider text-[#8E9487]">
          Or pick a starting area
        </span>
        <div className="h-px flex-1 bg-[#E2E4DC]" />
      </div>

      {/* Large, Easy-to-Tap Location Cards */}
      <div className="grid grid-cols-1 gap-2.5">
        {POPULAR_ORIGINS.map((origin) => {
          const isSelected = currentOriginName === origin.name;

          return (
            <button
              key={origin.name}
              type="button"
              onClick={() => onSelectOrigin(origin.name, { lat: origin.lat, lng: origin.lng })}
              className={`card-interactive w-full min-h-[64px] p-3.5 sm:p-4 rounded-2xl border text-left flex items-center justify-between gap-3.5 group cursor-pointer ${
                isSelected
                  ? 'bg-white border-[#143428] ring-2 ring-[#143428] shadow-sm'
                  : 'bg-white/90 backdrop-blur-xs hover:bg-white border-[#E2E4DC] hover:border-[#143428]/40 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                    isSelected ? 'bg-[#143428] text-white' : 'bg-[#F4F5F0]'
                  }`}
                >
                  {isSelected ? (
                    <Check className="w-5 h-5 text-[#5ee9b5]" strokeWidth={2.5} />
                  ) : (
                    getOriginIcon(origin.iconType)
                  )}
                </div>

                <div className="min-w-0 text-left">
                  <span className="text-base font-bold text-[#17201B] block truncate leading-snug">
                    {origin.name}
                  </span>
                  {origin.subtitle && (
                    <span className="text-xs text-[#6B7267] block truncate mt-0.5">
                      {origin.subtitle}
                    </span>
                  )}
                </div>
              </div>

              {isSelected && (
                <span className="px-2.5 py-1 rounded-full bg-[#143428] text-white text-[11px] font-extrabold uppercase tracking-wide shrink-0">
                  Selected
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
