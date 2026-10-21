'use client';

import React from 'react';
import { MultiModalTripPlan } from '@/lib/delhi-ncr-transit';
import { MapComponent } from '@/components/MapComponent';
import {
  ListOrdered,
  DoorOpen,
  ArrowRight,
  Timer,
  IndianRupee,
  Navigation2
} from 'lucide-react';

interface MapTabScreenProps {
  tripPlan: MultiModalTripPlan | null;
  originCoords: { lat: number; lng: number };
  onSwitchToGoTab: () => void;
}

export function MapTabScreen({
  tripPlan,
  originCoords,
  onSwitchToGoTab,
}: MapTabScreenProps) {
  const totalDuration = tripPlan
    ? tripPlan.firstMile.durationMin +
      tripPlan.metroLeg.totalDurationMin +
      (tripPlan.lastMile.options[0]?.durationMin || 5)
    : 0;

  return (
    <div className="relative w-full h-full min-h-[380px] rounded-[28px] overflow-hidden border border-[#E2E4DC] dark:border-white/10 shadow-sm bg-[#e5e7eb] dark:bg-[#111A15]">
      {/* Interactive Map */}
      <div className="absolute inset-0 z-0">
        <MapComponent
          plan={tripPlan}
          userCoords={originCoords}
        />
      </div>

      {/* Floating Top Route Summary Pill */}
      {tripPlan && (
        <div className="absolute top-3 left-3 right-3 z-10 pointer-events-none">
          <div className="pointer-events-auto bg-white/90 dark:bg-[#0c1611]/90 backdrop-blur-xl p-3 sm:p-3.5 rounded-2xl border border-white/80 dark:border-white/10 shadow-lg flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-[#6B7267] dark:text-[#9BAAA0] font-medium">
                <span className="w-2 h-2 rounded-full bg-[#143428] dark:bg-emerald-400" />
                <span className="truncate">{tripPlan.origin.name}</span>
                <ArrowRight className="w-3 h-3 text-[#8E9487] dark:text-[#67776E] shrink-0" />
              </div>
              <h3 className="font-extrabold text-sm text-[#17201B] dark:text-[#F3F5EE] truncate mt-0.5">
                {tripPlan.destination.name}
              </h3>
            </div>

            <div className="px-2.5 py-1 rounded-full bg-[#B9552C] text-white text-xs font-black shadow-xs flex items-center gap-1 shrink-0">
              <DoorOpen className="w-3.5 h-3.5" />
              <span>Gate {tripPlan.metroExit.gateNumber}</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Action Card (Comfortably lifted above floating capsule navbar) */}
      {tripPlan && (
        <div className="absolute bottom-[84px] sm:bottom-24 left-3 right-3 z-10 pointer-events-none">
          <div className="pointer-events-auto bg-white/90 dark:bg-[#0c1611]/90 backdrop-blur-xl p-3 rounded-2xl border border-white/80 dark:border-white/10 shadow-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-xs font-bold text-[#143428] dark:text-emerald-400">
                <Timer className="w-3.5 h-3.5 text-[#143428] dark:text-emerald-400" />
                <span>~{tripPlan.liveTraffic?.totalDurationMin || totalDuration} min</span>
              </div>
              <span className="text-[#D5D8CD] dark:text-white/20 font-bold">•</span>
              <div className="flex items-center gap-1 text-xs font-bold text-[#B9552C] dark:text-[#ff8a5c]">
                <IndianRupee className="w-3.5 h-3.5 text-[#B9552C] dark:text-[#ff8a5c]" />
                <span>₹{tripPlan.fareBreakdown?.totalEstimatedFareInr || (tripPlan.firstMile.estimatedCostInr + tripPlan.metroLeg.estimatedFareInr + (tripPlan.lastMile.options[0]?.estimatedCostInr || 90))}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onSwitchToGoTab}
              className="btn-tactile flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#143428] dark:bg-emerald-500 text-white dark:text-[#061C12] font-bold text-xs shadow-xs cursor-pointer"
            >
              <ListOrdered className="w-4 h-4 text-[#5ee9b5] dark:text-[#061C12]" />
              <span>Turn-by-Turn</span>
            </button>
          </div>
        </div>
      )}

      {/* If no active trip, show helpful overlay */}
      {!tripPlan && (
        <div className="absolute top-4 left-4 right-4 z-10 bg-white/90 dark:bg-[#0c1611]/90 backdrop-blur-xl p-4 rounded-2xl border border-white/70 dark:border-white/10 shadow-lg text-center">
          <p className="text-xs font-bold text-[#17201B] dark:text-[#F3F5EE]">No destination selected yet</p>
          <button
            type="button"
            onClick={onSwitchToGoTab}
            className="btn-tactile mt-2 px-4 py-1.5 rounded-full bg-[#143428] dark:bg-emerald-500 text-white dark:text-[#061C12] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Navigation2 className="w-3.5 h-3.5 text-[#5ee9b5] dark:text-[#061C12]" />
            <span>Pick Destination in Go Tab</span>
          </button>
        </div>
      )}
    </div>
  );
}
