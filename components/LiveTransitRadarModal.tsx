'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  METRO_LINES_DATA,
  LIVE_BUS_ROUTES,
  ACTIVE_TRANSIT_ALERTS,
  MetroLineRealtime,
  LiveBusArrival,
  TransitServiceAlert
} from '@/lib/realtime-transit';
import {
  TrainFront,
  BusFront,
  AlertTriangle,
  BadgeCheck,
  Clock,
  RotateCw,
  Search,
  X,
  Radar,
  Sparkle,
  ShieldCheck,
  ChevronRight,
  Info,
  Users
} from 'lucide-react';

interface LiveTransitRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultOrigin?: string;
  defaultDest?: string;
}

export function LiveTransitRadarModal({
  isOpen,
  onClose,
  defaultOrigin = 'Gurgaon Cyber City',
  defaultDest = 'Ambience Mall, Gurugram'
}: LiveTransitRadarModalProps) {
  const [activeTab, setActiveTab] = useState<'lines' | 'buses' | 'alerts'>('lines');
  const [busSearch, setBusSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedStr, setLastRefreshedStr] = useState('Just now');
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // AI Live Traffic & Transit summary
  const [aiTransitSummary, setAiTransitSummary] = useState<string | null>(null);
  const [isLoadingAiSummary, setIsLoadingAiSummary] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        }).toUpperCase()
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const now = new Date();
    setLastRefreshedStr(
      now.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit'
      })
    );
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const fetchLiveAiAdvisory = async () => {
    setIsLoadingAiSummary(true);
    try {
      const res = await fetch('/api/realtime-transit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originStation: defaultOrigin,
          destStation: defaultDest,
          lineName: 'Delhi Metro Yellow Line & Rapid Metro'
        })
      });
      const data = await res.json();
      if (data.success && data.summary) {
        setAiTransitSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to fetch AI transit check', err);
    } finally {
      setIsLoadingAiSummary(false);
    }
  };

  const linesList = Object.values(METRO_LINES_DATA);
  const filteredBuses: LiveBusArrival[] = LIVE_BUS_ROUTES.filter(b => {
    if (!busSearch.trim()) return true;
    const q = busSearch.toLowerCase();
    return (
      b.routeNumber.toLowerCase().includes(q) ||
      b.origin.toLowerCase().includes(q) ||
      b.destination.toLowerCase().includes(q) ||
      b.viaKeyStops.some(s => s.toLowerCase().includes(q))
    );
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="transit-radar-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-2.5 sm:p-6 pb-[max(env(safe-area-inset-bottom,0px),12px)] sm:pb-6 bg-black/60 backdrop-blur-md"
        >
          <motion.div
            key="transit-radar-card"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
            onClick={e => e.stopPropagation()}
            className="ios-liquid-glass relative w-full max-w-4xl rounded-[32px] shadow-2xl flex flex-col max-h-[88dvh] sm:max-h-[90vh] overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* iOS Grabber for Mobile */}
            <div className="pt-2 pb-1 flex justify-center sm:hidden">
              <div className="ios-grabber" />
            </div>

            {/* Modal Header in iOS Liquid Dark Glass */}
            <div className="ios-liquid-glass-dark p-4 sm:p-6 text-white flex items-center justify-between border-b border-white/10 gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold border border-white/15 shrink-0">
                  <Radar className="w-5 h-5 text-emerald-300 shrink-0" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold tracking-tight text-white font-sans truncate">
                      Delhi & Gurugram Transit Radar
                    </h3>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-emerald-200 text-[10px] font-mono font-medium border border-white/15 whitespace-nowrap shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                      <span>{currentTimeStr} IST</span>
                    </span>
                  </div>
                  <p className="text-xs text-emerald-100/80 mt-0.5 truncate">
                    Real-time multi-modal status: DMRC, Rapid Metro & Gurugaman buses
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="btn-tactile px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition flex items-center gap-1.5 text-xs font-medium shrink-0 cursor-pointer"
                  title="Refresh live data"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} strokeWidth={2} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                <button
                  onClick={onClose}
                  aria-label="Close Live Transit Radar"
                  className="btn-tactile p-2 rounded-full bg-white/10 hover:bg-white/20 text-emerald-100 hover:text-white transition border border-white/15 shrink-0 cursor-pointer"
                >
                  <X className="w-5 h-5" strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Mode / Tabs Switcher */}
            <div className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 border-b border-[#E2E4DC]/80 dark:border-white/10 bg-white/40 dark:bg-black/30 backdrop-blur-md overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('lines')}
                className={`ios-liquid-pill px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'lines'
                    ? '!bg-[#143428] dark:!bg-emerald-500 !text-white dark:!text-[#061C12] !border-[#143428] dark:!border-emerald-500 shadow-sm'
                    : 'text-[#53584E] dark:text-[#A7B2A8]'
                }`}
              >
                <TrainFront className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                <span>Metro Lines ({linesList.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('buses')}
                className={`ios-liquid-pill px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'buses'
                    ? '!bg-[#143428] dark:!bg-emerald-500 !text-white dark:!text-[#061C12] !border-[#143428] dark:!border-emerald-500 shadow-sm'
                    : 'text-[#53584E] dark:text-[#A7B2A8]'
                }`}
              >
                <BusFront className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                <span>Feeder Buses ({LIVE_BUS_ROUTES.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('alerts')}
                className={`ios-liquid-pill px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'alerts'
                    ? '!bg-[#143428] dark:!bg-emerald-500 !text-white dark:!text-[#061C12] !border-[#143428] dark:!border-emerald-500 shadow-sm'
                    : 'text-[#53584E] dark:text-[#A7B2A8]'
                }`}
              >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
            <span>Service Advisories ({ACTIVE_TRANSIT_ALERTS.length})</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#F4F5F0] dark:bg-[#080D0A]">
          {/* AI Live Transit Query Banner */}
          <div className="rounded-2xl bg-white dark:bg-[#111A15] border border-[#E2E4DC] dark:border-white/10 p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#143428]/10 text-[#143428] flex items-center justify-center font-bold shrink-0">
                  <Sparkle className="w-4 h-4 shrink-0" strokeWidth={2} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#17201B] dark:text-[#F3F5EE]">
                    AI Live Transit Congestion Check
                  </h4>
                  <p className="text-[11px] text-[#6B7267] dark:text-[#9BAAA0]">
                    Corridor assessment between {defaultOrigin.split(',')[0]} and {defaultDest.split(',')[0]}
                  </p>
                </div>
              </div>

              <button
                onClick={fetchLiveAiAdvisory}
                disabled={isLoadingAiSummary}
                className="btn-tactile px-3.5 py-1.5 rounded-full bg-[#143428] dark:bg-emerald-500 text-white dark:text-[#061C12] text-xs font-bold hover:bg-[#1A3E31] dark:hover:bg-emerald-400 transition disabled:opacity-50 shrink-0 shadow-xs cursor-pointer"
              >
                {isLoadingAiSummary ? 'Analyzing...' : 'Run Transit Check'}
              </button>
            </div>

            {aiTransitSummary && (
              <div className="mt-3 pt-3 border-t border-[#E2E4DC] dark:border-white/10 text-xs text-[#2C332E] dark:text-[#D1DDD6] leading-relaxed bg-[#F8F9F5] dark:bg-[#16231D] p-3.5 rounded-xl border border-[#E2E4DC] dark:border-white/10">
                {aiTransitSummary}
              </div>
            )}
          </div>

          {/* TAB 1: METRO LINES STATUS */}
          {activeTab === 'lines' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[#6B7267] dark:text-[#9BAAA0]">
                <span className="font-bold text-[#17201B] dark:text-[#F3F5EE]">
                  Real-time Metro Network Status:
                </span>
                <span>Headway calculated for current Indian Standard Time</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {linesList.map(line => (
                  <div
                    key={line.id}
                    className="p-4 rounded-2xl bg-white dark:bg-[#111A15] border border-[#E2E4DC] dark:border-white/10 shadow-xs space-y-3 transition hover:border-[#143428]/40 dark:hover:border-emerald-500/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full ring-4 ring-[#E2E4DC]/50 dark:ring-white/10 shrink-0"
                          style={{ backgroundColor: line.color }}
                        ></span>
                        <div>
                          <h4 className="font-bold text-sm text-[#17201B] dark:text-[#F3F5EE]">
                            {line.name}
                          </h4>
                          <span className="text-[11px] text-[#6B7267] dark:text-[#9BAAA0]">{line.operatingHours}</span>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#143428]/10 dark:bg-emerald-500/20 text-[#143428] dark:text-emerald-400 border border-[#143428]/20 dark:border-emerald-500/30">
                        <BadgeCheck className="w-3.5 h-3.5 text-[#143428] dark:text-emerald-400" strokeWidth={2} />
                        {line.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-[#F8F9F5] dark:bg-[#16231D] border border-[#E2E4DC] dark:border-white/10 p-2.5 rounded-xl text-center text-xs">
                      <div>
                        <div className="text-[10px] text-[#6B7267] dark:text-[#9BAAA0] uppercase font-bold">Headway</div>
                        <div className="font-bold text-[#17201B] dark:text-[#F3F5EE] mt-0.5">
                          ~{line.currentHeadwayMin} min
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#6B7267] dark:text-[#9BAAA0] uppercase font-bold">Delay</div>
                        <div className="font-bold text-[#143428] dark:text-emerald-400 mt-0.5">
                          {line.expectedDelayMin === 0 ? '0m (On Time)' : `+${line.expectedDelayMin}m`}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#6B7267] dark:text-[#9BAAA0] uppercase font-bold">Crowd</div>
                        <div
                          className={`font-bold mt-0.5 ${
                            line.crowdLevel === 'High'
                              ? 'text-[#B9552C] dark:text-[#FF7A45]'
                              : line.crowdLevel === 'Moderate'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-[#143428] dark:text-emerald-400'
                          }`}
                        >
                          {line.crowdLevel}
                        </div>
                      </div>
                    </div>

                    {line.advisoryText && (
                      <p className="text-xs text-[#53584E] dark:text-[#A7B2A8] leading-relaxed">
                        {line.advisoryText}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: BUSES SCHEDULE & TRACKING */}
          {activeTab === 'buses' && (
            <div className="space-y-4">
              {/* Bus Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-[#6B7267] dark:text-[#9BAAA0] absolute left-3.5 top-1/2 -translate-y-1/2" strokeWidth={2} />
                <input
                  type="text"
                  value={busSearch}
                  onChange={e => setBusSearch(e.target.value)}
                  placeholder="Search bus route number (e.g. 116, 111, 134, 543A), stop, or destination..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#111A15] border border-[#E2E4DC] dark:border-white/10 text-xs text-[#17201B] dark:text-[#F3F5EE] font-medium focus:ring-2 focus:ring-[#143428] dark:focus:ring-emerald-500 focus:outline-none transition shadow-xs"
                />
              </div>

              <div className="space-y-3">
                {filteredBuses.map(bus => (
                  <div
                    key={bus.busId}
                    className="p-4 rounded-2xl bg-white dark:bg-[#111A15] border border-[#E2E4DC] dark:border-white/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-[#143428] dark:bg-emerald-500 text-white dark:text-[#061C12] text-xs font-bold font-mono tracking-wide">
                          {bus.routeNumber}
                        </span>
                        <span className="text-xs font-medium text-[#6B7267] dark:text-[#9BAAA0]">
                          {bus.agency}
                        </span>
                        {bus.isAirConditioned && (
                          <span className="px-2 py-0.5 rounded-full bg-[#143428]/10 dark:bg-emerald-500/20 text-[#143428] dark:text-emerald-400 text-[10px] font-bold">
                            AC
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full bg-[#F4F5F0] dark:bg-white/10 border border-[#E2E4DC] dark:border-white/10 text-[#17201B] dark:text-[#F3F5EE] text-[10px] font-bold">
                          ₹{bus.fareInr} Fare
                        </span>
                      </div>

                      <div className="text-xs font-bold text-[#17201B] dark:text-[#F3F5EE] flex items-center gap-1.5 pt-0.5">
                        <span>{bus.origin}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-[#6B7267] dark:text-[#9BAAA0]" strokeWidth={2} />
                        <span>{bus.destination}</span>
                      </div>

                      <div className="text-[11px] text-[#6B7267] dark:text-[#9BAAA0] flex flex-wrap gap-1 items-center">
                        <span className="font-bold text-[#17201B] dark:text-[#F3F5EE]">Stops via:</span>
                        {bus.viaKeyStops.map((stop, sidx) => (
                          <span key={sidx} className="bg-[#F8F9F5] dark:bg-[#16231D] border border-[#E2E4DC] dark:border-white/10 px-1.5 py-0.2 rounded text-[10px]">
                            {stop}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bus Live ETA Status */}
                    <div className="sm:text-right bg-[#F8F9F5] dark:bg-[#16231D] border border-[#E2E4DC] dark:border-white/10 sm:border-0 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                      <div className="text-[10px] font-bold text-[#6B7267] dark:text-[#9BAAA0] uppercase tracking-wider">Next Live Arrival</div>
                      <div className="text-lg font-extrabold text-[#143428] dark:text-emerald-400 font-mono mt-0.5">
                        in {bus.etaMin} mins
                      </div>
                      <div className="text-xs text-[#6B7267] dark:text-[#9BAAA0] mt-0.5 flex sm:justify-end items-center gap-2">
                        <span>Next: <strong className="text-[#17201B] dark:text-[#F3F5EE]">{bus.nextStop}</strong></span>
                        <span>•</span>
                        <span className={bus.delayMin > 0 ? 'text-[#B9552C] dark:text-[#FF7A45] font-semibold' : 'text-[#143428] dark:text-emerald-400'}>
                          {bus.delayMin > 0 ? `+${bus.delayMin}m delay` : 'On schedule'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SERVICE ALERTS */}
          {activeTab === 'alerts' && (
            <div className="space-y-3.5">
              {ACTIVE_TRANSIT_ALERTS.map(alert => (
                <div
                  key={alert.id}
                  className="p-4 rounded-2xl border border-[#E2E4DC] dark:border-white/10 bg-white dark:bg-[#111A15] transition shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                          alert.severity === 'warning'
                            ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50'
                            : alert.severity === 'critical'
                            ? 'bg-[#FAF2EE] dark:bg-[#2A160E] text-[#B9552C] dark:text-[#FF7A45] border border-[#E8C2B3] dark:border-[#FF7A45]/30'
                            : 'bg-[#F4F5F0] dark:bg-white/10 text-[#17201B] dark:text-[#F3F5EE] border border-[#E2E4DC] dark:border-white/10'
                        }`}
                      >
                        <AlertTriangle className="w-4 h-4" strokeWidth={2} />
                      </span>
                      <div>
                        <h4 className="font-bold text-sm text-[#17201B] dark:text-[#F3F5EE]">
                          {alert.title}
                        </h4>
                        <span className="text-[11px] text-[#6B7267] dark:text-[#9BAAA0]">{alert.timestamp}</span>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      {alert.affectedLines.map((line, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 rounded-lg bg-[#F4F5F0] dark:bg-white/10 border border-[#E2E4DC] dark:border-white/10 text-[#17201B] dark:text-[#F3F5EE] text-[10px] font-bold"
                        >
                          {line}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-[#53584E] dark:text-[#A7B2A8] mt-2.5 leading-relaxed">
                    {alert.description}
                  </p>

                  <div className="mt-3 p-3 rounded-[12px] bg-[#F8F9F5] dark:bg-[#16231D] border border-[#E2E4DC] dark:border-white/10 text-xs flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#143428] dark:text-emerald-400 shrink-0 mt-0.5" strokeWidth={2} />
                    <div>
                      <span className="font-bold text-[#17201B] dark:text-[#F3F5EE]">
                        Recommended Action:{' '}
                      </span>
                      <span className="text-[#53584E] dark:text-[#D1DDD6]">{alert.recommendedAction}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white dark:bg-[#0c1410] border-t border-[#E2E4DC] dark:border-white/10 flex items-center justify-between text-xs text-[#6B7267] dark:text-[#9BAAA0]">
          <div className="flex items-center gap-1.5">
            <BadgeCheck className="w-4 h-4 text-[#143428] dark:text-emerald-400" strokeWidth={2} />
            <span className="hidden sm:inline">Feeds synchronized with Delhi Metro (DMRC) & Gurugram GMCBL schedules</span>
            <span className="sm:hidden">DMRC & GMCBL sync</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#143428] dark:bg-emerald-500 text-white dark:text-[#061C12] text-xs font-bold hover:bg-[#1A3E31] dark:hover:bg-emerald-400 transition shadow-xs cursor-pointer active:scale-95"
          >
            Close Radar
          </button>
        </div>
      </motion.div>
    </motion.div>
    )}
  </AnimatePresence>
  );
}
