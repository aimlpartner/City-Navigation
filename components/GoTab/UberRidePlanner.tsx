'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  FAMOUS_DESTINATIONS,
  METRO_STATIONS
} from '@/lib/delhi-ncr-transit';
import {
  resolvePlaceSuggestion,
  resolveFreeformLocation,
  getRecentPlaces,
  saveRecentPlace,
  formatDistanceBetweenCoords,
  RecentPlaceItem
} from '@/lib/utils';
import { MapPinPickerModal, MapPinPickerResult } from '@/components/MapPinPickerModal';
import { apiFetch } from '@/lib/api-client';
import {
  ArrowLeft,
  ArrowUpDown,
  Clock,
  Globe,
  Loader2,
  LocateFixed,
  MapPin,
  Search,
  Users,
  X,
  ChevronRight,
  Navigation
} from 'lucide-react';

interface UberRidePlannerProps {
  originName: string;
  originCoords: { lat: number; lng: number };
  destinationName?: string;
  destinationCoords?: { lat: number; lng: number };
  hasActiveDestination?: boolean;
  passengerCount?: number;
  onPassengerCountChange?: (count: number) => void;
  isDetectingLocation: boolean;
  detectedLocation?: {
    name: string;
    coords: { lat: number; lng: number };
    nearestStation?: string;
    distanceKm?: number;
  } | null;
  onDetectLocation: () => void;
  onSelectOrigin: (name: string, coords: { lat: number; lng: number }) => void;
  onSelectDestination: (place: any) => void;
  onSwapLocations: () => void;
  onViewRoute?: () => void;
}

export function UberRidePlanner({
  originName,
  originCoords,
  destinationName = '',
  passengerCount = 1,
  onPassengerCountChange,
  isDetectingLocation,
  detectedLocation,
  onDetectLocation,
  onSelectOrigin,
  onSelectDestination,
  onSwapLocations,
  onViewRoute,
}: UberRidePlannerProps) {
  const [activeField, setActiveField] = useState<'origin' | 'destination'>('destination');
  const [originDraft, setOriginDraft] = useState<string | null>(null);
  const [dropoffInput, setDropoffInput] = useState<string>('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasLoadedMore, setHasLoadedMore] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [cityScope, setCityScope] = useState<'ncr' | 'india'>('ncr');
  const [recents, setRecents] = useState<RecentPlaceItem[]>(() => getRecentPlaces());
  const [mapPickerOpen, setMapPickerOpen] = useState(false);

  const pickupRef = useRef<HTMLInputElement>(null);
  const dropoffRef = useRef<HTMLInputElement>(null);
  const sessionTokenRef = useRef<string>('');
  const abortRef = useRef<AbortController | null>(null);

  const getSessionToken = () => {
    if (!sessionTokenRef.current) {
      sessionTokenRef.current =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
    }
    return sessionTokenRef.current;
  };

  const refreshSessionToken = () => {
    sessionTokenRef.current =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
  };

  const pickupValue = originDraft !== null ? originDraft : originName;
  const activeQuery = (activeField === 'origin' ? pickupValue : dropoffInput).trim();

  // Live Google Places Autocomplete biased directly around current originCoords
  useEffect(() => {
    if (activeQuery.length < 2) {
      abortRef.current?.abort();
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsSearching(true);
      setHasLoadedMore(false);
      setSearchError(null);
      try {
        const qs = new URLSearchParams({
          q: activeQuery,
          lat: String(originCoords.lat),
          lng: String(originCoords.lng),
          scope: cityScope,
          sessionToken: getSessionToken(),
        });
        const res = await apiFetch(`/api/places?${qs.toString()}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.places || []);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setSearchError('Could not reach Google Places right now.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [activeQuery, originCoords.lat, originCoords.lng, cityScope]);

  const handleLoadMoreResults = async () => {
    if (activeQuery.length < 2 || isLoadingMore) return;
    setIsLoadingMore(true);
    setSearchError(null);
    try {
      const qs = new URLSearchParams({
        q: activeQuery,
        lat: String(originCoords.lat),
        lng: String(originCoords.lng),
        scope: cityScope,
        mode: 'more',
      });
      const res = await apiFetch(`/api/places?${qs.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const morePlaces: any[] = data.places || [];
        setSuggestions((prev) => {
          const merged = [...prev];
          const seen = new Set(merged.map((p) => `${p.name?.toLowerCase()}-${p.formattedAddress?.slice(0, 20).toLowerCase()}`));
          for (const item of morePlaces) {
            const k = `${item.name?.toLowerCase()}-${item.formattedAddress?.slice(0, 20).toLowerCase()}`;
            if (!seen.has(k)) {
              seen.add(k);
              merged.push(item);
            }
          }
          return merged;
        });
        setHasLoadedMore(true);
      }
    } catch {
      setSearchError('Could not fetch more results.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const applyResolvedPlace = (place: any) => {
    saveRecentPlace(place);
    setRecents(getRecentPlaces());
    refreshSessionToken();

    if (activeField === 'origin') {
      onSelectOrigin(place.name, { lat: place.lat, lng: place.lng });
      setOriginDraft(null);
      setSuggestions([]);
      setActiveField('destination');
      setTimeout(() => dropoffRef.current?.focus(), 40);
    } else {
      setDropoffInput(place.name);
      setSuggestions([]);
      onSelectDestination(place);
    }
  };

  const handleSelectRow = async (item: any) => {
    if (resolvingId) return;
    setSearchError(null);

    if (!item?.needsResolve && typeof item?.lat === 'number' && typeof item?.lng === 'number') {
      applyResolvedPlace(item);
      return;
    }

    setResolvingId(item.id || item.name);
    try {
      const resolved = await resolvePlaceSuggestion(item, {
        sessionToken: getSessionToken(),
        originCoords,
      });
      if (resolved && typeof resolved.lat === 'number' && typeof resolved.lng === 'number') {
        applyResolvedPlace(resolved);
      } else {
        setSearchError(`Could not pinpoint coordinates for "${item.name}".`);
      }
    } finally {
      setResolvingId(null);
    }
  };

  const handleSubmitActiveField = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (activeQuery.length < 2 || resolvingId) return;

    if (suggestions.length > 0) {
      await handleSelectRow(suggestions[0]);
      return;
    }

    setResolvingId('__submit__');
    setSearchError(null);
    try {
      const resolved = await resolveFreeformLocation(activeQuery, {
        originCoords,
        scope: cityScope,
        sessionToken: getSessionToken(),
      });
      if (resolved && typeof resolved.lat === 'number' && typeof resolved.lng === 'number') {
        applyResolvedPlace(resolved);
      } else {
        setSearchError(`No exact match for "${activeQuery}". Try "Get more results" or "Set location on map".`);
      }
    } finally {
      setResolvingId(null);
    }
  };

  const handleMapPinConfirm = (result: MapPinPickerResult) => {
    setMapPickerOpen(false);
    applyResolvedPlace({
      id: `pin-${result.lat.toFixed(5)}-${result.lng.toFixed(5)}`,
      name: result.name,
      formattedAddress: result.formattedAddress,
      lat: result.lat,
      lng: result.lng,
      needsResolve: false,
    });
  };

  const showLiveResults = activeQuery.length >= 2;
  const visibleSuggestions = showLiveResults ? suggestions : [];

  return (
    <div className="flex flex-col h-full min-h-0" data-no-swipe="true">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {onViewRoute && (
            <button
              type="button"
              onClick={onViewRoute}
              className="w-8 h-8 rounded-full bg-[#EAECE4] dark:bg-white/10 text-[#17201B] dark:text-white flex items-center justify-center shrink-0 cursor-pointer hover:bg-[#DFE2D8]"
              aria-label="Back to route"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <h2 className="text-xl font-black text-[#17201B] dark:text-white tracking-tight truncate">
            Plan your ride
          </h2>
        </div>

        <button
          type="button"
          onClick={() => onDetectLocation()}
          disabled={isDetectingLocation}
          className="px-2.5 py-1 rounded-full bg-[#EAECE4] dark:bg-white/10 text-[#143428] dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <LocateFixed className={`w-3.5 h-3.5 ${isDetectingLocation ? 'animate-spin' : ''}`} />
          <span>{isDetectingLocation ? 'GPS...' : 'GPS'}</span>
        </button>
      </div>

      {/* Uber-style Filter Pills Row */}
      <div className="flex items-center gap-2 pb-3 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setCityScope((prev) => (prev === 'ncr' ? 'india' : 'ncr'))}
          className="px-3 py-1.5 rounded-full bg-[#EAECE4] dark:bg-white/12 text-[#17201B] dark:text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Clock className="w-3.5 h-3.5 text-[#143428] dark:text-emerald-300" />
          <span>{cityScope === 'ncr' ? 'Delhi • GGN • Noida' : 'All India'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            const next = (passengerCount % 4) + 1;
            onPassengerCountChange?.(next);
          }}
          className="px-3 py-1.5 rounded-full bg-[#EAECE4] dark:bg-white/12 text-[#17201B] dark:text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Users className="w-3.5 h-3.5 text-[#143428] dark:text-emerald-300" />
          <span>{passengerCount === 1 ? 'For me (1)' : `${passengerCount} riders`}</span>
        </button>

        {onViewRoute && destinationName && (
          <button
            type="button"
            onClick={onViewRoute}
            className="px-3 py-1.5 rounded-full bg-[#143428] dark:bg-emerald-500 text-white dark:text-[#061C12] text-xs font-extrabold flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <span>View Route</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Uber Signature Connected Pickup -> Dropoff Box */}
      <div className="flex items-center gap-2 pb-3">
        <form
          onSubmit={handleSubmitActiveField}
          className="flex-1 min-w-0 rounded-2xl border-2 border-[#17201B] dark:border-white/80 bg-white dark:bg-[#121916] px-3 py-1 shadow-xs"
        >
          {/* Pickup Input Row */}
          <div className="flex items-center gap-2.5 py-2">
            <div className="w-4 flex flex-col items-center shrink-0">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-[#17201B] dark:border-white bg-[#143428] dark:bg-emerald-400" />
            </div>

            <input
              ref={pickupRef}
              type="text"
              value={pickupValue}
              onFocus={(e) => {
                setActiveField('origin');
                setSearchError(null);
                e.target.select();
              }}
              onChange={(e) => {
                setOriginDraft(e.target.value);
                setActiveField('origin');
                setSearchError(null);
                if (e.target.value.trim().length < 2) setSuggestions([]);
              }}
              placeholder="Enter pickup address, gali, sector..."
              className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-[#17201B] dark:text-white placeholder:text-[#8E9487] dark:placeholder:text-[#768478] outline-none"
            />

            {pickupValue && (
              <button
                type="button"
                onClick={() => {
                  setOriginDraft('');
                  setSuggestions([]);
                  setActiveField('origin');
                  pickupRef.current?.focus();
                }}
                className="w-5 h-5 rounded-full bg-[#D5D8CD] dark:bg-white/25 text-[#17201B] dark:text-white flex items-center justify-center shrink-0 cursor-pointer"
                aria-label="Clear pickup"
              >
                <X className="w-3 h-3" strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* Vertical connector + Divider */}
          <div className="flex items-center gap-2.5">
            <div className="w-4 flex justify-center shrink-0">
              <div className="w-[1.5px] h-3 bg-[#8E9487] dark:bg-white/40 -my-1.5" />
            </div>
            <div className="flex-1 h-[1px] bg-[#E2E4DC] dark:bg-white/15" />
          </div>

          {/* Dropoff Input Row */}
          <div className="flex items-center gap-2.5 py-2">
            <div className="w-4 flex flex-col items-center shrink-0">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#17201B] dark:bg-white border border-white/30" />
            </div>

            <input
              ref={dropoffRef}
              type="text"
              value={dropoffInput}
              autoFocus
              onFocus={() => {
                setActiveField('destination');
                setSearchError(null);
              }}
              onChange={(e) => {
                setDropoffInput(e.target.value);
                setActiveField('destination');
                setSearchError(null);
                if (e.target.value.trim().length < 2) setSuggestions([]);
              }}
              placeholder="Where to? Any street, shop, mall, sector..."
              className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-[#17201B] dark:text-white placeholder:text-[#8E9487] dark:placeholder:text-[#768478] outline-none"
            />

            {isSearching && (
              <Loader2 className="w-4 h-4 animate-spin text-[#143428] dark:text-emerald-400 shrink-0" />
            )}

            {dropoffInput && (
              <button
                type="button"
                onClick={() => {
                  setDropoffInput('');
                  setSuggestions([]);
                  setActiveField('destination');
                  dropoffRef.current?.focus();
                }}
                className="w-5 h-5 rounded-full bg-[#D5D8CD] dark:bg-white/25 text-[#17201B] dark:text-white flex items-center justify-center shrink-0 cursor-pointer"
                aria-label="Clear destination"
              >
                <X className="w-3 h-3" strokeWidth={2.5} />
              </button>
            )}
          </div>
          <button type="submit" className="hidden" aria-hidden="true" />
        </form>

        <button
          type="button"
          onClick={() => {
            onSwapLocations();
            const prevPick = pickupValue;
            setOriginDraft(null);
            setDropoffInput(prevPick);
          }}
          className="w-10 h-10 rounded-full bg-[#EAECE4] dark:bg-white/12 text-[#17201B] dark:text-white flex items-center justify-center shrink-0 cursor-pointer hover:bg-[#DDE0D6] dark:hover:bg-white/20 transition"
          title="Swap pickup and destination"
          aria-label="Swap pickup and destination"
        >
          <ArrowUpDown className="w-4 h-4" />
        </button>
      </div>

      {searchError && (
        <div className="mb-2 px-3 py-2 rounded-xl bg-[#FAF2EE] dark:bg-[#2A160E] text-[#B9552C] dark:text-[#FF7A45] text-xs font-bold">
          {searchError}
        </div>
      )}

      {/* Flat Uber-style Scrollable Suggestions & Actions List */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain divide-y divide-[#E2E4DC]/80 dark:divide-white/10 -mx-1 px-1 pb-24">
        {/* GPS Pickup Option when editing Origin */}
        {activeField === 'origin' && (
          <button
            type="button"
            onClick={() => {
              if (detectedLocation) {
                applyResolvedPlace({
                  id: 'gps-current',
                  name: detectedLocation.name,
                  formattedAddress: detectedLocation.nearestStation
                    ? `Near ${detectedLocation.nearestStation}`
                    : detectedLocation.name,
                  lat: detectedLocation.coords.lat,
                  lng: detectedLocation.coords.lng,
                  needsResolve: false,
                });
              } else {
                onDetectLocation();
              }
            }}
            className="w-full py-3 px-1 flex items-center gap-3 text-left hover:bg-white/70 dark:hover:bg-white/5 transition cursor-pointer"
          >
            <div className="w-12 flex flex-col items-center justify-center shrink-0">
              <div className="w-8 h-8 rounded-full bg-[#143428]/10 dark:bg-emerald-500/20 text-[#143428] dark:text-emerald-300 flex items-center justify-center">
                <Navigation className="w-4 h-4" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-[#143428] dark:text-emerald-300">
                Use my live GPS location
              </div>
              <div className="text-xs text-[#6B7267] dark:text-[#9AA59D] truncate">
                {detectedLocation ? detectedLocation.name : 'Detect exact street & block via GPS'}
              </div>
            </div>
          </button>
        )}

        {/* Live Google Places Autocomplete Results with Exact Km Distance */}
        {showLiveResults &&
          visibleSuggestions.map((item, idx) => {
            const isItemResolving = resolvingId === (item.id || item.name);
            const fallbackDist =
              typeof item.lat === 'number' && typeof item.lng === 'number'
                ? formatDistanceBetweenCoords(originCoords.lat, originCoords.lng, item.lat, item.lng)
                : '';
            const distLabel = item.distanceText || fallbackDist;

            return (
              <button
                key={item.id || `${item.name}-${idx}`}
                type="button"
                onClick={() => handleSelectRow(item)}
                className="w-full py-3 px-1 flex items-center gap-3 text-left hover:bg-white/70 dark:hover:bg-white/5 transition cursor-pointer"
              >
                <div className="w-12 flex flex-col items-center justify-center shrink-0 gap-1">
                  <div className="w-8 h-8 rounded-full bg-[#EAECE4] dark:bg-white/12 text-[#17201B] dark:text-white flex items-center justify-center">
                    {isItemResolving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MapPin className="w-4 h-4" />
                    )}
                  </div>
                  {distLabel && (
                    <span className="text-[11px] font-bold text-[#6B7267] dark:text-[#9AA59D] tabular-nums whitespace-nowrap">
                      {distLabel}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-[#17201B] dark:text-[#F3F5EE] truncate">
                    {item.name}
                  </div>
                  <div className="text-xs text-[#6B7267] dark:text-[#9AA59D] truncate mt-0.5">
                    {item.formattedAddress || item.city}
                  </div>
                </div>
              </button>
            );
          })}

        {/* Recent Searches when query is empty (Uber Clock icon + Distance) */}
        {!showLiveResults &&
          recents.map((item) => {
            const distLabel = formatDistanceBetweenCoords(
              originCoords.lat,
              originCoords.lng,
              item.lat,
              item.lng
            );
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectRow(item)}
                className="w-full py-3 px-1 flex items-center gap-3 text-left hover:bg-white/70 dark:hover:bg-white/5 transition cursor-pointer"
              >
                <div className="w-12 flex flex-col items-center justify-center shrink-0 gap-1">
                  <div className="w-8 h-8 rounded-full bg-[#EAECE4] dark:bg-white/12 text-[#17201B] dark:text-white flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-[#6B7267] dark:text-[#9AA59D] tabular-nums whitespace-nowrap">
                    {distLabel}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-[#17201B] dark:text-[#F3F5EE] truncate">
                    {item.name}
                  </div>
                  <div className="text-xs text-[#6B7267] dark:text-[#9AA59D] truncate mt-0.5">
                    {item.formattedAddress}
                  </div>
                </div>
              </button>
            );
          })}

        {/* Quick NCR Landmarks fallback when no typing yet */}
        {!showLiveResults &&
          FAMOUS_DESTINATIONS.slice(0, recents.length > 0 ? 4 : 6).map((dest) => {
            const distLabel = formatDistanceBetweenCoords(
              originCoords.lat,
              originCoords.lng,
              dest.lat,
              dest.lng
            );
            const st = METRO_STATIONS[dest.nearestStationId];
            return (
              <button
                key={dest.id}
                type="button"
                onClick={() =>
                  handleSelectRow({
                    ...dest,
                    id: dest.id,
                    formattedAddress: `${dest.city}${st ? ` • Near ${st.name}` : ''}`,
                    curatedData: dest,
                  })
                }
                className="w-full py-3 px-1 flex items-center gap-3 text-left hover:bg-white/70 dark:hover:bg-white/5 transition cursor-pointer"
              >
                <div className="w-12 flex flex-col items-center justify-center shrink-0 gap-1">
                  <div className="w-8 h-8 rounded-full bg-[#EAECE4] dark:bg-white/12 text-[#17201B] dark:text-white flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-[#6B7267] dark:text-[#9AA59D] tabular-nums whitespace-nowrap">
                    {distLabel}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-[#17201B] dark:text-[#F3F5EE] truncate">
                    {dest.name}
                  </div>
                  <div className="text-xs text-[#6B7267] dark:text-[#9AA59D] truncate mt-0.5">
                    {dest.city}{st ? ` • Near ${st.name} (Gate ${dest.bestExitGate})` : ''}
                  </div>
                </div>
              </button>
            );
          })}

        {/* === THE 3 SIGNATURE UBER BOTTOM ACTION ROWS === */}

        {/* 1. Search in a different city */}
        <button
          type="button"
          onClick={() => setCityScope((prev) => (prev === 'ncr' ? 'india' : 'ncr'))}
          className="w-full py-3.5 px-1 flex items-center gap-3 text-left hover:bg-white/70 dark:hover:bg-white/5 transition cursor-pointer"
        >
          <div className="w-12 flex justify-center shrink-0">
            <div className="w-8 h-8 rounded-full bg-[#EAECE4] dark:bg-white/12 text-[#17201B] dark:text-white flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-[#17201B] dark:text-[#F3F5EE]">
              {cityScope === 'ncr' ? 'Search in a different city' : 'Searching across All India (tap for NCR)'}
            </div>
          </div>
        </button>

        {/* 2. Get more results for <query> */}
        {showLiveResults && (
          <button
            type="button"
            onClick={handleLoadMoreResults}
            disabled={isLoadingMore}
            className="w-full py-3.5 px-1 flex items-center gap-3 text-left hover:bg-white/70 dark:hover:bg-white/5 transition cursor-pointer"
          >
            <div className="w-12 flex justify-center shrink-0">
              <div className="w-8 h-8 rounded-full bg-[#EAECE4] dark:bg-white/12 text-[#17201B] dark:text-white flex items-center justify-center">
                {isLoadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-[#17201B] dark:text-[#F3F5EE] truncate">
                {isLoadingMore
                  ? `Searching deeper for "${activeQuery}"...`
                  : hasLoadedMore
                  ? `Showing extended results for "${activeQuery}"`
                  : `Get more results for ${activeQuery}`}
              </div>
            </div>
          </button>
        )}

        {/* 3. Set location on map */}
        <button
          type="button"
          onClick={() => setMapPickerOpen(true)}
          className="w-full py-3.5 px-1 flex items-center gap-3 text-left hover:bg-white/70 dark:hover:bg-white/5 transition cursor-pointer"
        >
          <div className="w-12 flex justify-center shrink-0">
            <div className="w-8 h-8 rounded-full bg-[#EAECE4] dark:bg-white/12 text-[#17201B] dark:text-white flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-[#17201B] dark:text-[#F3F5EE]">
              Set location on map
            </div>
          </div>
        </button>
      </div>

      {/* Interactive Center-Pin Map Picker */}
      <MapPinPickerModal
        isOpen={mapPickerOpen}
        mode={activeField}
        initialCoords={originCoords}
        initialName={activeField === 'origin' ? originName : destinationName}
        onClose={() => setMapPickerOpen(false)}
        onConfirm={handleMapPinConfirm}
      />
    </div>
  );
}
