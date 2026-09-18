'use client';

import React, { useState } from 'react';
import { MultiModalTripPlan, FamousDestination } from '@/lib/delhi-ncr-transit';
import { BottomTabBar, MobileTab } from './BottomTabBar';
import { GoTabScreen } from './GoTab/GoTabScreen';
import { MapTabScreen } from './MapTab/MapTabScreen';
import { GuideTabScreen } from './GuideTab/GuideTabScreen';
import { TrainFront, Radar, Headphones, Sparkles, Download } from 'lucide-react';
import { triggerPwaInstall } from './PwaInstallPrompt';

interface MobileAppShellProps {
  originName: string;
  originCoords: { lat: number; lng: number };
  selectedDestination: FamousDestination | null;
  tripPlan: MultiModalTripPlan | null;
  aiGuide?: {
    loading: boolean;
    text: string | null;
    error: string | null;
    links: { title: string; uri: string; source?: string }[];
  };
  isDetectingLocation: boolean;
  onDetectLocation: () => void;
  onSelectOrigin: (name: string, coords: { lat: number; lng: number }) => void;
  onSelectDestination: (dest: FamousDestination) => void;
  onOpenTransitRadar?: () => void;
  onRequestAiRefresh?: () => void;
}

export function MobileAppShell({
  originName,
  originCoords,
  selectedDestination,
  tripPlan,
  aiGuide,
  isDetectingLocation,
  onDetectLocation,
  onSelectOrigin,
  onSelectDestination,
  onOpenTransitRadar,
  onRequestAiRefresh,
}: MobileAppShellProps) {
  const [activeTab, setActiveTab] = useState<MobileTab>('go');

  return (
    <div className="lg:hidden min-h-screen bg-[#F4F5F0] flex flex-col text-[#17201B]">
      {/* Mobile App Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E2E4DC] px-4 py-3 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#143428] text-white flex items-center justify-center shadow-xs">
              <TrainFront className="w-5 h-5 text-[#5ee9b5]" strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-base tracking-tight text-[#17201B] font-sans">
                  MetroNav
                </h1>
                <span className="px-1.5 py-0.5 rounded bg-[#143428]/10 text-[#143428] text-[10px] font-extrabold uppercase">
                  NCR
                </span>
              </div>
              <p className="text-[11px] text-[#6B7267] font-medium -mt-0.5">
                Delhi • Gurgaon • Airport
              </p>
            </div>
          </div>

          {/* Actions: Install App & Radar */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={triggerPwaInstall}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#143428] text-white text-xs font-bold shadow-xs active:scale-95 transition hover:bg-[#1A3E31]"
              title="Download & Install MetroNav App"
            >
              <Download className="w-3.5 h-3.5 text-[#5ee9b5]" />
              <span>Install</span>
            </button>

            {onOpenTransitRadar && (
              <button
                type="button"
                onClick={onOpenTransitRadar}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white hover:bg-[#F8F9F5] border border-[#D5D8CD] text-xs font-bold text-[#143428] shadow-xs active:scale-95 transition"
              >
                <Radar className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>Radar</span>
              </button>
            )}
          </div>
        </div>
      </header>


      {/* Main Tab Screen Area */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 pt-4 pb-24">
        {activeTab === 'go' && (
          <GoTabScreen
            originName={originName}
            originCoords={originCoords}
            selectedDestination={selectedDestination}
            tripPlan={tripPlan}
            aiGuide={aiGuide}
            isDetectingLocation={isDetectingLocation}
            onDetectLocation={onDetectLocation}
            onSelectOrigin={onSelectOrigin}
            onSelectDestination={onSelectDestination}
            onSwitchToMap={() => setActiveTab('map')}
            onOpenTransitRadar={onOpenTransitRadar}
          />
        )}

        {activeTab === 'map' && (
          <MapTabScreen
            tripPlan={tripPlan}
            originCoords={originCoords}
            onSwitchToGoTab={() => setActiveTab('go')}
          />
        )}

        {activeTab === 'guide' && (
          <GuideTabScreen
            tripPlan={tripPlan}
            aiGuide={aiGuide}
            onOpenTransitRadar={onOpenTransitRadar}
            onRequestAiRefresh={onRequestAiRefresh}
          />
        )}
      </main>

      {/* Bottom Tab Navigation */}
      <BottomTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasActiveRoute={!!tripPlan}
      />
    </div>
  );
}
