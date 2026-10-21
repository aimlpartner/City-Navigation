'use client';

import React, { useState } from 'react';
import { MultiModalTripPlan, FamousDestination, RideMode } from '@/lib/delhi-ncr-transit';
import { LocationPicker } from './LocationPicker';
import { DestinationPicker } from './DestinationPicker';
import { RouteResult } from './RouteResult';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Navigation, Route, Check, ChevronRight } from 'lucide-react';
import { LiquidGlass } from '@/components/ui/liquid-glass';
import { ThemeToggle } from '@/components/ThemeToggle';

interface GoTabScreenProps {
  originName: string;
  originCoords: { lat: number; lng: number };
  selectedDestination: FamousDestination | null;
  customDestCoords?: { name: string; lat: number; lng: number } | null;
  tripPlan: MultiModalTripPlan | null;
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
  onSwitchToMap: () => void;
  onOpenTransitRadar?: () => void;
}

export function GoTabScreen({
  originName,
  originCoords,
  detectedLocation,
  locationError,
  selectedDestination,
  customDestCoords,
  tripPlan,
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
  onSwitchToMap,
  onOpenTransitRadar,
}: GoTabScreenProps) {
  // Always start from the first step ('origin') - do not jump to the last step
  const [currentStep, setCurrentStep] = useState<'origin' | 'destination' | 'route'>('origin');

  const handlePickOrigin = (name: string, coords: { lat: number; lng: number }) => {
    onSelectOrigin(name, coords);
    // After picking origin (step 1), always advance to step 2 (destination), never jump directly to route
    setCurrentStep('destination');
  };

  const handlePickDestination = (dest: FamousDestination) => {
    onSelectDestination(dest);
    // After picking destination (step 2), advance to step 3 (route)
    setCurrentStep('route');
  };

  return (
    <div className="w-full max-w-md mx-auto h-full relative overflow-hidden flex flex-col">
      {/* Floating Fixed Liquid Glass Step Wizard Indicator Header */}
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
              {/* Step 1: Start */}
              <button
                type="button"
                onClick={() => setCurrentStep('origin')}
                className={`chip-tactile relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  currentStep === 'origin'
                    ? 'bg-[#143428] dark:bg-emerald-500 text-white dark:text-[#061C12] shadow-xs'
                    : 'text-[#1F2C24] dark:text-[#D1DDD6] hover:bg-white/40 dark:hover:bg-white/10'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">1. Start</span>
              </button>

              <ChevronRight className="w-3.5 h-3.5 text-[#143428]/30 dark:text-emerald-400/40 shrink-0 relative z-10" />

              {/* Step 2: Destination */}
              <button
                type="button"
                onClick={() => setCurrentStep('destination')}
                className={`chip-tactile relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  currentStep === 'destination'
                    ? 'bg-[#143428] dark:bg-emerald-500 text-white dark:text-[#061C12] shadow-xs'
                    : 'text-[#1F2C24] dark:text-[#D1DDD6] hover:bg-white/40 dark:hover:bg-white/10'
                }`}
              >
                <Navigation className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">2. Where to</span>
              </button>

              <ChevronRight className="w-3.5 h-3.5 text-[#143428]/30 dark:text-emerald-400/40 shrink-0 relative z-10" />

              {/* Step 3: Route */}
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
                <span className="truncate">3. Route</span>
              </button>
            </LiquidGlass>
          </div>
          <ThemeToggle className="shrink-0" />
        </div>
      </div>

      {/* Scrollable Wizard Content Screens - scrolls smoothly UNDER the liquid glass bar */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-4 pt-16 pb-28 sm:pb-32 no-scrollbar">
      <AnimatePresence mode="wait">
        {currentStep === 'origin' && (
          <motion.div
            key="origin-step"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.18 }}
          >
            <LocationPicker
              currentOriginName={originName}
              isDetectingLocation={isDetectingLocation}
              locationError={locationError}
              detectedLocation={detectedLocation}
              onDetectLocation={onDetectLocation}
              onSelectOrigin={handlePickOrigin}
              onProceedToDestination={() => setCurrentStep('destination')}
            />
          </motion.div>
        )}

        {currentStep === 'destination' && (
          <motion.div
            key="destination-step"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.18 }}
          >
            <DestinationPicker
              currentDestination={selectedDestination}
              customDestination={customDestCoords}
              originName={originName}
              onSelectDestination={handlePickDestination}
              onBackToOrigin={() => setCurrentStep('origin')}
            />
          </motion.div>
        )}

        {currentStep === 'route' && tripPlan && (
          <motion.div
            key="route-step"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >
            <RouteResult
              plan={tripPlan}
              passengerCount={passengerCount}
              onPassengerCountChange={onPassengerCountChange}
              firstMileMode={firstMileMode}
              onFirstMileModeChange={onFirstMileModeChange}
              lastMileMode={lastMileMode}
              onLastMileModeChange={onLastMileModeChange}
              deepLinks={deepLinks}
              aiGuide={aiGuide}
              onSwitchToMap={onSwitchToMap}
              onChangeDestination={() => setCurrentStep('destination')}
              onOpenTransitRadar={onOpenTransitRadar}
            />
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
