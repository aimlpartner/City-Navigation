'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MultiModalTripPlan, FamousDestination, RideMode } from '@/lib/delhi-ncr-transit';
import { BottomTabBar, MobileTab } from './BottomTabBar';
import { GoTabScreen } from './GoTab/GoTabScreen';
import { MapTabScreen } from './MapTab/MapTabScreen';
import { GuideTabScreen } from './GuideTab/GuideTabScreen';
import { LivingTransitCanvas } from './LivingTransitCanvas';
import { TrainFront, Radar, Download } from 'lucide-react';
import { triggerPwaInstall } from './PwaInstallPrompt';
import { LiquidGlass } from './ui/liquid-glass';
import { useIsAppInstalled } from '@/hooks/useIsAppInstalled';

const TABS: MobileTab[] = ['go', 'map', 'guide'];

interface MobileAppShellProps {
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
  onOpenTransitRadar?: () => void;
  onRequestAiRefresh?: () => void;
}

export function MobileAppShell({
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
  onOpenTransitRadar,
  onRequestAiRefresh,
}: MobileAppShellProps) {
  const isAppInstalled = useIsAppInstalled();
  const [activeTab, setActiveTab] = useState<MobileTab>('go');
  const activeIndex = TABS.indexOf(activeTab);

  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Gesture state tracked in ref to avoid React re-render lag during 120fps touchmove
  const gestureRef = useRef<{
    startX: number;
    startY: number;
    startTime: number;
    lastX: number;
    isLocked: boolean;
    isHorizontal: boolean;
    isDragging: boolean;
    isMouseDown: boolean;
    currentIndex: number;
  }>({
    startX: 0,
    startY: 0,
    startTime: 0,
    lastX: 0,
    isLocked: false,
    isHorizontal: false,
    isDragging: false,
    isMouseDown: false,
    currentIndex: 0,
  });

  // Keep currentIndex in ref updated
  useEffect(() => {
    gestureRef.current.currentIndex = activeIndex;
  }, [activeIndex]);

  // Smoothly slide to tab when activeTab changes
  const handleTabChange = useCallback((newTab: MobileTab) => {
    setActiveTab(newTab);
    const targetIndex = TABS.indexOf(newTab);
    gestureRef.current.currentIndex = targetIndex;
    if (trackRef.current) {
      trackRef.current.style.transition = 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)';
      trackRef.current.style.transform = `translate3d(${-targetIndex * 100}%, 0, 0)`;
    }
  }, []);

  // Sync track position with activeIndex whenever activeTab changes
  useEffect(() => {
    if (trackRef.current && !gestureRef.current.isDragging) {
      trackRef.current.style.transition = 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)';
      trackRef.current.style.transform = `translate3d(${-activeIndex * 100}%, 0, 0)`;
    }
  }, [activeIndex]);

  // --- NATIVE INSTAGRAM-STYLE TOUCH GESTURE CONTROLLER ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Do not hijack typing or horizontal scroll chips
      if (target.closest('input, textarea, select, [data-no-swipe], .no-swipe')) {
        return;
      }

      // On map tab: allow swiping on UI cards or screen edge (36px), but let map surface pan
      const currentIdx = gestureRef.current.currentIndex;
      if (TABS[currentIdx] === 'map') {
        const isInsideMap = target.closest('.leaflet-container, .gm-style');
        const isEdgeSwipe = touch.clientX < 36 || touch.clientX > window.innerWidth - 36;
        const isCardOrControl = target.closest('.pointer-events-auto, button, a');
        if (isInsideMap && !isEdgeSwipe && !isCardOrControl) {
          return;
        }
      }

      gestureRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        lastX: touch.clientX,
        isLocked: false,
        isHorizontal: false,
        isDragging: true,
        isMouseDown: false,
        currentIndex: gestureRef.current.currentIndex,
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      const g = gestureRef.current;
      if (!g.isDragging || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const dx = touch.clientX - g.startX;
      const dy = touch.clientY - g.startY;

      // Direction lock: during first 7px, check if user is scrolling vertically or swiping tabs
      if (!g.isLocked) {
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        if (absX < 7 && absY < 7) return; // In dead zone

        g.isLocked = true;
        if (absY > absX) {
          // Vertical scroll: do NOT hijack! Allow browser native 120fps vertical scroll
          g.isHorizontal = false;
          g.isDragging = false;
          return;
        } else {
          // Horizontal swipe: lock to tab swiping
          g.isHorizontal = true;
        }
      }

      if (!g.isHorizontal) return;

      // Prevent vertical bounce / pull jitter while swiping horizontally
      if (e.cancelable) {
        e.preventDefault();
      }

      g.lastX = touch.clientX;
      const containerWidth = containerRef.current?.offsetWidth || window.innerWidth;
      const curIdx = g.currentIndex;

      // Elastic rubber-band resistance at boundaries (index 0 swipe right, index 2 swipe left)
      let effectiveDx = dx;
      if ((curIdx === 0 && dx > 0) || (curIdx === 2 && dx < 0)) {
        effectiveDx = dx * 0.28;
      }

      const offsetPercent = (effectiveDx / containerWidth) * 100;
      const targetPercent = -curIdx * 100 + offsetPercent;

      if (trackRef.current) {
        trackRef.current.style.transition = 'none';
        trackRef.current.style.transform = `translate3d(${targetPercent}%, 0, 0)`;
      }
    };

    const handleTouchEnd = () => {
      const g = gestureRef.current;
      if (!g.isDragging || !g.isHorizontal) {
        g.isDragging = false;
        return;
      }

      g.isDragging = false;
      const totalDx = g.lastX - g.startX;
      const elapsed = Math.max(1, Date.now() - g.startTime);
      const velocity = Math.abs(totalDx) / elapsed; // px per ms
      const containerWidth = containerRef.current?.offsetWidth || window.innerWidth;
      const curIdx = g.currentIndex;

      // Flick detection (> 0.32 px/ms) or distance drag (> 22% of container width)
      const isFlick = velocity > 0.32;
      const isPastDistance = Math.abs(totalDx) > containerWidth * 0.22;

      let nextIndex = curIdx;
      if (isFlick || isPastDistance) {
        if (totalDx < 0 && curIdx < 2) {
          nextIndex = curIdx + 1;
        } else if (totalDx > 0 && curIdx > 0) {
          nextIndex = curIdx - 1;
        }
      }

      if (trackRef.current) {
        trackRef.current.style.transition = 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)';
        trackRef.current.style.transform = `translate3d(${-nextIndex * 100}%, 0, 0)`;
      }

      if (nextIndex !== curIdx) {
        setActiveTab(TABS[nextIndex]);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

  // --- DESKTOP MOUSE DRAG CONTROLLER FOR EASY DEV TESTING ---
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (target.closest('input, textarea, select, button, a, [data-no-swipe], .no-swipe')) return;
    if (TABS[activeIndex] === 'map') {
      const isInsideMap = target.closest('.leaflet-container, .gm-style');
      if (isInsideMap) return;
    }

    gestureRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTime: Date.now(),
      lastX: e.clientX,
      isLocked: false,
      isHorizontal: false,
      isDragging: true,
      isMouseDown: true,
      currentIndex: activeIndex,
    };

    const handleMouseMove = (me: MouseEvent) => {
      const g = gestureRef.current;
      if (!g.isDragging || !g.isMouseDown) return;
      const dx = me.clientX - g.startX;
      const dy = me.clientY - g.startY;

      if (!g.isLocked) {
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        if (absX < 8 && absY < 8) return;
        g.isLocked = true;
        if (absY > absX) {
          g.isHorizontal = false;
          g.isDragging = false;
          cleanup();
          return;
        } else {
          g.isHorizontal = true;
        }
      }

      if (!g.isHorizontal) return;
      g.lastX = me.clientX;
      const containerWidth = containerRef.current?.offsetWidth || window.innerWidth;
      const curIdx = g.currentIndex;

      let effectiveDx = dx;
      if ((curIdx === 0 && dx > 0) || (curIdx === 2 && dx < 0)) {
        effectiveDx = dx * 0.28;
      }

      const offsetPercent = (effectiveDx / containerWidth) * 100;
      const targetPercent = -curIdx * 100 + offsetPercent;
      if (trackRef.current) {
        trackRef.current.style.transition = 'none';
        trackRef.current.style.transform = `translate3d(${targetPercent}%, 0, 0)`;
      }
    };

    const handleMouseUp = (me: MouseEvent) => {
      cleanup();
      const g = gestureRef.current;
      if (!g.isDragging || !g.isHorizontal) {
        g.isDragging = false;
        g.isMouseDown = false;
        return;
      }
      g.isDragging = false;
      g.isMouseDown = false;
      const totalDx = me.clientX - g.startX;
      const elapsed = Math.max(1, Date.now() - g.startTime);
      const velocity = Math.abs(totalDx) / elapsed;
      const containerWidth = containerRef.current?.offsetWidth || window.innerWidth;
      const curIdx = g.currentIndex;

      const isFlick = velocity > 0.32;
      const isPastDistance = Math.abs(totalDx) > containerWidth * 0.22;

      let nextIndex = curIdx;
      if (isFlick || isPastDistance) {
        if (totalDx < 0 && curIdx < 2) {
          nextIndex = curIdx + 1;
        } else if (totalDx > 0 && curIdx > 0) {
          nextIndex = curIdx - 1;
        }
      }

      if (trackRef.current) {
        trackRef.current.style.transition = 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)';
        trackRef.current.style.transform = `translate3d(${-nextIndex * 100}%, 0, 0)`;
      }

      if (nextIndex !== curIdx) {
        setActiveTab(TABS[nextIndex]);
      }
    };

    const cleanup = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="lg:hidden fixed inset-0 w-full h-full bg-[#F4F5F0] flex flex-col text-[#17201B] overflow-hidden select-none z-30">
      {/* Moving Water from Metal Shader (Drawn 30 FPS, Paused in Low Power / Reduce Motion) */}
      <LivingTransitCanvas />

      {/* Main Instagram Swiper Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        className="flex-1 min-h-0 relative w-full overflow-hidden z-10 pt-[max(env(safe-area-inset-top,0px),8px)]"
        style={{ touchAction: 'pan-y' }}
      >
        <div
          ref={trackRef}
          className="flex h-full w-full will-change-transform"
          style={{
            transform: `translate3d(${-activeIndex * 100}%, 0, 0)`,
            transition: 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Slide 0: Go Tab Screen */}
          <div className="w-full min-w-full h-full overflow-hidden flex flex-col">
            <GoTabScreen
              originName={originName}
              originCoords={originCoords}
              detectedLocation={detectedLocation}
              locationError={locationError}
              selectedDestination={selectedDestination}
              customDestCoords={customDestCoords}
              tripPlan={tripPlan}
              passengerCount={passengerCount}
              onPassengerCountChange={onPassengerCountChange}
              firstMileMode={firstMileMode}
              onFirstMileModeChange={onFirstMileModeChange}
              lastMileMode={lastMileMode}
              onLastMileModeChange={onLastMileModeChange}
              deepLinks={deepLinks}
              aiGuide={aiGuide}
              isDetectingLocation={isDetectingLocation}
              onDetectLocation={onDetectLocation}
              onSelectOrigin={onSelectOrigin}
              onSelectDestination={onSelectDestination}
              onSwitchToMap={() => handleTabChange('map')}
              onOpenTransitRadar={onOpenTransitRadar}
            />
          </div>

          {/* Slide 1: Map Tab Screen */}
          <div className="w-full min-w-full h-full overflow-hidden relative px-3 pt-2 pb-2">
            <div className="max-w-md mx-auto w-full h-full">
              <MapTabScreen
                tripPlan={tripPlan}
                originCoords={originCoords}
                onSwitchToGoTab={() => handleTabChange('go')}
              />
            </div>
          </div>

          {/* Slide 2: Guide Tab Screen */}
          <div className="w-full min-w-full h-full overflow-y-auto overscroll-y-contain px-4 pt-3 pb-28 sm:pb-32 no-scrollbar">
            <div className="max-w-md mx-auto w-full">
              <GuideTabScreen
                tripPlan={tripPlan}
                aiGuide={aiGuide}
                onOpenTransitRadar={onOpenTransitRadar}
                onRequestAiRefresh={onRequestAiRefresh}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Capsule Bottom Navigation Bar */}
      <BottomTabBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        hasActiveRoute={!!tripPlan}
      />
    </div>
  );
}
