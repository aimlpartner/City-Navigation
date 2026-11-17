'use client';

import React, { useEffect, useState } from 'react';
import { MultiModalTripPlan, FamousDestination, RideMode, TravelModeChoice } from '@/lib/delhi-ncr-transit';
import { UberRidePlanner } from './UberRidePlanner';
import { RouteResult } from './RouteResult';
import { Navigation, Route, ChevronRight } from 'lucide-react';
import { LiquidGlass } from '@/components/ui/liquid-glass';
import { ThemeToggle } from '@/components/ThemeToggle';
import type { StageNavigationState } from '@/hooks/useStageNavigationNotifier';

interface GoTabScreenProps {
  originName: string;
  originCoords: { lat: number; lng: number };
  selectedDestination: FamousDestination | null;
  customDestCoords?: { name: string; lat: number; lng: number } | null;
  tripPlan: MultiModalTripPlan | null;
  travelMode?: TravelModeChoice;
  onTravelModeChange?: (mode: TravelModeChoice) => void;
  passengerCount?: number;
  onPassengerCountChange?: (count: number) => void;
  firstMileMode?: RideMode;
  onFirstMileModeChange?: (mode: RideMode) => void;
  lastMileMode?: RideMode;
  onLastMileModeChange?: (mode: RideMode) => void;
  deepLinks?: {
    uberFirstMileUrl?: string;
    uberLastMileUrl?: string;
    uberDirectUrl?: string;
    rapidoUrl?: string;
    googleMapsUrl?: string;
  };
  aiGuide?: {
    loading: boolean;
    text: string | null;
    error: string | null;
    links: { title: string; uri: string; source?: string }[];
  };
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
  onSelectDestination: (dest: any) => void;
  onSwapLocations?: () => void;
  onSwitchToMap: () => void;
  onOpenTransitRadar?: () => void;
  stageNav?: StageNavigationState;
}

export function GoTabScreen({
  originName,
  originCoords,
  detectedLocation,
  selectedDestination,
  customDestCoords,
  tripPlan,
  travelMode,
  onTravelModeChange,
  passengerCount,
  onPassengerCountChange,
  firstMileMode,
  onFirstMileModeChange,
  lastMileMode,
  onLastMileModeChange,
  deepLinks,
  aiGuide,
  isDetectingLocation,
  onDetectLocation,
  onSelectOrigin,
  onSelectDestination,
  onSwapLocations,
  onSwitchToMap,
  onOpenTransitRadar,
  stageNav,
}: GoTabScreenProps) {
  const [currentStep, setCurrentStep] = useState<'plan' | 'route'>('plan');

  useEffect(() => {
    const onNotifTap = () => {
      if (tripPlan) setCurrentStep('route');
    };
    window.addEventListener('metronav:stage-notification-tap', onNotifTap);
    return () => window.removeEventListener('metronav:stage-notification-tap', onNotifTap);
  }, [tripPlan]);

  const destinationName = selectedDestination
    ? selectedDestination.name
    : customDestCoords?.name || '';

  const destinationCoords = selectedDestination
    ? { lat: selectedDestination.lat, lng: selectedDestination.lng }
    : customDestCoords
    ? { lat: customDestCoords.lat, lng: customDestCoords.lng }
    : undefined;

  const handlePickDestination = (dest: any) => {
    onSelectDestination(dest);
    setCurrentStep('route');
  };

  return (
    <div className="w-full max-w-md mx-auto h-full relative overflow-hidden flex flex-col">
      {/* Top Floating Bar */}
      <div className="absolute top-0 inset-x-0 z-50 px-3 pt-2 pb-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <LiquidGlass
              radius={999}
              bevelDepth={59}
              scale={120}
              aberration={14}
              frost={2.0}
              tint={0.06}
              className="w-full rounded-full p-1 border border-white/70 dark:border-white/15 shadow-[0_16px_36px_-6px_rgba(20,52,40,0.18)] dark:shadow-[0_16px_36px_-6px_rgba(0,0,0,0.6)]"
              contentClassName="flex items-center justify-between gap-1 w-full"
            >
              <button
                type="button"
                onClick={() => setCurrentStep('plan')}
                className={`chip-tactile relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  currentStep === 'plan'
                    ? 'bg-[#143428] dark:bg-emerald-500 text-white dark:text-[#061C12] shadow-xs'
                    : 'text-[#1F2C24] dark:text-[#D1DDD6] hover:bg-white/40 dark:hover:bg-white/10'
                }`}
              >
                <Navigation className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">1. Plan Ride</span>
              </button>

              <ChevronRight className="w-3.5 h-3.5 text-[#143428]/30 dark:text-emerald-400/40 shrink-0 relative z-10" />

              <button
                type="button"
                onClick={() => {
                  if (tripPlan) setCurrentStep('route');
                }}
                disabled={!tripPlan}
                className={`chip-tactile relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-full text-xs font-bold transition-all ${
                  currentStep === 'route'
                    ? 'bg-[#143428] dark:bg-emerald-500 text-white dark:text-[#061C12] shadow-xs cursor-pointer'
                    : tripPlan
                    ? 'text-[#1F2C24] dark:text-[#D1DDD6] hover:bg-white/40 dark:hover:bg-white/10 cursor-pointer'
                    : 'text-[#8C958E] dark:text-white/30 cursor-not-allowed opacity-50'
                }`}
              >
                <Route className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">2. Route</span>
              </button>
            </LiquidGlass>
          </div>
          <ThemeToggle className="shrink-0" />
        </div>
      </div>

      {currentStep === 'plan' ? (
        <div className="flex-1 min-h-0 flex flex-col px-4 pt-16 overflow-hidden">
          <UberRidePlanner
            originName={originName}
            originCoords={originCoords}
            destinationName={destinationName}
            destinationCoords={destinationCoords}
            hasActiveDestination={Boolean(tripPlan)}
            passengerCount={passengerCount}
            onPassengerCountChange={onPassengerCountChange}
            isDetectingLocation={isDetectingLocation}
            detectedLocation={detectedLocation}
            onDetectLocation={onDetectLocation}
            onSelectOrigin={onSelectOrigin}
            onSelectDestination={handlePickDestination}
            onSwapLocations={() => onSwapLocations?.()}
            onViewRoute={tripPlan ? () => setCurrentStep('route') : undefined}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-4 pt-16 pb-28 sm:pb-32 no-scrollbar">
          {tripPlan && (
            <RouteResult
              plan={tripPlan}
              travelMode={travelMode}
              onTravelModeChange={onTravelModeChange}
              passengerCount={passengerCount}
              onPassengerCountChange={onPassengerCountChange}
              firstMileMode={firstMileMode}
              onFirstMileModeChange={onFirstMileModeChange}
              lastMileMode={lastMileMode}
              onLastMileModeChange={onLastMileModeChange}
              deepLinks={deepLinks}
              aiGuide={aiGuide}
              onSwitchToMap={onSwitchToMap}
              onChangeDestination={() => setCurrentStep('plan')}
              onOpenTransitRadar={onOpenTransitRadar}
              stageNav={stageNav}
            />
          )}
        </div>
      )}
    </div>
  );
}
