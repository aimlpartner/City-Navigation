'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrainArrival,
  LiveStationSchedule,
  LiveBusArrival,
  getLiveDeparturesForStation,
  getConnectingBusesForStation
} from '@/lib/realtime-transit';
import {
  TrainFront,
  BusFront,
  Clock,
  AlertTriangle,
  Users,
  RotateCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RadioReceiver,
  CheckCircle2
} from 'lucide-react';
import { LiquidGlass } from '@/components/ui/liquid-glass';

interface LiveStationDeparturesProps {
  stationId: string;
  stationName: string;
  lineColor?: string;
  onRefresh?: () => void;
}

export function LiveStationDepartures({
  stationId,
  stationName,
  lineColor = '#eab308',
  onRefresh
}: LiveStationDeparturesProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activePlatform, setActivePlatform] = useState<1 | 2>(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(30);

  // Compute live departures and buses based on stationId and auto-refresh trigger
  const schedule = useMemo(() => {
    void refreshTrigger;
    return getLiveDeparturesForStation(stationId);
  }, [stationId, refreshTrigger]);

  const connectingBuses = useMemo(() => {
    void refreshTrigger;
    return getConnectingBusesForStation(stationId);
  }, [stationId, refreshTrigger]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
    setSecondsUntilRefresh(30);
    if (onRefresh) onRefresh();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  // Auto-refresh countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsUntilRefresh(prev => {
        if (prev <= 1) {
          setRefreshTrigger(r => r + 1);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!schedule) return null;

  const currentArrivals =
    activePlatform === 1 ? schedule.arrivalsPlatform1 : schedule.arrivalsPlatform2;

  return (
    <LiquidGlass
      radius={28}
      bevelDepth={59}
      scale={120}
      aberration={14}
      frost={2.8}
      tint={0.06}
      className="rounded-[28px] text-[#17201B] shadow-xl border border-white/80 overflow-hidden"
    >
      {/* PIDS Header (Passenger Information Display System Style) */}
      <div className="p-3.5 sm:p-5 bg-white/85 dark:bg-[#111A15] border-b border-[#E2E4DC]/80 dark:border-white/10 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#143428] text-white flex items-center justify-center shrink-0 shadow-xs">
            <TrainFront className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7267] dark:text-[#9CAEA3] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <span className="truncate">Live Platform Board</span>
            </div>
            <h4 className="text-sm sm:text-base font-extrabold text-[#17201B] dark:text-[#F3F5EE] truncate">
              {stationName}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span className="px-2.5 py-1 rounded-full bg-white/60 dark:bg-[#16231D] border border-[#E2E4DC] dark:border-white/15 text-[11px] sm:text-xs text-[#143428] dark:text-[#5ee9b5] font-mono whitespace-nowrap font-bold">
            {schedule.headwayText}
          </span>
          <span className="text-[11px] text-[#8E9487] dark:text-[#9CAEA3] font-mono hidden sm:inline">
            sync in {secondsUntilRefresh}s
          </span>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            aria-label="Refresh live schedule"
            className="btn-tactile p-1.5 sm:p-2 rounded-full bg-white/60 dark:bg-[#16231D] hover:bg-white dark:hover:bg-white/15 hover:rotate-45 active:rotate-180 text-[#17201B] dark:text-[#F3F5EE] transition-all duration-300 disabled:opacity-50 border border-[#E2E4DC] dark:border-white/15 shrink-0 cursor-pointer shadow-2xs"
            title="Refresh schedule"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Platform Switcher */}
      <div className="grid grid-cols-2 bg-white/75 dark:bg-[#0D1511] border-b border-[#E2E4DC]/80 dark:border-white/10 p-1.5 sm:p-2 gap-2">
        <button
          onClick={() => setActivePlatform(1)}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-2 chip-tactile ${
            activePlatform === 1
              ? 'bg-[#143428] dark:bg-emerald-500 text-white dark:text-[#061C12] shadow-xs'
              : 'text-[#53584E] dark:text-[#A7B2A8] hover:text-[#17201B] dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/10'
          }`}
        >
          <span
            className={`w-4 h-4 rounded-full text-[10px] font-bold shrink-0 flex items-center justify-center transition-transform duration-150 ${
              activePlatform === 1 ? 'bg-white dark:bg-[#061C12] text-[#143428] dark:text-emerald-300 scale-105' : 'bg-[#E2E4DC] dark:bg-white/15 text-[#17201B] dark:text-white'
            }`}
          >
            1
          </span>
          <div className="text-left min-w-0 truncate">
            <span className="font-bold">Platform 1</span>
            <span className="hidden md:inline text-[11px] opacity-80 font-normal ml-1">
              ({schedule.arrivalsPlatform1[0]?.direction.split('/')[0].trim()})
            </span>
          </div>
        </button>

        <button
          onClick={() => setActivePlatform(2)}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-2 chip-tactile ${
            activePlatform === 2
              ? 'bg-[#143428] dark:bg-emerald-500 text-white dark:text-[#061C12] shadow-xs'
              : 'text-[#53584E] dark:text-[#A7B2A8] hover:text-[#17201B] dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/10'
          }`}
        >
          <span
            className={`w-4 h-4 rounded-full text-[10px] font-bold shrink-0 flex items-center justify-center transition-transform duration-150 ${
              activePlatform === 2 ? 'bg-white dark:bg-[#061C12] text-[#143428] dark:text-emerald-300 scale-105' : 'bg-[#E2E4DC] dark:bg-white/15 text-[#17201B] dark:text-white'
            }`}
          >
            2
          </span>
          <div className="text-left min-w-0 truncate">
            <span className="font-bold">Platform 2</span>
            <span className="hidden md:inline text-[11px] opacity-80 font-normal ml-1">
              ({schedule.arrivalsPlatform2[0]?.direction.split('/')[0].trim()})
            </span>
          </div>
        </button>
      </div>

      {/* Live Train Rows */}
      <div className="p-5 sm:p-6 space-y-3 bg-white dark:bg-[#111A15]">
        <div className="text-[10px] font-bold text-[#6B7267] dark:text-[#9CAEA3] uppercase tracking-wider flex items-center justify-between pb-1">
          <span>Destination & Direction</span>
          <span>Live ETA</span>
        </div>

        <div className="space-y-2.5">
          {currentArrivals.map((train, idx) => (
            <div
              key={train.id}
              className={`card-interactive p-4 rounded-xl transition-all cursor-pointer ${
                idx === 0
                  ? 'bg-[#F8F9F5] dark:bg-[#16241D] hover:bg-[#F2F5EC] dark:hover:bg-[#1A2B22] border border-[#143428]/20 dark:border-emerald-500/30 shadow-xs'
                  : 'bg-[#FAFAF7] dark:bg-[#141F1A] hover:bg-[#F4F5EE] dark:hover:bg-[#192720] text-[#53584E] dark:text-[#A7B2A8] border border-transparent dark:border-white/10 hover:border-[#E2E4DC] dark:hover:border-white/20'
              }`}
            >
              {/* Top row: Train destination + Live ETA Countdown */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      idx === 0 ? 'bg-[#143428] text-white' : 'bg-[#EAECE4] dark:bg-white/10 text-[#53584E] dark:text-[#D1DDD6]'
                    }`}
                  >
                    {idx === 0 ? (
                      <TrainFront className="w-4 h-4 text-emerald-300" strokeWidth={2} />
                    ) : (
                      <span>#{idx + 1}</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-[#17201B] dark:text-[#F3F5EE] truncate">
                      {train.trainDestination}
                    </div>
                    <div className="text-[11px] text-[#6B7267] dark:text-[#9CAEA3] mt-0.5">
                      Sched: {train.scheduledTime}
                    </div>
                  </div>
                </div>

                {/* ETA & Delay Badge */}
                <div className="text-right shrink-0">
                  <div
                    className={`text-base sm:text-lg font-extrabold font-mono ${
                      train.etaMin <= 2 ? 'text-[#143428] dark:text-[#5ee9b5]' : 'text-[#17201B] dark:text-[#F3F5EE]'
                    }`}
                  >
                    {train.etaMin <= 1 ? 'Now' : `${train.etaMin} min`}
                  </div>
                  <div className="text-[11px] mt-0.5">
                    {train.delayMin === 0 ? (
                      <span className="text-[#143428] dark:text-[#5ee9b5] font-bold">On Time</span>
                    ) : (
                      <span className="text-[#B9552C] dark:text-[#FF7A45] font-bold">+{train.delayMin}m delay</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom row: badges (Coach 1 Ladies, Crowd) with natural spacing */}
              <div className="flex flex-wrap items-center gap-2 mt-2.5 pt-2 border-t border-[#E2E4DC]/70 dark:border-white/10">
                {train.isFirstCoachLadiesReserved && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FAF2EE] dark:bg-[#2A160E] text-[#B9552C] dark:text-[#FF7A45] text-[10px] font-bold tracking-tight whitespace-nowrap">
                    Coach 1 Ladies
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-xs text-[#6B7267] dark:text-[#9CAEA3]">
                  <Users className="w-3.5 h-3.5 text-[#6B7267] dark:text-[#9CAEA3]" strokeWidth={1.75} />
                  <span
                    className={
                      train.crowd === 'High'
                        ? 'text-[#B9552C] dark:text-[#FF7A45] font-bold'
                        : train.crowd === 'Moderate'
                        ? 'text-amber-700 dark:text-amber-400 font-bold'
                        : 'text-[#143428] dark:text-[#5ee9b5] font-bold'
                    }
                  >
                    {train.crowd} crowd
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connecting Feeder Bus Arrivals at this Station */}
      {connectingBuses.length > 0 && (
        <div className="bg-[#F8F9F5] dark:bg-[#0D1511] border-t border-[#E2E4DC] dark:border-white/10 p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-bold text-[#17201B] dark:text-[#F3F5EE]">
              <BusFront className="w-4 h-4 text-[#B9552C] dark:text-[#FF7A45] shrink-0" strokeWidth={2} />
              <span className="text-xs sm:text-sm">Connecting Feeder Buses (Gate Exit):</span>
            </div>
            <span className="text-[11px] text-[#6B7267] dark:text-[#9CAEA3] hidden sm:inline font-medium">Live GPS tracking</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {connectingBuses.slice(0, 2).map(bus => (
              <div
                key={bus.busId}
                className="card-interactive p-3.5 rounded-xl bg-white dark:bg-[#16231D] text-xs flex items-center justify-between gap-3 shadow-2xs border border-[#E2E4DC] dark:border-white/10"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-[#17201B] dark:text-[#F3F5EE] text-xs">{bus.routeNumber}</span>
                    {bus.isAirConditioned && (
                      <span className="px-2 py-0.5 rounded-full bg-[#143428]/10 dark:bg-emerald-500/20 text-[#143428] dark:text-[#5ee9b5] text-[9px] font-bold">
                        AC
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#6B7267] dark:text-[#9CAEA3] truncate mt-0.5">
                    To: {bus.destination}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-bold text-[#143428] dark:text-[#5ee9b5] font-mono text-xs">in {bus.etaMin} min</div>
                  <div className="text-[10px] text-[#6B7267] dark:text-[#9CAEA3]">
                    {bus.delayMin > 0 ? `+${bus.delayMin}m` : 'On time'} • ₹{bus.fareInr}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </LiquidGlass>
  );
}
