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
  Loader2
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
    subtitle: 'Phase 3 Metro & Micromax Moulsari',
    lat: 28.4912,
    lng: 77.0967,
    iconType: 'office',
  },
  {
    name: 'Golf Course Road (Sec 54), Gurgaon',
    subtitle: 'Sector 53-54 & Horizon Centre',
    lat: 28.4417,
    lng: 77.1065,
    iconType: 'office',
  },
  {
    name: 'Saket / Malviya Nagar, Delhi',
    subtitle: 'Select Citywalk & Yellow Line',
    lat: 28.5204,
    lng: 77.2014,
    iconType: 'landmark',
  },
  {
    name: 'Hauz Khas, South Delhi',
    subtitle: 'Yellow & Magenta Interchange Hub',
    lat: 28.5494,
    lng: 77.2001,
    iconType: 'landmark',
  },
  {
    name: 'Connaught Place, Central Delhi',
    subtitle: 'Rajiv Chowk Metro (Central Interchange)',
    lat: 28.6328,
    lng: 77.2195,
    iconType: 'landmark',
  },
  {
    name: 'IGI Airport Terminal 3',
    subtitle: 'Airport Express Metro Terminal',
    lat: 28.5562,
    lng: 77.0864,
    iconType: 'airport',
  },
];

interface LocationPickerProps {
  currentOriginName: string;
  isDetectingLocation: boolean;
  onDetectLocation: () => void;
  onSelectOrigin: (name: string, coords: { lat: number; lng: number }) => void;
}

export function LocationPicker({
  currentOriginName,
  isDetectingLocation,
  onDetectLocation,
  onSelectOrigin,
}: LocationPickerProps) {
  const getOriginIcon = (type?: string) => {
    switch (type) {
      case 'airport':
        return <Plane className="w-5 h-5 text-[#143428]" strokeWidth={2} />;
      case 'food':
        return <Utensils className="w-5 h-5 text-[#B9552C]" strokeWidth={2} />;
      case 'landmark':
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

      {/* Giant GPS Auto-Detect Button */}
      <button
        type="button"
        onClick={onDetectLocation}
        disabled={isDetectingLocation}
        className="w-full relative overflow-hidden flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-[#143428] to-[#1E4837] text-white shadow-md active:scale-[0.99] transition-all border border-[#1E4837] group"
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
              {isDetectingLocation ? 'Locating your GPS...' : 'Use My Current Location'}
            </span>
            <span className="text-xs text-emerald-200/90 font-medium">
              Finds nearest metro gate automatically
            </span>
          </div>
        </div>

        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/80 shrink-0">
          <MapPin className="w-4 h-4 text-[#5ee9b5]" />
        </div>
      </button>

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
