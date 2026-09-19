'use client';

import React from 'react';
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
  AlertCircle
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
    <div className="space-y-6 pb-6">
      {/* Header with high legibility */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#143428]/10 text-[#143428] text-xs font-bold tracking-wide">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Step 1 of 2</span>
        </div>
        <h2 className="text-2xl font-black text-[#17201B] tracking-tight font-sans">
          Where are you starting from?
        </h2>
        <p className="text-sm text-[#53584E] leading-relaxed">
          Tap your current location or choose any station hub below.
        </p>
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
            className="w-full py-2.5 px-3 rounded-xl bg-[#143428] hover:bg-[#1A3E31] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
          >
            <LocateFixed className={`w-3.5 h-3.5 ${isDetectingLocation ? 'animate-spin' : ''}`} />
            <span>{isDetectingLocation ? 'Pinpointing GPS...' : 'Retry Pinpoint GPS Detection'}</span>
          </button>
        </div>
      )}

      {/* Giant GPS Auto-Detect Button or Verified Detected Card */}
      {isDetected && detectedLocation ? (
        <div className="rounded-2xl border-2 border-emerald-600 bg-white p-4 sm:p-5 shadow-md space-y-3.5 transition-all">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-800 text-[#5ee9b5] text-[11px] font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#5ee9b5] animate-pulse" />
              <span>Exact Pinpoint Detected</span>
            </div>
            <button
              type="button"
              onClick={onDetectLocation}
              disabled={isDetectingLocation}
              className="text-xs font-bold text-[#143428] hover:text-[#B9552C] flex items-center gap-1 transition cursor-pointer"
            >
              <LocateFixed className={`w-3.5 h-3.5 ${isDetectingLocation ? 'animate-spin' : ''}`} />
              <span>{isDetectingLocation ? 'Re-detecting...' : 'Re-detect'}</span>
            </button>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#143428] text-[#5ee9b5] flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <MapPin className="w-5 h-5" strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold text-[#6B7267] uppercase tracking-wider block">
                  Starting Pinpoint:
                </span>
                {detectedLocation.accuracyM !== undefined && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
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
              className="w-full py-2.5 px-4 rounded-xl bg-[#143428] hover:bg-[#1A3E31] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-98 transition cursor-pointer"
            >
              <span>Next: Choose Where to Go</span>
              <span className="text-[#5ee9b5] font-black">➔</span>
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={onDetectLocation}
          disabled={isDetectingLocation}
          className="w-full relative overflow-hidden flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-[#143428] to-[#1E4837] text-white shadow-md active:scale-[0.99] transition-all border border-[#1E4837] group cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0 shadow-inner">
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

          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/80 shrink-0">
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
              className={`w-full min-h-[64px] p-4 rounded-2xl border text-left transition-all flex items-center justify-between gap-3.5 active:scale-[0.98] ${
                isSelected
                  ? 'bg-white border-[#143428] ring-2 ring-[#143428] shadow-sm'
                  : 'bg-white hover:bg-[#F8F9F5] border-[#E2E4DC] shadow-xs'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
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
