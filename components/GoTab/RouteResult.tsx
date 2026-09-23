'use client';

import React, { useState } from 'react';
import { MultiModalTripPlan, RideMode } from '@/lib/delhi-ncr-transit';
import { LiveStationDepartures } from '@/components/LiveStationDepartures';
import { ACTIVE_TRANSIT_ALERTS, getConnectingBusesForStation } from '@/lib/realtime-transit';
import { openRapidoApp } from '@/lib/utils';
import {
  TrainFront,
  DoorOpen,
  CarTaxiFront,
  PersonStanding,
  Map,
  Copy,
  Check,
  Zap,
  Eye,
  Signpost,
  Timer,
  IndianRupee,
  VolumeX,
  MessageSquareCode,
  ArrowRight,
  RefreshCw,
  GitCommitVertical,
  Flame,
  Users,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldCheck,
  TrendingDown,
  Clock
} from 'lucide-react';

interface RouteResultProps {
  plan: MultiModalTripPlan;
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
  onSwitchToMap: () => void;
  onChangeDestination: () => void;
  onOpenTransitRadar?: () => void;
}

export function RouteResult({
  plan,
  passengerCount: externalPax,
  onPassengerCountChange,
  firstMileMode: externalFmMode,
  onFirstMileModeChange,
  lastMileMode: externalLmMode,
  onLastMileModeChange,
  deepLinks,
  aiGuide,
  onSwitchToMap,
  onChangeDestination,
  onOpenTransitRadar,
}: RouteResultProps) {
  const [copiedText, setCopiedText] = useState(false);
  const [isFareBreakdownOpen, setIsFareBreakdownOpen] = useState(true);

  // Local state with external sync fallback
  const [localPax, setLocalPax] = useState<number>(externalPax || plan.fareBreakdown?.passengerCount || 1);
  const [localFmMode, setLocalFmMode] = useState<RideMode>(
    externalFmMode || plan.fareBreakdown?.firstMileMode || (plan.firstMile.distanceKm <= 0.8 ? 'walk' : 'cab')
  );
  const [localLmMode, setLocalLmMode] = useState<RideMode>(
    externalLmMode || plan.fareBreakdown?.lastMileMode || (plan.lastMile.distanceKm <= 0.6 ? 'walk' : 'cab')
  );

  const pax = externalPax !== undefined ? externalPax : localPax;
  const fmMode = externalFmMode !== undefined ? externalFmMode : localFmMode;
  const lmMode = externalLmMode !== undefined ? externalLmMode : localLmMode;

  const handlePaxChange = (newPax: number) => {
    setLocalPax(newPax);
    onPassengerCountChange?.(newPax);
  };

  const handleFmChange = (mode: RideMode) => {
    setLocalFmMode(mode);
    onFirstMileModeChange?.(mode);
  };

  const handleLmChange = (mode: RideMode) => {
    setLocalLmMode(mode);
    onLastMileModeChange?.(mode);
  };

  const routeAlerts = ACTIVE_TRANSIT_ALERTS.filter(
    (alert) =>
      alert.affectedStations?.includes(plan.originStation.id) ||
      alert.affectedStations?.includes(plan.destinationStation.id) ||
      alert.affectedLines.includes(plan.originStation.line) ||
      alert.affectedLines.includes(plan.destinationStation.line)
  );

  // Active Fare Calculations
  const fmOptions = plan.fareBreakdown?.firstMileOptions || { cab: 150, auto: 95, walk: 0 };
  const lmOptions = plan.fareBreakdown?.lastMileOptions || { cab: 150, auto: 95, walk: 0 };

  const firstMileCost =
    fmMode === 'walk'
      ? 0
      : fmMode === 'cab'
      ? fmOptions.cab
      : fmMode === 'e-rickshaw' && fmOptions.eRickshaw
      ? fmOptions.eRickshaw * pax
      : fmOptions.auto;

  const metroFarePerPerson = plan.fareBreakdown?.metroFarePerPersonInr || plan.metroLeg.estimatedFareInr || 40;
  const metroTotalCost = metroFarePerPerson * pax;

  const lastMileCost =
    lmMode === 'walk'
      ? 0
      : lmMode === 'cab'
      ? lmOptions.cab
      : lmMode === 'e-rickshaw' && lmOptions.eRickshaw
      ? lmOptions.eRickshaw * pax
      : lmOptions.auto;

  const totalTripFare = firstMileCost + metroTotalCost + lastMileCost;

  // Active Durations
  const liveTraffic = plan.liveTraffic;
  const firstMileDuration =
    fmMode === 'walk'
      ? Math.max(3, Math.round(plan.firstMile.distanceKm * 12))
      : liveTraffic?.firstMileDurationMin || plan.firstMile.durationMin;

  const metroDuration = liveTraffic?.metroDurationMin || plan.metroLeg.totalDurationMin;

  const lastMileDuration =
    lmMode === 'walk'
      ? Math.max(3, Math.round(plan.lastMile.distanceKm * 12))
      : liveTraffic?.lastMileDurationMin || (plan.lastMile.options[0]?.durationMin || 8);

  const totalTripDuration = firstMileDuration + metroDuration + lastMileDuration;

  // Direct Cab Comparison
  const directCab = plan.fareBreakdown?.directCabComparison || {
    estimatedCostInr: Math.round(totalTripFare * 1.3 + 80),
    durationMin: Math.round(totalTripDuration * 1.25),
    savingsInr: Math.max(0, Math.round(totalTripFare * 0.3 + 80)),
    timeDiffMin: 15
  };

  // Uber links
  const uberFmLink =
    deepLinks?.uberFirstMileUrl ||
    `https://m.uber.com/ul/?action=setPickup&client_id=metronav&pickup[latitude]=${plan.origin.lat}&pickup[longitude]=${plan.origin.lng}&dropoff[latitude]=${plan.originStation.lat}&dropoff[longitude]=${plan.originStation.lng}`;

  const uberLmLink =
    deepLinks?.uberLastMileUrl ||
    `https://m.uber.com/ul/?action=setPickup&client_id=metronav&pickup[latitude]=${plan.destinationStation.lat}&pickup[longitude]=${plan.destinationStation.lng}&dropoff[latitude]=${plan.destination.lat}&dropoff[longitude]=${plan.destination.lng}`;

  const handleCopyRoute = () => {
    const summary = `📍 Route to ${plan.destination.name} (${pax} ${pax === 1 ? 'person' : 'people'}):
1. First Mile: Start at ${plan.origin.name} ➔ Go to ${plan.originStation.name} (${fmMode.toUpperCase()}: ~₹${firstMileCost}, ~${firstMileDuration}m)
2. Metro: Board ${plan.originStation.line} Line at ${plan.originStation.name}
${plan.metroLeg.requiresTransfer ? `   Interchange at ${plan.metroLeg.transferStation?.name}\n` : ''}   Metro Fare: ₹${metroFarePerPerson}/pax (₹${metroTotalCost} total for ${pax} pax)
3. Deboard: ${plan.destinationStation.name} ➔ EXIT GATE ${plan.metroExit.gateNumber}
4. Last Mile: ${plan.destinationStation.name} ➔ ${plan.destination.name} (${lmMode.toUpperCase()}: ~₹${lastMileCost}, ~${lastMileDuration}m)
💰 Total Multi-Modal Fare: ~₹${totalTripFare} (vs Direct Cab: ~₹${directCab.estimatedCostInr})
⏱️ Total Travel Time: ~${totalTripDuration} mins
(Generated via MetroNav Delhi-NCR)`;

    navigator.clipboard.writeText(summary);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Editorial Racing Green Hero Banner */}
      <div className="rounded-3xl bg-[#143428] text-white p-5 sm:p-6 shadow-lg relative overflow-hidden border border-[#1E4837]">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              Complete Multi-Modal Itinerary
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5 leading-tight truncate">
              To {plan.destination.name}
            </h2>
            <p className="text-xs text-emerald-100/80 mt-1 truncate">
              From <span className="text-white font-bold">{plan.origin.name}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onChangeDestination}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white border border-white/20 shrink-0 transition active:scale-95 whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Change</span>
          </button>
        </div>

        {/* 3 Metric Stat Boxes: Time, Total Fare, Exit Gate */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 mt-4 pt-4 border-t border-white/15 relative z-10">
          {/* Time with Live Google Traffic */}
          <div className="bg-[#1A3E31]/95 rounded-2xl p-2.5 sm:p-3 border border-[#235241] text-center flex flex-col justify-between">
            <div className="text-[10px] text-emerald-200/90 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
              <Timer className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span>Time</span>
            </div>
            <div className="text-base sm:text-xl font-black text-white mt-1 tabular-nums">
              ~{totalTripDuration}m
            </div>
            <div className="mt-1">
              {liveTraffic?.trafficCondition === 'heavy' ? (
                <span className="px-1.5 py-0.5 rounded-md bg-rose-500/25 border border-rose-400/30 text-[9px] font-bold text-rose-200 flex items-center justify-center gap-1">
                  <Flame className="w-2.5 h-2.5 text-rose-300" />
                  <span>Heavy Traffic</span>
                </span>
              ) : liveTraffic?.trafficCondition === 'moderate' ? (
                <span className="px-1.5 py-0.5 rounded-md bg-amber-500/25 border border-amber-400/30 text-[9px] font-bold text-amber-200 flex items-center justify-center gap-1">
                  <Clock className="w-2.5 h-2.5 text-amber-300" />
                  <span>Mod. Traffic</span>
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/25 border border-emerald-400/30 text-[9px] font-bold text-emerald-200 flex items-center justify-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-emerald-300" />
                  <span>Live Traffic</span>
                </span>
              )}
            </div>
          </div>

          {/* End-to-End Total Fare */}
          <div className="bg-[#1A3E31]/95 rounded-2xl p-2.5 sm:p-3 border border-amber-400/30 text-center flex flex-col justify-between">
            <div className="text-[10px] text-amber-200 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
              <IndianRupee className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Total Fare</span>
            </div>
            <div className="text-base sm:text-xl font-black text-amber-200 mt-1 tabular-nums">
              ₹{totalTripFare}
            </div>
            <div className="text-[9px] font-bold text-amber-100/70 mt-1 truncate">
              {pax} {pax === 1 ? 'person' : 'passengers'}
            </div>
          </div>

          {/* Exit Gate */}
          <div className="bg-[#1A3E31]/95 rounded-2xl p-2.5 sm:p-3 border border-[#B9552C]/50 text-center flex flex-col justify-between">
            <div className="text-[10px] text-[#F3A585] font-bold uppercase tracking-wider flex items-center justify-center gap-1">
              <DoorOpen className="w-3.5 h-3.5 text-[#F3A585] shrink-0" />
              <span>Exit Gate</span>
            </div>
            <div className="mt-1 flex items-center justify-center">
              <span className="px-2 py-0.5 rounded-lg bg-[#B9552C] text-white text-[11px] sm:text-xs font-black shadow-xs whitespace-nowrap inline-block">
                Gate {plan.metroExit.gateNumber}
              </span>
            </div>
            <div className="text-[9px] font-bold text-[#F3A585]/90 mt-1 truncate">
              Deboard point
            </div>
          </div>
        </div>

        {/* Live Service Alerts */}
        {routeAlerts.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10 relative z-10">
            {routeAlerts.slice(0, 1).map((alert) => (
              <div
                key={alert.id}
                className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/30 text-xs text-amber-100 flex items-center justify-between gap-3 overflow-hidden"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Flame className="w-4 h-4 text-amber-300 shrink-0" />
                  <span className="font-medium truncate leading-tight">
                    <strong className="text-amber-200 font-bold">Alert:</strong> {alert.title}
                  </span>
                </div>
                {onOpenTransitRadar && (
                  <button
                    type="button"
                    onClick={onOpenTransitRadar}
                    className="px-2.5 py-1 rounded-lg bg-amber-400/25 hover:bg-amber-400/35 text-amber-100 font-bold text-[10px] shrink-0 whitespace-nowrap transition"
                  >
                    Radar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Commuter Count Selector */}
      <div className="p-3.5 rounded-2xl bg-white border border-[#E2E4DC] shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#143428]/10 text-[#143428] flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-[#17201B] truncate">Passengers / Commuters</div>
            <div className="text-[10px] text-[#6B7267] truncate">
              Metro tickets multiply; cabs/autos are shared
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-[#F4F5F0] p-1 rounded-xl shrink-0">
          {[1, 2, 3, 4].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handlePaxChange(num)}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition active:scale-95 ${
                pax === num
                  ? 'bg-[#143428] text-white shadow-xs'
                  : 'text-[#53584E] hover:text-[#17201B]'
              }`}
            >
              {num} {num === 1 ? 'pax' : 'pax'}
            </button>
          ))}
        </div>
      </div>

      {/* Itemized Fare Breakdown & Direct Cab Comparison Card */}
      <div className="rounded-2xl bg-[#FAF9F5] border border-[#E2E4DC] p-4 shadow-xs space-y-3">
        <div
          onClick={() => setIsFareBreakdownOpen((prev) => !prev)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#143428]" />
            <span className="text-xs font-black text-[#17201B]">
              Transparent Fare Itemization (~₹{totalTripFare} Total)
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-[#143428]">
            <span>{isFareBreakdownOpen ? 'Hide' : 'Breakdown'}</span>
            {isFareBreakdownOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </div>
        </div>

        {isFareBreakdownOpen && (
          <div className="space-y-2.5 pt-2 border-t border-[#E2E4DC] text-xs">
            {/* Leg 1 */}
            <div className="flex items-center justify-between py-1 border-b border-[#EAECE4]">
              <div className="flex items-center gap-2 text-[#53584E]">
                <span className="px-1.5 py-0.5 rounded bg-[#143428]/10 text-[#143428] font-mono font-bold text-[10px]">
                  01
                </span>
                <span>
                  First Mile to Metro ({fmMode === 'cab' ? 'Cab' : fmMode === 'auto' ? 'Auto' : fmMode === 'walk' ? 'Walk' : 'E-Rickshaw'})
                </span>
              </div>
              <div className="text-right">
                <span className="font-extrabold text-[#17201B]">
                  {firstMileCost === 0 ? 'Free' : `₹${firstMileCost}`}
                </span>
                <span className="text-[10px] text-[#6B7267] ml-1.5 font-medium">(~{firstMileDuration}m)</span>
              </div>
            </div>

            {/* Leg 2 */}
            <div className="flex items-center justify-between py-1 border-b border-[#EAECE4]">
              <div className="flex items-center gap-2 text-[#53584E]">
                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-800 font-mono font-bold text-[10px]">
                  02
                </span>
                <span>
                  Metro Fare (₹{metroFarePerPerson} × {pax} {pax === 1 ? 'person' : 'passengers'})
                </span>
              </div>
              <div className="text-right">
                <span className="font-extrabold text-[#17201B]">₹{metroTotalCost}</span>
                <span className="text-[10px] text-[#6B7267] ml-1.5 font-medium">(~{metroDuration}m)</span>
              </div>
            </div>

            {/* Leg 3 */}
            <div className="flex items-center justify-between py-1 border-b border-[#EAECE4]">
              <div className="flex items-center gap-2 text-[#53584E]">
                <span className="px-1.5 py-0.5 rounded bg-[#B9552C]/10 text-[#B9552C] font-mono font-bold text-[10px]">
                  03
                </span>
                <span>
                  Last Mile to Destination ({lmMode === 'cab' ? 'Cab' : lmMode === 'auto' ? 'Auto' : lmMode === 'walk' ? 'Walk' : 'E-Rickshaw'})
                </span>
              </div>
              <div className="text-right">
                <span className="font-extrabold text-[#17201B]">
                  {lastMileCost === 0 ? 'Free' : `₹${lastMileCost}`}
                </span>
                <span className="text-[10px] text-[#6B7267] ml-1.5 font-medium">(~{lastMileDuration}m)</span>
              </div>
            </div>

            {/* Total Row */}
            <div className="flex items-center justify-between pt-1 font-black text-sm text-[#143428]">
              <span>Grand Total Multi-Modal</span>
              <div className="text-right">
                <span className="text-base text-emerald-700">₹{totalTripFare}</span>
                <span className="text-xs text-[#53584E] ml-2 font-bold">~{totalTripDuration} mins</span>
              </div>
            </div>

            {/* Accuracy Note */}
            <div className="text-[10px] text-[#6B7267] bg-[#F4F5F0] p-2 rounded-lg flex items-start gap-1.5">
              <span className="shrink-0 text-emerald-700 font-bold">⏱️</span>
              <span>
                Accurate travel times include live Google Maps road traffic + 15m urban transit buffers (cab dispatch, station security scan & platform wait).
              </span>
            </div>

            {/* Direct Cab comparison banner */}
            <div className="mt-2 p-3 rounded-xl bg-white border border-[#D9DFD5] flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] font-black text-[#17201B] flex items-center gap-1">
                  <span>Direct Cab (No Metro):</span>
                  <span className="text-amber-800 font-extrabold">~₹{directCab.estimatedCostInr}</span>
                  <span className="text-[#6B7267] font-normal">({directCab.durationMin}m in traffic)</span>
                </div>
                <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                  <TrendingDown className="w-3 h-3 text-emerald-600" />
                  <span>
                    Metro saves ~₹{Math.max(0, directCab.estimatedCostInr - totalTripFare)} & skips traffic!
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Action CTAs */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onSwitchToMap}
          className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-[#143428] text-white font-bold text-sm shadow-md active:scale-[0.98] transition hover:bg-[#1C4535]"
        >
          <Map className="w-4 h-4 text-[#5ee9b5]" strokeWidth={2.2} />
          <span>See on Map</span>
        </button>

        <button
          type="button"
          onClick={handleCopyRoute}
          className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-white border border-[#D5D8CD] text-[#17201B] font-bold text-sm shadow-xs active:scale-[0.98] transition hover:bg-[#F8F9F5]"
        >
          {copiedText ? (
            <>
              <Check className="w-4 h-4 text-emerald-600 font-black" strokeWidth={2.5} />
              <span className="text-emerald-700">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-[#6B7267]" strokeWidth={2} />
              <span>Copy Steps</span>
            </>
          )}
        </button>
      </div>

      {/* STAGE 1: First Mile Leg */}
      <div className="rounded-2xl bg-white border border-[#E2E4DC] p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#E2E4DC]">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-lg bg-[#143428] text-white font-mono font-extrabold text-xs">
              01
            </span>
            <div>
              <span className="text-[10px] font-bold text-[#6B7267] uppercase tracking-wider block">
                First Mile Leg
              </span>
              <h3 className="font-black text-base text-[#17201B]">
                Go to {plan.originStation.name} Metro
              </h3>
            </div>
          </div>

          <span className="px-3 py-1 rounded-xl bg-[#F8F9F5] border border-[#E2E4DC] text-[#143428] text-xs font-bold shrink-0">
            {plan.firstMile.distanceKm} km
          </span>
        </div>

        {/* Mode Selector for First Mile */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-black text-[#53584E]">Choose First-Mile Ride Mode:</div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleFmChange('cab')}
              className={`p-2.5 rounded-xl border text-left transition active:scale-95 ${
                fmMode === 'cab'
                  ? 'bg-[#143428] text-white border-[#143428] shadow-xs'
                  : 'bg-[#F8F9F5] text-[#17201B] border-[#E2E4DC] hover:border-[#143428]/40'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span className="flex items-center gap-1">🚕 Cab</span>
                <span>₹{fmOptions.cab}</span>
              </div>
              <div className={`text-[10px] mt-0.5 ${fmMode === 'cab' ? 'text-emerald-200' : 'text-[#6B7267]'}`}>
                Uber Go / Ola
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleFmChange('auto')}
              className={`p-2.5 rounded-xl border text-left transition active:scale-95 ${
                fmMode === 'auto'
                  ? 'bg-[#143428] text-white border-[#143428] shadow-xs'
                  : 'bg-[#F8F9F5] text-[#17201B] border-[#E2E4DC] hover:border-[#143428]/40'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span className="flex items-center gap-1">🛺 Auto</span>
                <span>₹{fmOptions.auto}</span>
              </div>
              <div className={`text-[10px] mt-0.5 ${fmMode === 'auto' ? 'text-emerald-200' : 'text-[#6B7267]'}`}>
                Uber/Rapido
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleFmChange('walk')}
              className={`p-2.5 rounded-xl border text-left transition active:scale-95 ${
                fmMode === 'walk'
                  ? 'bg-[#143428] text-white border-[#143428] shadow-xs'
                  : 'bg-[#F8F9F5] text-[#17201B] border-[#E2E4DC] hover:border-[#143428]/40'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span className="flex items-center gap-1">🚶 Walk</span>
                <span>Free</span>
              </div>
              <div className={`text-[10px] mt-0.5 ${fmMode === 'walk' ? 'text-emerald-200' : 'text-[#6B7267]'}`}>
                ~{Math.round(plan.firstMile.distanceKm * 12)}m walk
              </div>
            </button>
          </div>
        </div>

        {/* Ride Booking Buttons (Uber & Rapido) */}
        {fmMode !== 'walk' && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <a
              href={uberFmLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800 transition active:scale-98 shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              <span>Book on Uber</span>
            </a>

            <button
              type="button"
              onClick={openRapidoApp}
              className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-amber-400 text-amber-950 text-xs font-black hover:bg-amber-300 transition active:scale-98 shadow-xs cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-900" />
              <span>Book on Rapido</span>
            </button>
          </div>
        )}

        <p className="text-xs text-[#53584E] leading-relaxed">
          {plan.firstMile.instructions}
        </p>

        <div className="p-3 rounded-xl bg-[#F8F9F5] text-xs text-[#53584E] flex items-start gap-2.5">
          <VolumeX className="w-4 h-4 text-[#143428] shrink-0 mt-0.5" />
          <div>
            <strong className="text-[#17201B]">Introvert Tip: </strong>
            {plan.firstMile.antiAnxietyTip}
          </div>
        </div>
      </div>

      {/* STAGE 2: Metro Transit */}
      <div className="rounded-2xl bg-white border border-[#E2E4DC] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#E2E4DC]">
          <div className="flex items-center gap-2.5">
            <span
              className="px-2.5 py-1 rounded-lg text-white font-mono font-extrabold text-xs"
              style={{ backgroundColor: plan.originStation.lineColor }}
            >
              02
            </span>
            <div>
              <span className="text-[10px] font-bold text-[#6B7267] uppercase tracking-wider block">
                Metro Transit
              </span>
              <h3 className="font-black text-base text-[#17201B]">
                Board at {plan.originStation.name}
              </h3>
            </div>
          </div>

          <span
            className="px-3 py-1 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow-xs shrink-0"
            style={{ backgroundColor: plan.originStation.lineColor }}
          >
            <TrainFront className="w-3.5 h-3.5" />
            <span>{plan.originStation.line} Line</span>
          </span>
        </div>

        {/* Fare info pill */}
        <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E2E4DC] text-xs flex items-center justify-between">
          <span className="text-[#53584E]">
            Metro Fare ({pax} {pax === 1 ? 'person' : 'people'}):
          </span>
          <span className="font-mono font-extrabold text-[#143428]">
            ₹{metroFarePerPerson} × {pax} = ₹{metroTotalCost}
          </span>
        </div>

        {/* Metro Legs & Direction */}
        <div className="space-y-3">
          {plan.metroLeg.lines.map((leg, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="font-bold flex items-center gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: leg.lineColor }}
                  />
                  <span className="truncate">{leg.from}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#8E9487] shrink-0" />
                  <span className="truncate">{leg.to}</span>
                </div>
                <span className="text-xs font-bold text-[#143428] bg-[#143428]/10 px-2 py-0.5 rounded-lg shrink-0">
                  ~{leg.stopsCount} {leg.stopsCount === 1 ? 'stop' : 'stops'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#F8F9F5] text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[#53584E]">
                  <Signpost className="w-3.5 h-3.5 text-[#143428]" />
                  <span className="font-bold text-[#17201B]">Look for signage:</span>
                </div>
                <span className="font-mono font-bold text-[#143428] bg-white px-2.5 py-0.5 rounded-md border border-[#E2E4DC] text-xs">
                  {leg.direction}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Interchange Alert */}
        {plan.metroLeg.requiresTransfer && (
          <div className="p-3.5 rounded-xl bg-[#FAF2EE] text-xs space-y-1.5 border-l-4 border-[#B9552C]">
            <div className="font-bold flex items-center gap-1.5 text-[#B9552C] text-sm">
              <GitCommitVertical className="w-4 h-4" />
              <span>Interchange at {plan.metroLeg.transferStation?.name}</span>
            </div>
            <p className="text-[#53584E] leading-relaxed">
              {plan.metroLeg.transferInstruction}
            </p>
          </div>
        )}

        {/* Live Platform Departures Board */}
        <div className="pt-2 border-t border-[#F0F2EB]">
          <LiveStationDepartures
            stationId={plan.originStation.id}
            stationName={plan.originStation.name}
            lineColor={plan.originStation.lineColor}
          />
        </div>
      </div>

      {/* STAGE 3: Crucial Exit Gate (High Priority Highlight) */}
      <div className="rounded-2xl bg-gradient-to-b from-white to-[#FAF6F3] border-2 border-[#E8C2B3] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#E8C2B3]/60">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-lg bg-[#B9552C] text-white font-mono font-extrabold text-xs">
              03
            </span>
            <div>
              <span className="text-[10px] font-bold text-[#B9552C] uppercase tracking-wider block">
                Crucial Exit
              </span>
              <h3 className="font-black text-base text-[#17201B]">
                Deboard at {plan.destinationStation.name}
              </h3>
            </div>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-[#B9552C] text-white text-xs font-black shadow-xs flex items-center gap-1.5 shrink-0">
            <DoorOpen className="w-4 h-4" />
            <span>EXIT GATE {plan.metroExit.gateNumber}</span>
          </div>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#B9552C]">Gate {plan.metroExit.gateNumber} leads to:</span>
            <span className="font-bold bg-[#FAF2EE] px-2.5 py-1 rounded-md border border-[#E8C2B3] text-[#17201B]">
              {plan.metroExit.leadsTo}
            </span>
          </div>

          <div className="text-[#53584E] leading-relaxed flex items-start gap-2 pt-1">
            <Eye className="w-4 h-4 text-[#B9552C] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#17201B]">Zero-asking tip: </strong>
              {plan.metroExit.signageTip} Once past turnstiles, follow overhead green signs for Gate {plan.metroExit.gateNumber}.
            </div>
          </div>
        </div>
      </div>

      {/* STAGE 4: Final Mile Leg */}
      <div className="rounded-2xl bg-white border border-[#E2E4DC] p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#E2E4DC]">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-lg bg-[#143428] text-white font-mono font-extrabold text-xs">
              04
            </span>
            <div>
              <span className="text-[10px] font-bold text-[#6B7267] uppercase tracking-wider block">
                Final Leg
              </span>
              <h3 className="font-black text-base text-[#17201B]">
                Reach {plan.destination.name.split(',')[0]}
              </h3>
            </div>
          </div>

          <span className="px-3 py-1 rounded-xl bg-[#F8F9F5] border border-[#E2E4DC] text-[#143428] text-xs font-bold shrink-0">
            {plan.lastMile.distanceKm} km
          </span>
        </div>

        {/* Mode Selector for Last Mile */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-black text-[#53584E]">Choose Last-Mile Ride Mode:</div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleLmChange('cab')}
              className={`p-2.5 rounded-xl border text-left transition active:scale-95 ${
                lmMode === 'cab'
                  ? 'bg-[#143428] text-white border-[#143428] shadow-xs'
                  : 'bg-[#F8F9F5] text-[#17201B] border-[#E2E4DC] hover:border-[#143428]/40'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span className="flex items-center gap-1">🚕 Cab</span>
                <span>₹{lmOptions.cab}</span>
              </div>
              <div className={`text-[10px] mt-0.5 ${lmMode === 'cab' ? 'text-emerald-200' : 'text-[#6B7267]'}`}>
                Uber Go / Ola
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleLmChange('auto')}
              className={`p-2.5 rounded-xl border text-left transition active:scale-95 ${
                lmMode === 'auto'
                  ? 'bg-[#143428] text-white border-[#143428] shadow-xs'
                  : 'bg-[#F8F9F5] text-[#17201B] border-[#E2E4DC] hover:border-[#143428]/40'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span className="flex items-center gap-1">🛺 Auto</span>
                <span>₹{lmOptions.auto}</span>
              </div>
              <div className={`text-[10px] mt-0.5 ${lmMode === 'auto' ? 'text-emerald-200' : 'text-[#6B7267]'}`}>
                Uber/Rapido
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleLmChange('walk')}
              className={`p-2.5 rounded-xl border text-left transition active:scale-95 ${
                lmMode === 'walk'
                  ? 'bg-[#143428] text-white border-[#143428] shadow-xs'
                  : 'bg-[#F8F9F5] text-[#17201B] border-[#E2E4DC] hover:border-[#143428]/40'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span className="flex items-center gap-1">🚶 Walk</span>
                <span>Free</span>
              </div>
              <div className={`text-[10px] mt-0.5 ${lmMode === 'walk' ? 'text-emerald-200' : 'text-[#6B7267]'}`}>
                ~{Math.round(plan.lastMile.distanceKm * 12)}m walk
              </div>
            </button>
          </div>
        </div>

        {/* Uber & Rapido Buttons */}
        {lmMode !== 'walk' && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <a
              href={uberLmLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800 transition active:scale-98 shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              <span>Book on Uber</span>
            </a>

            <button
              type="button"
              onClick={openRapidoApp}
              className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-amber-400 text-amber-950 text-xs font-black hover:bg-amber-300 transition active:scale-98 shadow-xs cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-900" />
              <span>Book on Rapido</span>
            </button>
          </div>
        )}

        <p className="text-xs text-[#53584E] leading-relaxed">
          {plan.lastMile.exactInstructions}
        </p>

        {/* Zero-speaking driver phrase */}
        <div className="pt-2 border-t border-[#F0F2EB] space-y-2">
          <div className="text-xs font-bold text-[#17201B] flex items-center gap-1.5">
            <MessageSquareCode className="w-3.5 h-3.5 text-[#143428]" />
            <span>Driver Phrase (Tap to copy):</span>
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(`भैया, ${plan.destination.name.split(',')[0]} ड्रॉप पॉइंट पे उतार देना।`);
            }}
            className="w-full p-3 rounded-xl bg-[#F8F9F5] hover:bg-[#EAECE4] text-left transition"
          >
            <div className="text-xs font-bold text-[#17201B]">
              &quot;Bhaiya, {plan.destination.name.split(',')[0]} drop point pe utaar dena.&quot;
            </div>
            <div className="text-[11px] text-[#6B7267] mt-0.5">
              Brother, please drop at the entrance.
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Switch Destination Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onChangeDestination}
          className="w-full p-4 rounded-2xl bg-white border border-[#D5D8CD] text-[#143428] font-black text-sm text-center hover:bg-[#F8F9F5] shadow-xs active:scale-[0.99] transition"
        >
          Plan Another Route
        </button>
      </div>
    </div>
  );
}
