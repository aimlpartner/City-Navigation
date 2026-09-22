'use client';

import React, { useState } from 'react';
import { MultiModalTripPlan, FamousDestination, RideMode } from '@/lib/delhi-ncr-transit';
import { LocationPicker } from './LocationPicker';
import { DestinationPicker } from './DestinationPicker';
import { RouteResult } from './RouteResult';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Navigation, Route, Check } from 'lucide-react';

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
      <div className="mb-4 bg-white rounded-2xl p-2 sm:p-2.5 border border-[#E2E4DC] shadow-xs flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
        {/* Step 1: Start */}
        <button
          type="button"
          onClick={() => setCurrentStep('origin')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition text-xs font-bold whitespace-nowrap shrink-0 ${
            currentStep === 'origin'
              ? 'bg-[#143428] text-white shadow-xs'
              : 'text-[#53584E] hover:bg-[#F4F5F0]'
          }`}
        >
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span>1. Start</span>
        </button>

        <span className="text-[#D5D8CD] font-bold shrink-0">➔</span>

        {/* Step 2: Destination */}
        <button
          type="button"
          onClick={() => setCurrentStep('destination')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition text-xs font-bold whitespace-nowrap shrink-0 ${
            currentStep === 'destination'
              ? 'bg-[#143428] text-white shadow-xs'
              : 'text-[#53584E] hover:bg-[#F4F5F0]'
          }`}
        >
          <Navigation className="w-3.5 h-3.5 shrink-0" />
          <span>2. Where to</span>
        </button>

        <span className="text-[#D5D8CD] font-bold shrink-0">➔</span>

        {/* Step 3: Route */}
        <button
          type="button"
          onClick={() => {
            if (tripPlan) setCurrentStep('route');
          }}
          disabled={!tripPlan}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition text-xs font-bold whitespace-nowrap shrink-0 ${
            currentStep === 'route'
              ? 'bg-[#143428] text-white shadow-xs'
              : tripPlan
              ? 'text-[#53584E] hover:bg-[#F4F5F0]'
              : 'text-[#CBD0C5] cursor-not-allowed'
          }`}
        >
          <Route className="w-3.5 h-3.5 shrink-0" />
          <span>3. Route</span>
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
