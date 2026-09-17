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
    <div className="rounded-2xl bg-white text-[#17201B] border border-[#E2E4DC] shadow-xs overflow-hidden">
      {/* PIDS Header (Passenger Information Display System Style) */}
      <div className="p-4 sm:p-5 bg-white border-b border-[#E2E4DC] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#143428] text-white flex items-center justify-center shrink-0 shadow-xs">
            <TrainFront className="w-5 h-5 text-emerald-300" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7267] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <span>Live Platform Board</span>
            </div>
            <h4 className="text-sm sm:text-base font-extrabold text-[#17201B] truncate">
              {stationName}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-2.5 py-1 rounded-lg bg-[#F4F5F0] border border-[#E2E4DC] text-xs text-[#143428] font-mono whitespace-nowrap font-bold">
            {schedule.headwayText}
          </span>
          <span className="text-[11px] text-[#8E9487] font-mono hidden xs:inline">
            sync in {secondsUntilRefresh}s
          </span>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            aria-label="Refresh live schedule"
            className="p-1.5 sm:p-2 rounded-lg bg-[#F4F5F0] hover:bg-[#E2E4DC] text-[#17201B] transition disabled:opacity-50 border border-[#E2E4DC] shrink-0"
            title="Refresh schedule"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Platform Switcher */}
      <div className="grid grid-cols-2 bg-[#F8F9F5] border-b border-[#E2E4DC] p-1.5 sm:p-2 gap-2">
        <button
          onClick={() => setActivePlatform(1)}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activePlatform === 1
              ? 'bg-[#143428] text-white shadow-xs'
              : 'text-[#53584E] hover:text-[#17201B] hover:bg-white/80'
          }`}
        >
          <span
            className={`w-4 h-4 rounded-full text-[10px] font-bold shrink-0 flex items-center justify-center ${
              activePlatform === 1 ? 'bg-white text-[#143428]' : 'bg-[#E2E4DC] text-[#17201B]'
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
          className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activePlatform === 2
              ? 'bg-[#143428] text-white shadow-xs'
              : 'text-[#53584E] hover:text-[#17201B] hover:bg-white/80'
          }`}
        >
          <span
            className={`w-4 h-4 rounded-full text-[10px] font-bold shrink-0 flex items-center justify-center ${
              activePlatform === 2 ? 'bg-white text-[#143428]' : 'bg-[#E2E4DC] text-[#17201B]'
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
      <div className="p-5 sm:p-6 space-y-3">
        <div className="text-[10px] font-bold text-[#6B7267] uppercase tracking-wider flex items-center justify-between pb-1">
          <span>Destination & Direction</span>
          <span>Live ETA</span>
        </div>

        <div className="space-y-2.5">
          {currentArrivals.map((train, idx) => (
            <div
              key={train.id}
              className={`p-4 rounded-xl transition ${
                idx === 0
                  ? 'bg-[#F8F9F5] border border-[#143428]/20 shadow-xs'
                  : 'bg-[#FAFAF7] text-[#53584E]'
              }`}
            >
              {/* Top row: Train destination + Live ETA Countdown */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      idx === 0 ? 'bg-[#143428] text-white' : 'bg-[#EAECE4] text-[#53584E]'
                    }`}
                  >
                    {idx === 0 ? (
                      <TrainFront className="w-4 h-4 text-emerald-300" strokeWidth={2} />
                    ) : (
                      <span>#{idx + 1}</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-[#17201B] truncate">
                      {train.trainDestination}
                    </div>
                    <div className="text-[11px] text-[#6B7267] mt-0.5">
                      Sched: {train.scheduledTime}
                    </div>
                  </div>
                </div>

                {/* ETA & Delay Badge */}
                <div className="text-right shrink-0">
                  <div
                    className={`text-base sm:text-lg font-extrabold font-mono ${
                      train.etaMin <= 2 ? 'text-[#143428]' : 'text-[#17201B]'
                    }`}
                  >
                    {train.etaMin <= 1 ? 'Now' : `${train.etaMin} min`}
                  </div>
                  <div className="text-[11px] mt-0.5">
                    {train.delayMin === 0 ? (
                      <span className="text-[#143428] font-bold">On Time</span>
                    ) : (
                      <span className="text-[#B9552C] font-bold">+{train.delayMin}m delay</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom row: badges (Coach 1 Ladies, Crowd) with natural spacing */}
              <div className="flex flex-wrap items-center gap-2 mt-2.5 pt-2 border-t border-[#E2E4DC]/70">
                {train.isFirstCoachLadiesReserved && (
                  <span className="px-2.5 py-0.5 rounded-md bg-[#FAF2EE] text-[#B9552C] text-[10px] font-bold tracking-tight whitespace-nowrap">
                    Coach 1 Ladies
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-xs text-[#6B7267]">
                  <Users className="w-3.5 h-3.5 text-[#6B7267]" strokeWidth={1.75} />
                  <span
                    className={
                      train.crowd === 'High'
                        ? 'text-[#B9552C] font-bold'
                        : train.crowd === 'Moderate'
                        ? 'text-amber-700 font-bold'
                        : 'text-[#143428] font-bold'
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
        <div className="bg-[#F8F9F5] border-t border-[#E2E4DC] p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-bold text-[#17201B]">
              <BusFront className="w-4 h-4 text-[#B9552C] shrink-0" strokeWidth={2} />
              <span className="text-xs sm:text-sm">Connecting Feeder Buses (Gate Exit):</span>
            </div>
            <span className="text-[11px] text-[#6B7267] hidden sm:inline font-medium">Live GPS tracking</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {connectingBuses.slice(0, 2).map(bus => (
              <div
                key={bus.busId}
                className="p-3.5 rounded-xl bg-white text-xs flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-[#17201B] text-xs">{bus.routeNumber}</span>
                    {bus.isAirConditioned && (
                      <span className="px-1.5 py-0.2 rounded bg-[#143428]/10 text-[#143428] text-[9px] font-bold">
                        AC
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#6B7267] truncate mt-0.5">
                    To: {bus.destination}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-bold text-[#143428] font-mono text-xs">in {bus.etaMin} min</div>
                  <div className="text-[10px] text-[#6B7267]">
                    {bus.delayMin > 0 ? `+${bus.delayMin}m` : 'On time'} • ₹{bus.fareInr}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
