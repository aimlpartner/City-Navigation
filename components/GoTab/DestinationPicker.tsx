'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FamousDestination,
  FAMOUS_DESTINATIONS,
  METRO_STATIONS
} from '@/lib/delhi-ncr-transit';
import {
  Search,
  ArrowLeft,
  X,
  MapPin,
  ShoppingBag,
  Building2,
  Utensils,
  Landmark,
  DoorOpen,
  Check,
  Plane,
  Sparkles,
  TrainFront,
  Loader2,
  Compass,
  MapPinned,
  ChevronRight,
  Hospital,
  GraduationCap,
  Store,
  Navigation
} from 'lucide-react';

export interface CustomDestinationItem {
  id: string;
  name: string;
  city?: string;
  areaHint?: string;
  formattedAddress?: string;
  category?: string;
  lat: number;
  lng: number;
  nearestStation?: {
    id: string;
    name: string;
    line: string;
    lineColor: string;
    distanceKm: number;
  };
  bestExitGate?: number;
  isCurated?: boolean;
  curatedData?: FamousDestination;
}

interface DestinationPickerProps {
  currentDestination: FamousDestination | null;
  customDestination?: { name: string; lat: number; lng: number } | null;
  originName: string;
  onSelectDestination: (dest: any) => void;
  onBackToOrigin: () => void;
}

const QUICK_SEARCH_CHIPS = [
  { label: '🏥 Hospitals', query: 'Hospital' },
  { label: '🛍️ Local Markets', query: 'Market' },
  { label: '🎓 Universities', query: 'College University' },
  { label: '🏢 Tech Parks & Societies', query: 'Tech Park' },
  { label: '☕ Cafes & Dining', query: 'Cafe' },
];

export function DestinationPicker({
  currentDestination,
  customDestination,
  originName,
  onSelectDestination,
  onBackToOrigin,
}: DestinationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Gurgaon' | 'Delhi' | 'Mall' | 'Food'>('All');
  
  // Real-time Google Places state
  const [placesResults, setPlacesResults] = useState<any[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Debounced live search querying Google Places API (New) via /api/places
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setPlacesResults([]);
      setIsSearchingPlaces(false);
      setSearchError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingPlaces(true);
      setSearchError(null);
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          setPlacesResults(data.places || []);
        } else {
          setPlacesResults([]);
        }
      } catch (err) {
        console.warn('Places fetch error:', err);
        setSearchError('Network glitch while searching Google Maps.');
      } finally {
        setIsSearchingPlaces(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter curated destinations based on filter pill
  const filteredCuratedDestinations = useMemo(() => {
    return FAMOUS_DESTINATIONS.filter((dest) => {
      if (activeFilter === 'All') return true;
      if (activeFilter === 'Gurgaon') return dest.city === 'Gurgaon';
      if (activeFilter === 'Delhi') return dest.city === 'Delhi';
      if (activeFilter === 'Mall') return dest.category === 'Mall';
      if (activeFilter === 'Food') return dest.category === 'Dining / Nightlife';
      return true;
    });
  }, [activeFilter]);

  const getPlaceIcon = (place: any) => {
    const text = `${place.name} ${place.category || ''} ${place.formattedAddress || ''}`.toLowerCase();
    if (text.includes('hospital') || text.includes('clinic') || text.includes('medical') || text.includes('health') || text.includes('dr ')) {
      return <Hospital className="w-4 h-4 text-red-600" />;
    }
    if (text.includes('college') || text.includes('university') || text.includes('school') || text.includes('institute')) {
      return <GraduationCap className="w-4 h-4 text-indigo-600" />;
    }
    if (text.includes('mall') || text.includes('shopping') || text.includes('plaza')) {
      return <ShoppingBag className="w-4 h-4 text-[#B9552C]" />;
    }
    if (text.includes('metro') || text.includes('station')) {
      return <TrainFront className="w-4 h-4 text-[#143428]" />;
    }
    if (text.includes('restaurant') || text.includes('cafe') || text.includes('food') || text.includes('kitchen') || text.includes('dining')) {
      return <Utensils className="w-4 h-4 text-[#B9552C]" />;
    }
    if (text.includes('park') || text.includes('tower') || text.includes('cyber') || text.includes('tech') || text.includes('society') || text.includes('apartment')) {
      return <Building2 className="w-4 h-4 text-[#143428]" />;
    }
    return <MapPinned className="w-4 h-4 text-[#B9552C]" strokeWidth={2} />;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Mall':
        return <ShoppingBag className="w-5 h-5 text-[#B9552C]" />;
      case 'Dining / Nightlife':
        return <Utensils className="w-5 h-5 text-[#B9552C]" />;
      case 'Tech Park / Hub':
        return <Building2 className="w-5 h-5 text-[#143428]" />;
      default:
        return <Landmark className="w-5 h-5 text-[#143428]" />;
    }
  };

  const isSearchActive = searchQuery.trim().length >= 2;

  return (
    <div className="space-y-5 pb-6">
      {/* Top Navigation & Step Indicator */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToOrigin}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F4F5F0] border border-[#E2E4DC] text-xs font-bold text-[#143428] shadow-xs active:scale-95 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Change Starting Point</span>
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#143428]/10 text-[#143428] text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Step 2 of 2</span>
        </div>
      </div>

      {/* Starting Location Confirmation Bar */}
      <div className="p-3 rounded-2xl bg-white border border-[#E2E4DC] shadow-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#143428]/10 flex items-center justify-center text-[#143428] shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <span className="text-xs text-[#53584E] truncate">
            Starting from: <strong className="text-[#17201B] font-bold">{originName}</strong>
          </span>
        </div>
        <button
          type="button"
          onClick={onBackToOrigin}
          className="text-xs font-bold text-[#B9552C] hover:underline shrink-0 cursor-pointer"
        >
          Change
        </button>
      </div>

      {/* Main Title */}
      <div>
        <h2 className="text-2xl font-black text-[#17201B] tracking-tight font-sans">
          Where do you want to go?
        </h2>
        <p className="text-sm text-[#53584E] mt-0.5">
          Type any local place, hospital, society, college, market, or landmark.
        </p>
      </div>

      {/* Live Google Places Powered Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-[#8E9487]" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search any place (e.g. Batra Hospital, Primanti, DU, CP)..."
          className="w-full pl-11 pr-11 py-3.5 rounded-2xl bg-white border-2 border-[#D5D8CD] focus:border-[#143428] focus:ring-2 focus:ring-[#143428]/20 text-[#17201B] placeholder-[#8E9487] text-base font-medium shadow-xs outline-none transition"
        />
        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center gap-1.5">
          {isSearchingPlaces && (
            <Loader2 className="w-5 h-5 text-[#143428] animate-spin" />
          )}
          {searchQuery && !isSearchingPlaces && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setPlacesResults([]);
              }}
              className="p-1 rounded-full text-[#8E9487] hover:text-[#17201B] hover:bg-[#F4F5F0] transition cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* When Search is Active (User typed >= 2 characters) */}
      {isSearchActive ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-[#6B7267] uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#143428]" />
              <span>
                {isSearchingPlaces
                  ? 'Searching Google Maps across Delhi-NCR...'
                  : `Google Maps Results (${placesResults.length} found)`}
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setPlacesResults([]);
              }}
              className="text-xs text-[#8E9487] hover:text-[#17201B] font-semibold"
            >
              Show All
            </button>
          </div>

          {/* Loading Skeleton */}
          {isSearchingPlaces && placesResults.length === 0 && (
            <div className="space-y-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="p-3.5 rounded-2xl bg-white border border-[#E2E4DC] animate-pulse flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Live Google Places Result Cards */}
          {placesResults.length > 0 && (
            <div className="space-y-2.5">
              {placesResults.map((place: any) => {
                const isSelected =
                  (currentDestination?.id === place.curatedId) ||
                  (customDestination?.lat === place.lat && customDestination?.lng === place.lng);

                return (
                  <button
                    key={place.id || `${place.name}-${place.lat}`}
                    type="button"
                    onClick={() => onSelectDestination(place)}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all group active:scale-[0.98] cursor-pointer ${
                      isSelected
                        ? 'bg-[#FAF6F3] border-[#B9552C] ring-2 ring-[#B9552C] shadow-sm'
                        : 'bg-white hover:bg-[#F8F9F5] border-[#E2E4DC] hover:border-[#143428]/40 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-[#F4F5F0] group-hover:bg-[#EAECE4] flex items-center justify-center shrink-0 border border-[#E2E4DC] transition-colors mt-0.5">
                        {getPlaceIcon(place)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-black text-[#17201B] leading-snug group-hover:text-[#143428] transition-colors">
                            {place.name}
                          </h3>
                          {place.city && (
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                                place.city === 'Gurgaon'
                                  ? 'bg-[#FAF2EE] text-[#B9552C] border border-[#E8C2B3]'
                                  : place.city === 'Noida'
                                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                  : 'bg-[#F4F5F0] text-[#143428] border border-[#D5D8CD]'
                              }`}
                            >
                              {place.city}
                            </span>
                          )}
                          {place.areaHint && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#F4F5F0] text-[#53584E] border border-[#E2E4DC] font-medium">
                              {place.areaHint}
                            </span>
                          )}
                        </div>

                        {place.formattedAddress && (
                          <p className="text-xs text-[#6B7267] truncate mt-0.5">
                            {place.formattedAddress}
                          </p>
                        )}

                        {place.nearestStation && (
                          <div className="flex items-center gap-1.5 text-[11px] text-[#53584E] font-medium mt-1.5 flex-wrap">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: place.nearestStation.lineColor || '#0284c7' }}
                            />
                            <span>
                              Nearest: <strong className="text-[#143428]">{place.nearestStation.name}</strong> ({place.nearestStation.line} Line)
                            </span>
                            <span className="text-[#8E9487]">• ~{place.nearestStation.distanceKm} km</span>
                            {place.bestExitGate && (
                              <span className="bg-[#B9552C] text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded">
                                Gate {place.bestExitGate}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-[#8E9487] group-hover:text-[#143428] group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </button>
                );
              })}
            </div>
          )}

          {/* No results notice with helpful suggestions */}
          {!isSearchingPlaces && placesResults.length === 0 && (
            <div className="p-7 text-center bg-white rounded-2xl border border-[#E2E4DC] space-y-2">
              <p className="text-sm font-bold text-[#17201B]">
                No places found for &quot;{searchQuery}&quot;
              </p>
              <p className="text-xs text-[#6B7267] leading-relaxed max-w-xs mx-auto">
                Google Maps could not find a direct match. Try searching by sector (e.g. &quot;Sector 14&quot;), landmark, or street name.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPlacesResults([]);
                }}
                className="mt-2 text-xs font-bold text-[#143428] underline"
              >
                Clear search and view all places
              </button>
            </div>
          )}
        </div>
      ) : (
        /* When search query is empty: Quick Category Chips + Curated Landmarks Grid */
        <div className="space-y-4">
          {/* Quick Search Chips */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-[#8E9487] uppercase tracking-wider block">
              Quick Local Search
            </span>
            <div data-no-swipe="true" className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {QUICK_SEARCH_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setSearchQuery(chip.query)}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F4F5F0] border border-[#E2E4DC] text-xs font-semibold text-[#17201B] whitespace-nowrap shrink-0 transition active:scale-95 shadow-xs cursor-pointer"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Curated Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-1">
            {(['All', 'Gurgaon', 'Delhi', 'Mall', 'Food'] as const).map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#143428] text-white shadow-xs'
                      : 'bg-white text-[#53584E] border border-[#E2E4DC] hover:bg-[#F8F9F5]'
                  }`}
                >
                  {filter === 'All' ? '🌟 All Landmarks' : filter}
                </button>
              );
            })}
          </div>

          {/* 2-Column Curated Grid */}
          <div className="grid grid-cols-2 gap-3">
            {filteredCuratedDestinations.map((dest) => {
              const isSelected = currentDestination?.id === dest.id;
              const nearestStation = METRO_STATIONS[dest.nearestStationId];

              return (
                <button
                  key={dest.id}
                  type="button"
                  onClick={() => onSelectDestination(dest)}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between min-h-[135px] transition-all relative group active:scale-[0.97] cursor-pointer ${
                    isSelected
                      ? 'bg-[#FAF6F3] border-[#B9552C] ring-2 ring-[#B9552C] shadow-sm'
                      : 'bg-white hover:bg-[#F8F9F5] border-[#E2E4DC] shadow-xs'
                  }`}
                >
                  {/* Category Icon & Gate Badge */}
                  <div className="flex items-start justify-between gap-1 w-full">
                    <div className="w-9 h-9 rounded-xl bg-[#F4F5F0] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {getCategoryIcon(dest.category)}
                    </div>

                    <span className="px-2 py-0.5 rounded-md bg-[#B9552C] text-white text-[10px] font-extrabold tracking-wide shrink-0">
                      Gate {dest.bestExitGate}
                    </span>
                  </div>

                  {/* Destination Name */}
                  <div className="my-1.5">
                    <h3 className="text-sm font-black text-[#17201B] line-clamp-2 leading-snug group-hover:text-[#143428] transition-colors">
                      {dest.name}
                    </h3>
                  </div>

                  {/* Station Tag & Line Indicator */}
                  <div className="w-full pt-2 border-t border-[#F0F2EB] flex items-center justify-between text-[11px] text-[#6B7267]">
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: nearestStation?.lineColor || '#0284c7' }}
                      />
                      <span className="truncate font-medium">{nearestStation?.name || 'Metro'}</span>
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#B9552C] shrink-0 font-bold" strokeWidth={3} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
