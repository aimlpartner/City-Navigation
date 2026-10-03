'use client';

import React, { useState } from 'react';
import { MultiModalTripPlan, FamousDestination, RideMode } from '@/lib/delhi-ncr-transit';
import { LocationPicker } from './LocationPicker';
import { DestinationPicker } from './DestinationPicker';
import { RouteResult } from './RouteResult';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Navigation, Route, Check, ChevronRight } from 'lucide-react';

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
  // If we already have a trip plan, show route; otherwise start from destination
  const [currentStep, setCurrentStep] = useState<'origin' | 'destination' | 'route'>(
    tripPlan ? 'route' : 'destination'
  );

  const handlePickOrigin = (name: string, coords: { lat: number; lng: number }) => {
    onSelectOrigin(name, coords);
    // After picking origin, advance to destination if none selected, or route if selected
    if (!selectedDestination) {
      setCurrentStep('destination');
    } else {
      setCurrentStep('route');
    }
  };

  const handlePickDestination = (dest: FamousDestination) => {
    onSelectDestination(dest);
    // Automatically advance to route
    setCurrentStep('route');
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Visual Step Wizard Indicator Header */}
      <div className="mb-4 bg-white/90 backdrop-blur-md rounded-2xl p-1.5 border border-[#E2E4DC] shadow-xs flex items-center justify-between gap-1">
        {/* Step 1: Start */}
        <button
          type="button"
          onClick={() => setCurrentStep('origin')}
          className={`chip-tactile flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-bold transition cursor-pointer ${
            currentStep === 'origin'
              ? 'bg-[#143428] text-white shadow-xs'
              : 'text-[#53584E] hover:bg-[#F4F5F0]'
          }`}
        >
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">1. Start</span>
        </button>

        <ChevronRight className="w-3.5 h-3.5 text-[#CBD0C5] shrink-0" />

        {/* Step 2: Destination */}
        <button
          type="button"
          onClick={() => setCurrentStep('destination')}
          className={`chip-tactile flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-bold transition cursor-pointer ${
            currentStep === 'destination'
              ? 'bg-[#143428] text-white shadow-xs'
              : 'text-[#53584E] hover:bg-[#F4F5F0]'
          }`}
        >
          <Navigation className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">2. Where to</span>
        </button>

        <ChevronRight className="w-3.5 h-3.5 text-[#CBD0C5] shrink-0" />

        {/* Step 3: Route */}
        <button
          type="button"
          onClick={() => {
            if (tripPlan) setCurrentStep('route');
          }}
          disabled={!tripPlan}
          className={`chip-tactile flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-bold transition ${
            currentStep === 'route'
              ? 'bg-[#143428] text-white shadow-xs cursor-pointer'
              : tripPlan
              ? 'text-[#53584E] hover:bg-[#F4F5F0] cursor-pointer'
              : 'text-[#CBD0C5] cursor-not-allowed opacity-50'
          }`}
        >
          <Route className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">3. Route</span>
        </button>
      </div>

      {/* Wizard Content Screens */}
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
  );
}
