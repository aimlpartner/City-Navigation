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
    <div className="relative w-full h-full min-h-[380px] rounded-3xl overflow-hidden border border-[#E2E4DC] shadow-sm bg-[#e5e7eb]">
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
          <div className="pointer-events-auto bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-[#E2E4DC] shadow-md flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-[#6B7267] font-medium">
                <span className="w-2 h-2 rounded-full bg-[#143428]" />
                <span className="truncate">{tripPlan.origin.name}</span>
                <ArrowRight className="w-3 h-3 text-[#8E9487] shrink-0" />
              </div>
              <h3 className="font-extrabold text-sm text-[#17201B] truncate mt-0.5">
                {tripPlan.destination.name}
              </h3>
            </div>

            <div className="px-2.5 py-1 rounded-xl bg-[#B9552C] text-white text-xs font-black shadow-xs flex items-center gap-1 shrink-0">
              <DoorOpen className="w-3.5 h-3.5" />
              <span>Gate {tripPlan.metroExit.gateNumber}</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Action Card */}
      {tripPlan && (
        <div className="absolute bottom-3 left-3 right-3 z-10 pointer-events-none">
          <div className="pointer-events-auto bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-[#E2E4DC] shadow-lg flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-xs font-bold text-[#143428]">
                <Timer className="w-3.5 h-3.5 text-[#143428]" />
                <span>~{tripPlan.liveTraffic?.totalDurationMin || totalDuration} min</span>
              </div>
              <span className="text-[#D5D8CD] font-bold">•</span>
              <div className="flex items-center gap-1 text-xs font-bold text-[#B9552C]">
                <IndianRupee className="w-3.5 h-3.5 text-[#B9552C]" />
                <span>₹{tripPlan.fareBreakdown?.totalEstimatedFareInr || tripPlan.metroLeg.estimatedFareInr}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onSwitchToGoTab}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#143428] text-white font-bold text-xs shadow-xs active:scale-95 transition"
            >
              <ListOrdered className="w-4 h-4 text-[#5ee9b5]" />
              <span>Turn-by-Turn</span>
            </button>
          </div>
        </div>
      )}

      {/* If no active trip, show helpful overlay */}
      {!tripPlan && (
        <div className="absolute top-4 left-4 right-4 z-10 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-[#E2E4DC] shadow-md text-center">
          <p className="text-xs font-bold text-[#17201B]">No destination selected yet</p>
          <button
            type="button"
            onClick={onSwitchToGoTab}
            className="mt-2 px-4 py-1.5 rounded-xl bg-[#143428] text-white text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Navigation2 className="w-3.5 h-3.5" />
            <span>Pick Destination in Go Tab</span>
          </button>
        </div>
      )}
    </div>
  );
}
