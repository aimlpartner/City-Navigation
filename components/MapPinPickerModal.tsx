'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { ArrowLeft, LocateFixed, Loader2, MapPin, TrainFront, Check } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

export interface MapPinPickerResult {
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
}

interface MapPinPickerModalProps {
  isOpen: boolean;
  mode: 'origin' | 'destination';
  initialCoords: { lat: number; lng: number };
  initialName?: string;
  onClose: () => void;
  onConfirm: (result: MapPinPickerResult) => void;
}

interface ReverseGeoState {
  name: string;
  formattedAddress: string;
  nearestStation?: string;
  stationLineColor?: string;
  distanceKm?: number;
  loading: boolean;
}

function PinPickerInner({
  mode,
  initialCoords,
  initialName,
  onClose,
  onConfirm,
}: Omit<MapPinPickerModalProps, 'isOpen'>) {
  const map = useMap();
  const [pinCoords, setPinCoords] = useState(initialCoords);
  const [isDragging, setIsDragging] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [resolved, setResolved] = useState<ReverseGeoState>({
    name: initialName || 'Selected pin location',
    formattedAddress: initialName || `${initialCoords.lat.toFixed(5)}, ${initialCoords.lng.toFixed(5)}`,
    loading: true,
  });

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestCoordsRef = useRef(initialCoords);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setResolved((prev) => ({ ...prev, loading: true }));
    try {
      const res = await apiFetch(`/api/geocode?lat=${lat}&lng=${lng}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('Reverse geocode failed');
      const data = await res.json();
      setResolved({
        name: data.locationName || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        formattedAddress: data.fullAddress || data.locationName || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        nearestStation: data.nearestStation,
        stationLineColor: data.stationLineColor,
        distanceKm: data.distanceKm,
        loading: false,
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setResolved({
        name: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        formattedAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        loading: false,
      });
    }
  }, []);

  useEffect(() => {
    const initTimer = setTimeout(() => {
      void reverseGeocode(initialCoords.lat, initialCoords.lng);
    }, 0);
    return () => {
      clearTimeout(initTimer);
      abortRef.current?.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [initialCoords.lat, initialCoords.lng, reverseGeocode]);

  const handleCameraChanged = useCallback((ev: any) => {
    const center = ev?.detail?.center;
    if (!center) return;
    setIsDragging(true);
    latestCoordsRef.current = { lat: center.lat, lng: center.lng };
    setPinCoords({ lat: center.lat, lng: center.lng });
  }, []);

  const handleIdle = useCallback(() => {
    setIsDragging(false);
    const { lat, lng } = latestCoordsRef.current;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void reverseGeocode(lat, lng);
    }, 220);
  }, [reverseGeocode]);

  const handleCenterOnGps = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        latestCoordsRef.current = coords;
        setPinCoords(coords);
        if (map) {
          map.panTo(coords);
          map.setZoom(17);
        }
        void reverseGeocode(coords.lat, coords.lng);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const isPickup = mode === 'origin';

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-[#F4F5F0] dark:bg-[#0B0F0D]">
      {/* Top Floating Bar */}
      <div className="absolute top-0 inset-x-0 z-20 p-3 sm:p-4 pt-[max(env(safe-area-inset-top,0px),12px)] flex items-center justify-between gap-3 pointer-events-none">
        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto w-10 h-10 rounded-full bg-white dark:bg-[#171E1B] text-[#17201B] dark:text-white border border-[#E2E4DC] dark:border-white/15 shadow-lg flex items-center justify-center cursor-pointer hover:scale-105 transition"
          aria-label="Close map pin picker"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="pointer-events-auto px-4 py-2 rounded-full bg-white dark:bg-[#171E1B] border border-[#E2E4DC] dark:border-white/15 shadow-lg text-xs font-extrabold text-[#17201B] dark:text-white flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 shrink-0 ${
              isPickup ? 'rounded-full bg-[#143428] dark:bg-emerald-400' : 'rounded-xs bg-[#B9552C]'
            }`}
          />
          <span>{isPickup ? 'Move map to set pickup' : 'Move map to set destination'}</span>
        </div>

        <button
          type="button"
          onClick={handleCenterOnGps}
          disabled={isLocating}
          className="pointer-events-auto w-10 h-10 rounded-full bg-white dark:bg-[#171E1B] text-[#143428] dark:text-emerald-400 border border-[#E2E4DC] dark:border-white/15 shadow-lg flex items-center justify-center cursor-pointer hover:scale-105 transition"
          title="Center on my GPS location"
        >
          {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-5 h-5" />}
        </button>
      </div>

      {/* Interactive Google Map */}
      <div className="relative flex-1 w-full">
        <Map
          defaultCenter={initialCoords}
          defaultZoom={16}
          mapId="DEMO_MAP_ID"
          gestureHandling="greedy"
          disableDefaultUI={true}
          onCameraChanged={handleCameraChanged}
          onIdle={handleIdle}
          className="w-full h-full"
        />

        {/* Fixed Center Crosshair Pin (Uber-style) */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
          <div className="relative flex flex-col items-center -translate-y-5">
            <div
              className={`px-3 py-1 rounded-full text-[11px] font-black shadow-lg mb-1.5 border border-white/80 whitespace-nowrap transition-transform duration-150 ${
                isDragging ? '-translate-y-1.5 scale-105' : ''
              } ${
                isPickup
                  ? 'bg-[#143428] text-white'
                  : 'bg-[#17201B] dark:bg-white text-white dark:text-[#17201B]'
              }`}
            >
              {isDragging ? 'Release pin' : isPickup ? 'Pickup' : 'Dropoff'}
            </div>

            <div
              className={`w-9 h-9 flex items-center justify-center shadow-xl border-2 border-white transition-transform duration-150 ${
                isDragging ? '-translate-y-2 scale-110' : ''
              } ${isPickup ? 'rounded-full bg-[#143428]' : 'rounded-xl bg-[#B9552C]'}`}
            >
              <div className={`w-3 h-3 bg-white ${isPickup ? 'rounded-full' : 'rounded-xs'}`} />
            </div>

            {/* Pin Stem & Ground Shadow */}
            <div className="w-0.5 h-3.5 bg-[#17201B] dark:bg-white" />
            <div
              className={`w-3 h-1 rounded-full bg-black/45 transition-all duration-150 ${
                isDragging ? 'scale-125 opacity-30' : 'opacity-70'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Bottom Uber-style Confirmation Card */}
      <div className="z-20 bg-white dark:bg-[#111715] border-t border-[#E2E4DC] dark:border-white/10 px-4 sm:px-6 pt-4 pb-[max(env(safe-area-inset-bottom,0px),18px)] shadow-[0_-10px_30px_rgba(0,0,0,0.12)]">
        <div className="max-w-lg mx-auto space-y-3.5">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                isPickup
                  ? 'bg-[#143428]/10 dark:bg-emerald-500/20 text-[#143428] dark:text-emerald-300'
                  : 'bg-[#B9552C]/15 text-[#B9552C]'
              }`}
            >
              <MapPin className="w-5 h-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#6B7267] dark:text-[#9AA59D]">
                {isPickup ? 'Selected Pickup Spot' : 'Selected Destination'}
              </div>
              <div className="text-base font-black text-[#17201B] dark:text-white truncate mt-0.5 flex items-center gap-2">
                {resolved.loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#143428] dark:text-emerald-400 shrink-0" />
                    <span className="text-[#6B7267] dark:text-[#9AA59D] font-bold text-sm">
                      Reading exact street address...
                    </span>
                  </>
                ) : (
                  <span className="truncate">{resolved.name}</span>
                )}
              </div>
              <div className="text-xs text-[#6B7267] dark:text-[#9AA59D] truncate mt-0.5">
                {resolved.formattedAddress}
              </div>

              {resolved.nearestStation && !resolved.loading && (
                <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#143428] dark:text-emerald-300 bg-[#F4F5F0] dark:bg-white/10 px-2.5 py-0.5 rounded-full">
                  <TrainFront className="w-3 h-3 shrink-0" />
                  <span>
                    Near {resolved.nearestStation}
                    {resolved.distanceKm !== undefined ? ` (${resolved.distanceKm} km)` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={isDragging || resolved.loading}
            onClick={() =>
              onConfirm({
                name: resolved.name,
                formattedAddress: resolved.formattedAddress,
                lat: pinCoords.lat,
                lng: pinCoords.lng,
              })
            }
            className="w-full py-3.5 px-5 rounded-2xl bg-[#17201B] dark:bg-white text-white dark:text-[#111715] font-black text-sm flex items-center justify-center gap-2 shadow-md hover:opacity-95 disabled:opacity-50 transition cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{isPickup ? 'Confirm Pickup Location' : 'Confirm Destination'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function MapPinPickerModal({
  isOpen,
  mode,
  initialCoords,
  initialName,
  onClose,
  onConfirm,
}: MapPinPickerModalProps) {
  if (!isOpen) return null;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  return (
    <APIProvider apiKey={apiKey} libraries={['places', 'geometry']}>
      <PinPickerInner
        mode={mode}
        initialCoords={initialCoords}
        initialName={initialName}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    </APIProvider>
  );
}
