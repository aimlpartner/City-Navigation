'use client';

import React, { useState } from 'react';
import { MultiModalTripPlan } from '@/lib/delhi-ncr-transit';
import { LiveStationDepartures } from '@/components/LiveStationDepartures';
import { ACTIVE_TRANSIT_ALERTS, getConnectingBusesForStation } from '@/lib/realtime-transit';
import { openRapidoApp } from '@/lib/utils';
import {
  TrainFront,
  DoorOpen,
  CarTaxiFront,
  BusFront,
  Footprints,
  Navigation,
  PersonStanding,
  Route,
  Milestone,
  MapPinned,
  Headphones,
  BadgeCheck,
  IndianRupee,
  Timer,
  MessageSquareCode,
  Flame,
  Sparkle,
  Signpost,
  ArrowRight,
  ArrowUpRight,
  Copy,
  Check,
  Zap,
  AlertCircle,
  VolumeX,
  Eye,
  GitCommitVertical,
  Radar,
  Users,
  ExternalLink,
  Ticket,
  QrCode,
  MessageSquare,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { RideMode, TravelModeChoice } from '@/lib/delhi-ncr-transit';
import { MetroTicketModal } from './GoTab/MetroTicketModal';
import { ActiveTicketPassModal } from './GoTab/ActiveTicketPassModal';
import { useActiveMetroTicket } from '@/hooks/useActiveMetroTicket';
import { calculateTicketPricing, getDmrcWhatsAppUrl } from '@/lib/metro-ticketing';
import { LiveStageAlertBanner } from '@/components/LiveStageAlertBanner';
import type { StageNavigationState } from '@/hooks/useStageNavigationNotifier';

interface IntrovertGuideCardProps {
  plan: MultiModalTripPlan;
  travelMode?: TravelModeChoice;
  onTravelModeChange?: (mode: TravelModeChoice) => void;
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
    googleMapsUrl?: string;
  };
  aiGuide: {
    loading: boolean;
    text: string | null;
    error: string | null;
    links: { title: string; uri: string; source?: string }[];
  };
  onRequestAiRefresh?: () => void;
  onOpenTransitRadar?: () => void;
  stageNav?: StageNavigationState;
}

export function IntrovertGuideCard({
  plan,
  travelMode,
  onTravelModeChange,
  passengerCount,
  onPassengerCountChange,
  firstMileMode,
  onFirstMileModeChange,
  lastMileMode,
  onLastMileModeChange,
  deepLinks,
  aiGuide,
  onRequestAiRefresh,
  onOpenTransitRadar,
  stageNav
}: IntrovertGuideCardProps) {
  const [copiedText, setCopiedText] = useState(false);
  const [isPlatformBoardOpen, setIsPlatformBoardOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isActivePassModalOpen, setIsActivePassModalOpen] = useState(false);
  const { activeTicket, markUsed } = useActiveMetroTicket();

  const routeAlerts = ACTIVE_TRANSIT_ALERTS.filter(
    alert =>
      alert.affectedStations?.includes(plan.originStation.id) ||
      alert.affectedStations?.includes(plan.destinationStation.id) ||
      alert.affectedLines.includes(plan.originStation.line) ||
      alert.affectedLines.includes(plan.destinationStation.line)
  );

  const destinationConnectingBuses = getConnectingBusesForStation(plan.destinationStation.id);
  const currentPax = passengerCount || plan.fareBreakdown?.passengerCount || 1;
  const metroFarePerPerson = plan.fareBreakdown?.metroFarePerPersonInr || plan.metroLeg.estimatedFareInr || 40;
  const ticketPricing = calculateTicketPricing(metroFarePerPerson, currentPax);
  const activeTravelMode: TravelModeChoice = travelMode || plan.travelMode || 'multimodal';
  const isDirectRoadMode = activeTravelMode === 'driving' || activeTravelMode === 'walking';
  const directDistKm =
    plan.liveTraffic?.directDistanceKm ||
    Math.max(0.4, Number((plan.firstMile.distanceKm + plan.lastMile.distanceKm).toFixed(1)));
  const directCabDuration = plan.fareBreakdown?.directCabComparison?.durationMin || 25;
  const directDurationMin =
    activeTravelMode === 'walking'
      ? (plan.travelMode === 'walking' ? plan.liveTraffic?.totalDurationMin : undefined) || Math.max(3, Math.round(directDistKm * 12))
      : plan.liveTraffic?.directCabDurationMin || directCabDuration;
  const directCabCost = plan.fareBreakdown?.directCabComparison?.estimatedCostInr || Math.round(directDistKm * 18 + 60);
  const googleMapsUrl =
    deepLinks?.googleMapsUrl ||
    `https://www.google.com/maps/dir/?api=1&origin=${plan.origin.lat},${plan.origin.lng}&destination=${plan.destination.lat},${plan.destination.lng}&travelmode=${
      activeTravelMode === 'driving' ? 'driving' : activeTravelMode === 'walking' ? 'walking' : 'transit'
    }`;
  const uberDirectLink =
    deepLinks?.uberDirectUrl ||
    `https://m.uber.com/ul/?action=setPickup&client_id=metronav&pickup[latitude]=${plan.origin.lat}&pickup[longitude]=${plan.origin.lng}&dropoff[latitude]=${plan.destination.lat}&dropoff[longitude]=${plan.destination.lng}`;

  const handleCopySummary = () => {
    const summary = isDirectRoadMode
      ? `📍 ${activeTravelMode === 'walking' ? 'Walking' : 'Driving'} Route to ${plan.destination.name}:
From: ${plan.origin.name}
Distance: ~${directDistKm} km • Time: ~${directDurationMin} mins${
          activeTravelMode === 'driving' ? ` • Est. Cab Fare: ~₹${directCabCost}` : ''
        }
${(plan.directSteps || []).slice(0, 6).map((s, i) => `${i + 1}. ${s.instruction} (${s.distanceText})`).join('\n')}
Google Maps: ${googleMapsUrl}`
      : `📍 Route to ${plan.destination.name}:
1. Start at ${plan.origin.name} -> Head to ${plan.originStation.name} (${plan.firstMile.mode === 'walk' ? 'Walk' : 'Auto/Cab ~₹' + plan.firstMile.estimatedCostInr})
2. Metro: Board ${plan.originStation.line} at ${plan.originStation.name}
${plan.metroLeg.requiresTransfer ? `   Change at ${plan.metroLeg.transferStation?.name} without exiting gates\n` : ''}3. Deboard: ${plan.destinationStation.name} -> EXIT GATE ${plan.metroExit.gateNumber}
4. Last Mile: ${plan.lastMile.options[0]?.description || 'Auto to destination'} (~₹${plan.lastMile.options[0]?.estimatedCostInr || 90})
(Generated via MetroNav Delhi-NCR)`;

    navigator.clipboard.writeText(summary);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Mode Switcher Bar (Google Maps style) */}
      {onTravelModeChange && (
        <div className="grid grid-cols-4 gap-2 p-1.5 rounded-2xl bg-white dark:bg-[#0D1813] border border-[#E2E4DC] dark:border-white/10 shadow-xs">
          {([
            { id: 'multimodal', label: 'Metro + Ride', Icon: TrainFront },
            { id: 'transit', label: 'Public Transit', Icon: BusFront },
            { id: 'driving', label: 'Cab / Car', Icon: CarTaxiFront },
            { id: 'walking', label: 'Walk', Icon: Footprints },
          ] as const).map(({ id, label, Icon }) => {
            const active = activeTravelMode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onTravelModeChange(id)}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#143428] dark:bg-emerald-500 text-white dark:text-[#061C12] shadow-xs'
                    : 'text-[#53584E] dark:text-[#A7B2A8] hover:bg-[#F4F5F0] dark:hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Direct Road Recommendation Banner for short hops */}
      {plan.isDirectRoadRecommended && !isDirectRoadMode && onTravelModeChange && (
        <div className="p-4 rounded-2xl bg-[#FAF2EE] dark:bg-[#2A160E] border border-[#E8C2B3] dark:border-[#B9552C]/40 flex items-center justify-between gap-4 text-xs">
          <div>
            <div className="font-black text-[#B9552C] dark:text-[#FF7A45] text-sm">
              Direct Cab or Walk is faster for this {directDistKm} km trip
            </div>
            <div className="text-[#53584E] dark:text-[#D1DDD6] mt-0.5">
              Door-to-door direct route takes ~{directDurationMin} mins with no station detours.
            </div>
          </div>
          <button
            type="button"
            onClick={() => onTravelModeChange(directDistKm <= 1.2 ? 'walking' : 'driving')}
            className="px-4 py-2 rounded-xl bg-[#B9552C] text-white font-black shrink-0 cursor-pointer hover:bg-[#a14621]"
          >
            {directDistKm <= 1.2 ? 'Switch to Walk' : 'Switch to Cab / Car'}
          </button>
        </div>
      )}

      {/* Editorial British Racing Green Hero Summary Banner */}
      <div className="rounded-[28px] bg-[#143428] text-white p-5 sm:p-8 border border-[#1E4837] shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-[11px] sm:text-xs font-semibold mb-2 border border-white/15">
              <Headphones className="w-3.5 h-3.5 text-emerald-300 shrink-0" strokeWidth={1.75} />
              <span>
                {activeTravelMode === 'driving'
                  ? 'Live Google Driving Route'
                  : activeTravelMode === 'walking'
                  ? 'Google Walking Directions'
                  : activeTravelMode === 'transit'
                  ? 'Live Google Public Transit Route'
                  : 'Introvert Confident Transit Plan'}
              </span>
              <BadgeCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={2} />
            </div>
            <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white font-sans leading-tight">
              To {plan.destination.name}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-1">
              Departing from <span className="text-white font-semibold">{plan.origin.name}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-tactile flex items-center gap-1.5 px-4 py-2 sm:py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#061C12] text-xs font-extrabold transition shadow-xs cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
              <span>Google Maps</span>
            </a>

            <button
              onClick={handleCopySummary}
              className="btn-tactile flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs text-white transition shrink-0 font-medium shadow-xs cursor-pointer"
              title="Copy route steps to notes"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" strokeWidth={2} />
                  <span className="text-emerald-300 font-bold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-emerald-200" strokeWidth={1.75} />
                  <span>Copy Summary</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Stats Strip in Muted Pine */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-5 pt-4 border-t border-white/10 text-center relative z-10">
          <div className="bg-[#1A3E31]/85 rounded-[16px] p-2.5 sm:p-4 border border-[#235241]">
            <div className="text-[10px] sm:text-[11px] text-emerald-200/80 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
              <Timer className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-300 shrink-0" strokeWidth={1.75} />
              <span className="truncate">Est. Duration</span>
            </div>
            <div className="text-sm sm:text-xl font-extrabold text-white mt-1 tabular-nums flex items-center justify-center gap-0.5">
              <span>
                ~{isDirectRoadMode
                  ? directDurationMin
                  : plan.liveTraffic?.totalDurationMin ||
                    plan.firstMile.durationMin + plan.metroLeg.totalDurationMin + (plan.lastMile.options[0]?.durationMin || 5)}{' '}
                min
              </span>
            </div>
            {plan.liveTraffic?.trafficCondition === 'heavy' ? (
              <div className="text-[9px] text-rose-300 font-bold mt-0.5 flex items-center justify-center gap-1">
                <Flame className="w-2.5 h-2.5 text-rose-400" />
                <span>Heavy Traffic (+{plan.liveTraffic.firstMileDelayMin + plan.liveTraffic.lastMileDelayMin}m)</span>
              </div>
            ) : (
              <div className="text-[9px] text-emerald-300/80 font-bold mt-0.5 flex items-center justify-center gap-1">
                <Zap className="w-2.5 h-2.5 text-emerald-300" />
                <span>Live Google Traffic</span>
              </div>
            )}
          </div>

          <div className="bg-[#1A3E31]/85 rounded-[16px] p-2.5 sm:p-4 border border-amber-400/30">
            <div className="text-[10px] sm:text-[11px] text-amber-200 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
              <IndianRupee className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-300 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{activeTravelMode === 'walking' ? 'Trip Cost' : activeTravelMode === 'driving' ? 'Cab Est.' : 'Total Trip Fare'}</span>
            </div>
            <div className="text-sm sm:text-xl font-extrabold text-amber-200 mt-1 tabular-nums">
              {activeTravelMode === 'walking'
                ? 'Free'
                : activeTravelMode === 'driving'
                ? `₹${directCabCost}`
                : `₹${plan.fareBreakdown?.totalEstimatedFareInr || plan.firstMile.estimatedCostInr + plan.metroLeg.estimatedFareInr + (plan.lastMile.options[0]?.estimatedCostInr || 90)}`}
            </div>
            <div className="text-[9px] text-amber-100/70 font-medium mt-0.5 truncate">
              {isDirectRoadMode
                ? `${directDistKm} km door-to-door`
                : `Cab/Auto + Metro (${plan.fareBreakdown?.passengerCount || 1} pax)`}
            </div>
          </div>

          <div className="bg-[#1A3E31]/85 rounded-[16px] p-2.5 sm:p-4 border border-[#B9552C]/40">
            <div className="text-[10px] sm:text-[11px] text-[#F3A585] font-bold uppercase tracking-wider flex items-center justify-center gap-1">
              {isDirectRoadMode ? (
                <Navigation className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#F3A585] shrink-0" strokeWidth={1.75} />
              ) : (
                <DoorOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#F3A585] shrink-0" strokeWidth={1.75} />
              )}
              <span className="truncate">{isDirectRoadMode ? 'Distance' : 'Deboard Exit'}</span>
            </div>
            <div className="text-sm sm:text-xl font-extrabold text-white mt-1 flex items-center justify-center">
              <span className="px-2.5 py-0.5 rounded-full bg-[#B9552C] text-white text-[11px] sm:text-sm font-bold shadow-xs">
                {isDirectRoadMode ? `${directDistKm} km` : `Gate ${plan.metroExit.gateNumber}`}
              </span>
            </div>
            <div className="text-[9px] text-[#F3A585]/80 font-medium mt-0.5 truncate">
              {isDirectRoadMode ? plan.liveTraffic?.summaryRoad || 'Google Maps road' : 'Direct street exit'}
            </div>
          </div>
        </div>

        {/* Transparent Fare Breakdown Strip */}
        <div className="mt-3 p-3 rounded-[14px] bg-white/10 border border-white/15 text-xs text-emerald-100 flex flex-wrap items-center justify-between gap-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">Itemized:</span>
            <span>First-mile ~₹{plan.fareBreakdown?.firstMileCostInr || plan.firstMile.estimatedCostInr}</span>
            <span>+</span>
            <span>Metro ~₹{plan.fareBreakdown?.metroTotalFareInr || plan.metroLeg.estimatedFareInr}</span>
            <span>+</span>
            <span>Last-mile ~₹{plan.fareBreakdown?.lastMileCostInr || plan.lastMile.options[0]?.estimatedCostInr || 90}</span>
          </div>
          {plan.fareBreakdown?.directCabComparison && (
            <div className="text-[11px] text-amber-200 font-bold">
              Direct Cab: ~₹{plan.fareBreakdown.directCabComparison.estimatedCostInr} ({plan.fareBreakdown.directCabComparison.durationMin}m)
            </div>
          )}
        </div>

        {/* Live Service Alerts & Status Banner */}
        {routeAlerts.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-white/10 space-y-2 relative z-10">
            {routeAlerts.slice(0, 1).map(alert => (
              <div
                key={alert.id}
                className="p-2.5 sm:p-3 rounded-[12px] bg-amber-500/15 border border-amber-400/30 text-xs text-amber-100 flex items-center justify-between gap-2.5 overflow-hidden"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Flame className="w-4 h-4 text-amber-300 shrink-0" strokeWidth={1.75} />
                  <span className="font-medium leading-relaxed truncate">
                    <strong className="text-amber-200 font-bold">Live Advisory:</strong> {alert.title} — {alert.impact}
                  </span>
                </div>

                {onOpenTransitRadar && (
                  <button
                    onClick={onOpenTransitRadar}
                    className="px-2.5 py-1 rounded-full bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/30 font-bold shrink-0 text-[11px] whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Radar className="w-3 h-3 text-amber-300 shrink-0" strokeWidth={1.75} />
                    <span>Radar</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Stage Notifications Banner (Google Maps Style) */}
      <LiveStageAlertBanner stageNav={stageNav} />

      {isDirectRoadMode ? (
        <div className="space-y-5">
          {activeTravelMode === 'driving' && (
            <div className="rounded-2xl bg-white dark:bg-[#111A15] border border-[#E2E4DC] dark:border-white/10 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-base text-[#17201B] dark:text-[#F3F5EE]">Direct Door-to-Door Cab / Auto</h3>
                <p className="text-xs text-[#6B7267] dark:text-[#9BAAA0] mt-0.5">
                  Estimated fare ~₹{directCabCost} • {directDistKm} km • ~{directDurationMin} mins with live traffic
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={uberDirectLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-tactile inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800 border border-white/15 shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Book on Uber</span>
                </a>
                <button
                  type="button"
                  onClick={openRapidoApp}
                  className="btn-tactile inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-400 text-amber-950 text-xs font-black hover:bg-amber-300 shadow-xs cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-amber-900" />
                  <span>Book on Rapido</span>
                </button>
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-white dark:bg-[#111A15] border border-[#E2E4DC] dark:border-white/10 p-6 sm:p-7 space-y-4 shadow-xs">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E2E4DC] dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <Navigation className="w-5 h-5 text-[#143428] dark:text-[#5ee9b5]" />
                <div>
                  <h3 className="font-extrabold text-base text-[#17201B] dark:text-[#F3F5EE]">
                    Turn-by-Turn {activeTravelMode === 'walking' ? 'Walking' : 'Driving'} Directions
                  </h3>
                  <p className="text-xs text-[#6B7267] dark:text-[#9BAAA0]">
                    {plan.liveTraffic?.summaryRoad ? `Main corridor: ${plan.liveTraffic.summaryRoad}` : 'Live Google Maps route'}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#143428]/10 dark:bg-emerald-500/20 text-[#143428] dark:text-[#5ee9b5] text-xs font-bold">
                {directDistKm} km
              </span>
            </div>

            {plan.directSteps && plan.directSteps.length > 0 ? (
              <div className="divide-y divide-[#EAECE4] dark:divide-white/10">
                {plan.directSteps.map((step, idx) => (
                  <div key={idx} className="py-3 flex items-start justify-between gap-4 text-xs sm:text-sm">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#143428]/10 dark:bg-emerald-500/20 text-[#143428] dark:text-[#5ee9b5] font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-[#17201B] dark:text-[#F3F5EE] font-medium leading-relaxed">{step.instruction}</span>
                    </div>
                    <span className="text-xs font-bold text-[#6B7267] dark:text-[#9BAAA0] shrink-0 whitespace-nowrap">
                      {step.distanceText} ({step.durationText})
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#53584E] dark:text-[#D1DDD6]">
                Direct path from {plan.origin.name} to {plan.destination.name} ({directDistKm} km, ~{directDurationMin} mins). Click &quot;Google Maps&quot; above for full turn-by-turn guidance.
              </p>
            )}
          </div>
        </div>
      ) : activeTravelMode === 'transit' && plan.transitSteps && plan.transitSteps.length > 0 ? (
        <div className="space-y-5">
          <div className="rounded-2xl bg-white dark:bg-[#111A15] border border-[#E2E4DC] dark:border-white/10 p-6 sm:p-7 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E4DC] dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <BusFront className="w-5 h-5 text-[#143428] dark:text-[#5ee9b5]" />
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-[#17201B] dark:text-[#F3F5EE]">
                    Live Google Public Transit Sequence
                  </h3>
                  <p className="text-xs text-[#6B7267] dark:text-[#9BAAA0]">
                    Includes DMRC Metro, Rapid Metro Gurgaon, Noida Aqua Line, and City Buses
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#143428]/10 dark:bg-emerald-500/20 text-[#143428] dark:text-[#5ee9b5]">
                {plan.transitSteps.length} legs
              </span>
            </div>

            <div className="space-y-3">
              {plan.transitSteps.map((step, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[#F8F9F5] dark:bg-[#16231D] border border-[#E2E4DC] dark:border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 font-extrabold text-sm text-[#17201B] dark:text-[#F3F5EE]">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: step.mode === 'TRANSIT' ? step.lineColor || '#0284c7' : '#6B7267' }}
                      />
                      <span>
                        {step.mode === 'TRANSIT'
                          ? step.lineName || step.vehicleType || 'Transit'
                          : 'Walk'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-[#6B7267] dark:text-[#9BAAA0]">
                      {step.durationText} • {step.distanceText}
                    </span>
                  </div>
                  {step.mode === 'TRANSIT' && step.from && step.to ? (
                    <div className="text-xs text-[#53584E] dark:text-[#D1DDD6] pl-5 space-y-0.5">
                      <div className="font-bold text-[#17201B] dark:text-[#F3F5EE]">
                        Board {step.from} ➔ Deboard {step.to}
                        {step.stopsCount ? ` (${step.stopsCount} stops)` : ''}
                      </div>
                      {step.headsign && <div>Platform direction: Towards {step.headsign}</div>}
                    </div>
                  ) : (
                    <div className="text-xs text-[#53584E] dark:text-[#D1DDD6] pl-5">{step.instruction}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
      {/* Commuters / Passengers Control Bar */}
      <div className="p-4 rounded-[20px] bg-white dark:bg-[#111A15] border border-[#E2E4DC] dark:border-white/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[10px] bg-[#143428]/10 dark:bg-emerald-500/20 text-[#143428] dark:text-[#5ee9b5] flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-black text-[#17201B] dark:text-[#F3F5EE]">Commuters / Passengers</div>
            <div className="text-[11px] text-[#6B7267] dark:text-[#9BAAA0]">Metro tickets multiply per person; cab & auto fares are shared</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-[#F4F5F0] dark:bg-white/10 p-1 rounded-full self-start sm:self-auto">
          {[1, 2, 3, 4].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => onPassengerCountChange?.(num)}
              className={`chip-tactile px-3 py-1.5 rounded-full text-xs font-black cursor-pointer ${
                (passengerCount || plan.fareBreakdown?.passengerCount || 1) === num
                  ? 'bg-[#143428] dark:bg-emerald-500 text-white dark:text-[#061C12] shadow-xs'
                  : 'text-[#53584E] dark:text-[#A7B2A8] hover:text-[#17201B] dark:hover:text-white'
              }`}
            >
              {num} {num === 1 ? 'person' : 'people'}
            </button>
          ))}
        </div>
      </div>

      {/* Transit Journey Section Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#143428] text-white flex items-center justify-center shadow-xs">
            <Route className="w-4 h-4 text-emerald-300" strokeWidth={2} />
          </div>
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-[#17201B] dark:text-[#F3F5EE] font-sans">
              Step-by-Step Transit Track
            </h3>
            <p className="text-xs text-[#6B7267] dark:text-[#9BAAA0]">
              Exact boarding platforms, transfers, and deboard exit gates
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-[#143428] dark:text-[#5ee9b5] bg-[#143428]/10 dark:bg-emerald-500/20 px-2.5 py-1 rounded-full border border-[#143428]/20 dark:border-emerald-500/30 hidden sm:inline-flex">
          4 Connected Stages
        </span>
      </div>

      {/* STAGE 01: First Mile */}
      <div className="rounded-[24px] bg-white dark:bg-[#111A15] border border-[#E2E4DC] dark:border-white/10 p-5 sm:p-7 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E4DC] dark:border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center px-3 py-1 rounded-lg bg-[#143428] dark:bg-emerald-500 text-white dark:text-[#061C12] font-mono font-extrabold text-xs shadow-xs shrink-0 tracking-wider">
              STAGE 01
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-[#6B7267] dark:text-[#9BAAA0] uppercase tracking-wider block">
                First Mile Leg
              </span>
              <h4 className="font-bold text-base text-[#17201B] dark:text-[#F3F5EE] truncate">
                Head to {plan.originStation.name} Metro
              </h4>
            </div>
          </div>

          <span className="self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-[#F8F9F5] dark:bg-[#16231D] border border-[#E2E4DC] dark:border-white/10 text-[#17201B] dark:text-[#F3F5EE] text-xs font-bold flex items-center gap-2 shrink-0">
            {firstMileMode === 'walk' || plan.firstMile.mode === 'walk' ? (
              <>
                <PersonStanding className="w-4 h-4 text-[#143428] dark:text-[#5ee9b5]" strokeWidth={2} />
                <span>Walk ~{plan.firstMile.distanceKm} km</span>
              </>
            ) : (
              <>
                <CarTaxiFront className="w-4 h-4 text-[#B9552C] dark:text-[#FF7A45]" strokeWidth={2} />
                <span>{firstMileMode === 'cab' ? 'Cab' : 'Auto'} ~{plan.firstMile.distanceKm} km</span>
              </>
            )}
          </span>
        </div>

        {/* First-Mile Mode Selector Buttons */}
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-[#53584E] dark:text-[#A7B2A8]">Choose First-Mile Mode:</div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onFirstMileModeChange?.('cab')}
              className={`chip-tactile h-[68px] flex flex-col justify-between p-2.5 rounded-xl border text-left cursor-pointer ${
                (firstMileMode || plan.fareBreakdown?.firstMileMode) === 'cab'
                  ? 'bg-[#143428] dark:bg-[#1E4333] text-white dark:text-[#5ee9b5] border-[#143428] dark:border-[#38DF92] shadow-xs'
                  : 'bg-[#F8F9F5] dark:bg-[#16231D] text-[#17201B] dark:text-[#F3F5EE] border-[#E2E4DC] dark:border-white/10 hover:border-[#143428]/40 dark:hover:border-white/25 hover:bg-white dark:hover:bg-[#1C2C24]'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span className="flex items-center gap-1">🚕 Cab</span>
                <span>₹{plan.fareBreakdown?.firstMileOptions?.cab || 150}</span>
              </div>
              <div className={`text-[10px] mt-0.5 truncate ${(firstMileMode || plan.fareBreakdown?.firstMileMode) === 'cab' ? 'text-emerald-200 dark:text-[#5ee9b5]' : 'text-[#6B7267] dark:text-[#9CAEA3]'}`}>Uber Go / Ola</div>
            </button>

            <button
              type="button"
              onClick={() => onFirstMileModeChange?.('auto')}
              className={`chip-tactile h-[68px] flex flex-col justify-between p-2.5 rounded-xl border text-left cursor-pointer ${
                (firstMileMode || plan.fareBreakdown?.firstMileMode) === 'auto'
                  ? 'bg-[#143428] dark:bg-[#1E4333] text-white dark:text-[#5ee9b5] border-[#143428] dark:border-[#38DF92] shadow-xs'
                  : 'bg-[#F8F9F5] dark:bg-[#16231D] text-[#17201B] dark:text-[#F3F5EE] border-[#E2E4DC] dark:border-white/10 hover:border-[#143428]/40 dark:hover:border-white/25 hover:bg-white dark:hover:bg-[#1C2C24]'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span className="flex items-center gap-1">🛺 Auto</span>
                <span>₹{plan.fareBreakdown?.firstMileOptions?.auto || 95}</span>
              </div>
              <div className={`text-[10px] mt-0.5 truncate ${(firstMileMode || plan.fareBreakdown?.firstMileMode) === 'auto' ? 'text-emerald-200 dark:text-[#5ee9b5]' : 'text-[#6B7267] dark:text-[#9CAEA3]'}`}>Uber Auto / Rapido</div>
            </button>

            <button
              type="button"
              onClick={() => onFirstMileModeChange?.('walk')}
              className={`chip-tactile h-[68px] flex flex-col justify-between p-2.5 rounded-xl border text-left cursor-pointer ${
                (firstMileMode || plan.fareBreakdown?.firstMileMode) === 'walk'
                  ? 'bg-[#143428] dark:bg-[#1E4333] text-white dark:text-[#5ee9b5] border-[#143428] dark:border-[#38DF92] shadow-xs'
                  : 'bg-[#F8F9F5] dark:bg-[#16231D] text-[#17201B] dark:text-[#F3F5EE] border-[#E2E4DC] dark:border-white/10 hover:border-[#143428]/40 dark:hover:border-white/25 hover:bg-white dark:hover:bg-[#1C2C24]'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span className="flex items-center gap-1">🚶 Walk</span>
                <span>Free</span>
              </div>
              <div className={`text-[10px] mt-0.5 truncate ${(firstMileMode || plan.fareBreakdown?.firstMileMode) === 'walk' ? 'text-emerald-200 dark:text-[#5ee9b5]' : 'text-[#6B7267] dark:text-[#9CAEA3]'}`}>~{Math.round(plan.firstMile.distanceKm * 12)}m walk</div>
            </button>
          </div>
        </div>

        {/* Uber & Rapido Booking Buttons */}
        {(firstMileMode || plan.fareBreakdown?.firstMileMode) !== 'walk' && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <a
              href={
                deepLinks?.uberFirstMileUrl ||
                `https://m.uber.com/ul/?action=setPickup&client_id=metronav&pickup[latitude]=${plan.origin.lat}&pickup[longitude]=${plan.origin.lng}&dropoff[latitude]=${plan.originStation.lat}&dropoff[longitude]=${plan.originStation.lng}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="btn-tactile inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800 border border-white/15 transition shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              <span>Book on Uber</span>
            </a>

            <button
              type="button"
              onClick={openRapidoApp}
              className="btn-tactile inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 text-amber-950 text-xs font-black hover:bg-amber-300 transition shadow-xs cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-900" />
              <span>Book on Rapido</span>
            </button>
          </div>
        )}

        <p className="text-sm text-[#53584E] dark:text-[#D1DDD6] leading-relaxed">
          {plan.firstMile.instructions}
        </p>

        {/* Unnested Zero-Asking Callout */}
        <div className="p-4 rounded-xl bg-[#F8F9F5] dark:bg-[#16231D] border border-transparent dark:border-white/10 text-xs text-[#53584E] dark:text-[#D1DDD6] flex items-start gap-3">
          <VolumeX className="w-4 h-4 text-[#143428] dark:text-[#5ee9b5] shrink-0 mt-0.5" strokeWidth={1.75} />
          <div className="leading-relaxed">
            <strong className="text-[#17201B] dark:text-[#F3F5EE] font-bold">Zero-Asking Tip: </strong>
            {plan.firstMile.antiAnxietyTip}
          </div>
        </div>
      </div>

      {/* Subtle Stage Connector */}
      <div className="flex items-center justify-center -my-2">
        <div className="h-6 w-0.5 bg-[#D5D8CD] dark:bg-white/20 rounded-full"></div>
      </div>

      {/* STAGE 02: The Metro Journey */}
      <div className="rounded-2xl bg-white dark:bg-[#111A15] border border-[#E2E4DC] dark:border-white/10 p-6 sm:p-7 space-y-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E4DC] dark:border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex items-center justify-center px-3 py-1 rounded-lg text-white font-mono font-extrabold text-xs shadow-xs shrink-0 tracking-wider"
              style={{ backgroundColor: plan.originStation.lineColor }}
            >
              STAGE 02
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-[#6B7267] dark:text-[#9BAAA0] uppercase tracking-wider block">
                Metro Transit Leg
              </span>
              <h4 className="font-bold text-base text-[#17201B] dark:text-[#F3F5EE] truncate">
                Board at {plan.originStation.name}
              </h4>
            </div>
          </div>

          <span
            className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow-xs shrink-0"
            style={{ backgroundColor: plan.originStation.lineColor }}
          >
            <TrainFront className="w-4 h-4" strokeWidth={2} />
            <span>{plan.originStation.line} Line</span>
          </span>
        </div>

        {/* Zero-Queue Digital Metro QR Ticketing Bar */}
        <div className="p-4 rounded-2xl bg-[#FAF9F5] dark:bg-[#16231D] border border-[#E2E4DC] dark:border-white/10 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#17201B] dark:text-[#F3F5EE]">Metro Transit Fare:</span>
              <span className="text-[#53584E] dark:text-[#A7B2A8]">
                ({currentPax} {currentPax === 1 ? 'rider' : 'riders'})
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono self-start sm:self-auto">
              <span className="text-[#6B7267] dark:text-[#9CAEA3] line-through text-[11px]">₹{ticketPricing.totalBaseFare}</span>
              <span className="font-extrabold text-[#143428] dark:text-[#5ee9b5] text-sm">
                ₹{ticketPricing.totalFare}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                10% QR Off
              </span>
            </div>
          </div>

          {activeTicket && activeTicket.status === 'active' ? (
            <div
              onClick={() => setIsActivePassModalOpen(true)}
              className="card-interactive p-3 rounded-xl bg-[#143428] text-white flex items-center justify-between gap-2 cursor-pointer hover:bg-[#1A3E31] transition shadow-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative">
                  <QrCode className="w-5 h-5 text-emerald-300" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                    <span>Active DMRC Pass Ready</span>
                    <span className="text-[10px] font-mono text-emerald-300">({activeTicket.id})</span>
                  </div>
                  <div className="text-[10px] text-emerald-200">
                    Tap to open QR &amp; scan at turnstiles
                  </div>
                </div>
              </div>

              <span className="px-3 py-1 rounded-lg bg-emerald-400/20 text-emerald-300 text-[10px] font-extrabold uppercase border border-emerald-400/30 shrink-0">
                View Pass
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => setIsTicketModalOpen(true)}
                className="btn-tactile flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#143428] dark:bg-emerald-600 hover:bg-[#1A3E31] text-white text-xs font-black shadow-xs transition cursor-pointer"
              >
                <Ticket className="w-4 h-4 text-emerald-300" />
                <span>Book Metro QR Ticket</span>
              </button>

              <a
                href={getDmrcWhatsAppUrl(plan.originStation.name, plan.destinationStation.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-tactile flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-black shadow-xs transition"
              >
                <MessageSquare className="w-3.5 h-3.5 fill-white" />
                <span>DMRC WhatsApp Bot</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>
            </div>
          )}
        </div>

        {/* Metro Leg Details & Platform Signage */}
        <div className="space-y-4">
          {plan.metroLeg.lines.map((leg, idx) => (
            <div key={idx} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="font-bold flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: leg.lineColor }}
                  ></span>
                  <span className="text-[#17201B] dark:text-[#F3F5EE]">{leg.from}</span>
                  <ArrowRight className="w-4 h-4 text-[#8E9487] dark:text-[#9CAEA3] shrink-0" strokeWidth={2} />
                  <span className="text-[#17201B] dark:text-[#F3F5EE]">{leg.to}</span>
                </div>
                <span className="text-[#143428] dark:text-[#5ee9b5] font-bold tabular-nums bg-[#143428]/10 dark:bg-emerald-500/20 px-3 py-1 rounded-lg text-xs">
                  ~{leg.stopsCount} {leg.stopsCount === 1 ? 'stop' : 'stops'}
                </span>
              </div>

              {/* Direct Platform Guidance */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-[#F8F9F5] dark:bg-[#16231D] border border-transparent dark:border-white/10 p-3.5 rounded-xl">
                <div className="flex items-center gap-2 text-[#53584E] dark:text-[#A7B2A8]">
                  <Signpost className="w-4 h-4 text-[#143428] dark:text-[#5ee9b5] shrink-0" strokeWidth={1.75} />
                  <span className="font-bold text-[#17201B] dark:text-[#F3F5EE]">Platform Signage to look for:</span>
                </div>
                <div className="bg-white dark:bg-[#111A15] px-3 py-1 rounded-lg font-mono font-bold text-[#143428] dark:text-[#5ee9b5] text-xs border border-[#E2E4DC] dark:border-white/15 self-start sm:self-auto">
                  {leg.direction}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Interchange Alert if required */}
        {plan.metroLeg.requiresTransfer && (
          <div className="p-4 rounded-xl bg-[#FAF2EE] dark:bg-[#2A160E] text-xs space-y-2 border-l-4 border-[#B9552C]">
            <div className="font-bold flex items-center gap-2 text-[#B9552C] dark:text-[#FF7A45] text-sm flex-wrap">
              <GitCommitVertical className="w-4 h-4 text-[#B9552C] dark:text-[#FF7A45] shrink-0" strokeWidth={2} />
              <span>
                Interchange at{' '}
                {plan.metroLeg.transferStations && plan.metroLeg.transferStations.length > 0
                  ? plan.metroLeg.transferStations.map((st) => st.name).join(' ➔ ')
                  : plan.metroLeg.transferStation?.name}
              </span>
            </div>
            <p className="text-[#53584E] dark:text-[#D1DDD6] leading-relaxed">
              {plan.metroLeg.transferInstruction}
            </p>
            <div className="text-[#A84B25] dark:text-[#FF9E75] text-xs font-semibold">
              Look for illuminated overhead arrows along the skywalk — zero ticket re-scan required.
            </div>
          </div>
        )}
      </div>

      {/* Subtle Stage Connector directly from Stage 02 -> Stage 03 */}
      <div className="flex items-center justify-center -my-2">
        <div className="h-6 w-0.5 bg-[#D5D8CD] dark:bg-white/20 rounded-full"></div>
      </div>

      {/* STAGE 03: Deboarding & The Exact Exit Gate */}
      <div className="rounded-2xl bg-gradient-to-b from-white via-white to-[#FAF6F3] dark:from-[#1A120E] dark:via-[#161210] dark:to-[#111A15] border border-[#E8C2B3] dark:border-[#B9552C]/45 p-6 sm:p-7 space-y-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8C2B3]/50 dark:border-[#B9552C]/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center px-3 py-1 rounded-lg bg-[#B9552C] text-white font-mono font-extrabold text-xs shadow-xs shrink-0 tracking-wider">
              STAGE 03
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-[#B9552C] dark:text-[#FF7A45] uppercase tracking-wider block">
                Crucial Exit Point
              </span>
              <h4 className="font-bold text-base text-[#17201B] dark:text-[#F3F5EE] truncate">
                Deboard at {plan.destinationStation.name}
              </h4>
            </div>
          </div>

          <div className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#B9552C] text-white text-sm font-extrabold tracking-wide shadow-xs flex items-center gap-2 shrink-0">
            <DoorOpen className="w-4 h-4" strokeWidth={2} />
            <span>EXIT GATE {plan.metroExit.gateNumber}</span>
          </div>
        </div>

        {/* Direct exit advice */}
        <div className="space-y-3.5 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-bold text-[#B9552C] dark:text-[#FF7A45] text-sm">Gate {plan.metroExit.gateNumber} directly faces:</span>
            <span className="font-bold bg-[#FAF2EE] dark:bg-[#2A160E] px-3 py-1.5 rounded-lg border border-[#E8C2B3] dark:border-[#B9552C]/40 text-[#17201B] dark:text-[#F3F5EE] text-xs">
              {plan.metroExit.leadsTo}
            </span>
          </div>

          <div className="text-[#53584E] dark:text-[#D1DDD6] leading-relaxed flex items-start gap-3 pt-1">
            <Eye className="w-4 h-4 text-[#B9552C] dark:text-[#FF7A45] shrink-0 mt-0.5" strokeWidth={1.75} />
            <div>
              <strong className="text-[#17201B] dark:text-[#F3F5EE] font-bold">How to locate without asking anyone: </strong>
              {plan.metroExit.signageTip} Once you tap out through the AFC turnstiles, look up at the illuminated green directional signs hanging directly from the ceiling.
            </div>
          </div>
        </div>
      </div>

      {/* Subtle Stage Connector */}
      <div className="flex items-center justify-center -my-2">
        <div className="h-6 w-0.5 bg-[#D5D8CD] dark:bg-white/20 rounded-full"></div>
      </div>

      {/* STAGE 04: Last Mile from Metro Gate to Destination */}
      <div className="rounded-2xl bg-white dark:bg-[#111A15] border border-[#E2E4DC] dark:border-white/10 p-6 sm:p-7 space-y-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E4DC] dark:border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center px-3 py-1 rounded-lg bg-[#143428] dark:bg-emerald-500 text-white dark:text-[#061C12] font-mono font-extrabold text-xs shadow-xs shrink-0 tracking-wider">
              STAGE 04
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-[#6B7267] dark:text-[#9BAAA0] uppercase tracking-wider block">
                Final Mile Leg
              </span>
              <h4 className="font-bold text-base text-[#17201B] dark:text-[#F3F5EE] truncate">
                Reach {plan.destination.name.split(',')[0]}
              </h4>
            </div>
          </div>

          <span className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-[#F8F9F5] dark:bg-[#16231D] border border-[#E2E4DC] dark:border-white/10 text-[#143428] dark:text-[#5ee9b5] text-xs font-bold shrink-0">
            {plan.lastMile.distanceKm} km remaining
          </span>
        </div>

        <p className="text-sm text-[#53584E] dark:text-[#D1DDD6] leading-relaxed">
          {plan.lastMile.exactInstructions}
        </p>

        {/* Interactive Last Mile Mode Selector */}
        <div className="space-y-1.5 pt-1">
          <div className="text-xs font-bold text-[#53584E] dark:text-[#A7B2A8]">Choose Last-Mile Mode:</div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onLastMileModeChange?.('cab')}
              className={`chip-tactile h-[68px] flex flex-col justify-between p-2.5 rounded-xl border text-left cursor-pointer ${
                (lastMileMode || plan.fareBreakdown?.lastMileMode) === 'cab'
                  ? 'bg-[#143428] dark:bg-[#1E4333] text-white dark:text-[#5ee9b5] border-[#143428] dark:border-[#38DF92] shadow-xs'
                  : 'bg-[#F8F9F5] dark:bg-[#16231D] text-[#17201B] dark:text-[#F3F5EE] border-[#E2E4DC] dark:border-white/10 hover:border-[#143428]/40 dark:hover:border-white/25 hover:bg-white dark:hover:bg-[#1C2C24]'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span className="flex items-center gap-1">🚕 Cab</span>
                <span>₹{plan.fareBreakdown?.lastMileOptions?.cab || 150}</span>
              </div>
              <div className={`text-[10px] mt-0.5 truncate ${(lastMileMode || plan.fareBreakdown?.lastMileMode) === 'cab' ? 'text-emerald-200 dark:text-[#5ee9b5]' : 'text-[#6B7267] dark:text-[#9CAEA3]'}`}>Uber Go / Ola</div>
            </button>

            <button
              type="button"
              onClick={() => onLastMileModeChange?.('auto')}
              className={`chip-tactile h-[68px] flex flex-col justify-between p-2.5 rounded-xl border text-left cursor-pointer ${
                (lastMileMode || plan.fareBreakdown?.lastMileMode) === 'auto'
                  ? 'bg-[#143428] dark:bg-[#1E4333] text-white dark:text-[#5ee9b5] border-[#143428] dark:border-[#38DF92] shadow-xs'
                  : 'bg-[#F8F9F5] dark:bg-[#16231D] text-[#17201B] dark:text-[#F3F5EE] border-[#E2E4DC] dark:border-white/10 hover:border-[#143428]/40 dark:hover:border-white/25 hover:bg-white dark:hover:bg-[#1C2C24]'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span className="flex items-center gap-1">🛺 Auto</span>
                <span>₹{plan.fareBreakdown?.lastMileOptions?.auto || 95}</span>
              </div>
              <div className={`text-[10px] mt-0.5 truncate ${(lastMileMode || plan.fareBreakdown?.lastMileMode) === 'auto' ? 'text-emerald-200 dark:text-[#5ee9b5]' : 'text-[#6B7267] dark:text-[#9CAEA3]'}`}>Uber Auto / Rapido</div>
            </button>

            <button
              type="button"
              onClick={() => onLastMileModeChange?.('walk')}
              className={`chip-tactile h-[68px] flex flex-col justify-between p-2.5 rounded-xl border text-left cursor-pointer ${
                (lastMileMode || plan.fareBreakdown?.lastMileMode) === 'walk'
                  ? 'bg-[#143428] dark:bg-[#1E4333] text-white dark:text-[#5ee9b5] border-[#143428] dark:border-[#38DF92] shadow-xs'
                  : 'bg-[#F8F9F5] dark:bg-[#16231D] text-[#17201B] dark:text-[#F3F5EE] border-[#E2E4DC] dark:border-white/10 hover:border-[#143428]/40 dark:hover:border-white/25 hover:bg-white dark:hover:bg-[#1C2C24]'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span className="flex items-center gap-1">🚶 Walk</span>
                <span>Free</span>
              </div>
              <div className={`text-[10px] mt-0.5 truncate ${(lastMileMode || plan.fareBreakdown?.lastMileMode) === 'walk' ? 'text-emerald-200 dark:text-[#5ee9b5]' : 'text-[#6B7267] dark:text-[#9CAEA3]'}`}>~{Math.round(plan.lastMile.distanceKm * 12)}m walk</div>
            </button>
          </div>
        </div>

        {/* Uber & Rapido Booking Buttons */}
        {(lastMileMode || plan.fareBreakdown?.lastMileMode) !== 'walk' && (
          <div className="flex items-center gap-2 pt-1">
            <a
              href={
                deepLinks?.uberLastMileUrl ||
                `https://m.uber.com/ul/?action=setPickup&client_id=metronav&pickup[latitude]=${plan.destinationStation.lat}&pickup[longitude]=${plan.destinationStation.lng}&dropoff[latitude]=${plan.destination.lat}&dropoff[longitude]=${plan.destination.lng}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="btn-tactile inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-black text-white text-xs font-bold hover:bg-neutral-800 border border-white/15 transition shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              <span>Book Ride from Station on Uber</span>
            </a>

            <button
              type="button"
              onClick={openRapidoApp}
              className="btn-tactile inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 text-amber-950 text-xs font-black hover:bg-amber-300 transition shadow-xs cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-900" />
              <span>Book on Rapido</span>
            </button>
          </div>
        )}

        {/* Connecting Feeder Bus */}
        {destinationConnectingBuses.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#17201B] dark:text-[#F3F5EE]">
              <span className="flex items-center gap-2">
                <BusFront className="w-4 h-4 text-[#B9552C] dark:text-[#FF7A45]" strokeWidth={2} />
                Connecting Feeder Bus at Station Bay:
              </span>
              <span className="text-[11px] text-[#6B7267] dark:text-[#9BAAA0] font-medium">GMCBL / DTC Feeder</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {destinationConnectingBuses.slice(0, 2).map(bus => (
                <div
                  key={bus.busId}
                  className="p-3.5 rounded-xl bg-[#F8F9F5] dark:bg-[#16231D] border border-transparent dark:border-white/10 text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-[#17201B] dark:text-[#F3F5EE] flex items-center gap-2 text-sm">
                      <span className="text-[#B9552C] dark:text-[#FF7A45]">{bus.routeNumber}</span>
                      {bus.isAirConditioned && (
                        <span className="px-2 py-0.5 rounded bg-[#143428]/10 dark:bg-emerald-500/20 text-[#143428] dark:text-[#5ee9b5] text-[10px] font-bold">
                          AC
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#6B7267] dark:text-[#9BAAA0] truncate max-w-[180px] mt-0.5">To {bus.destination}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[#143428] dark:text-[#5ee9b5] text-sm">in {bus.etaMin}m</div>
                    <div className="text-xs text-[#6B7267] dark:text-[#9BAAA0]">₹{bus.fareInr}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Zero-Speaking Driver Phrases for Autos */}
        <div className="space-y-2.5 pt-2">
          <div className="font-bold text-[#17201B] dark:text-[#F3F5EE] text-xs flex items-center gap-2">
            <MessageSquareCode className="w-4 h-4 text-[#143428] dark:text-[#5ee9b5]" strokeWidth={2} />
            <span>Zero-Talking Driver Phrases (Tap to copy):</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => {
                navigator.clipboard.writeText('भैया, मीटर से चलेंगे?');
              }}
              className="card-interactive p-3.5 rounded-xl bg-[#F8F9F5] dark:bg-[#16231D] hover:bg-[#EAECE4] dark:hover:bg-[#1C2C24] border border-[#E2E4DC] dark:border-white/10 text-left transition cursor-pointer"
            >
              <div className="text-[#17201B] dark:text-[#F3F5EE] font-semibold text-xs">&quot;Bhaiya, meter se chalenge?&quot;</div>
              <div className="text-[11px] text-[#6B7267] dark:text-[#9BAAA0] mt-0.5">Brother, will you go by meter?</div>
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`भैया, ${plan.destination.name.split(',')[0]} ड्रॉप पॉइंट पे उतार देना।`);
              }}
              className="card-interactive p-3.5 rounded-xl bg-[#F8F9F5] dark:bg-[#16231D] hover:bg-[#EAECE4] dark:hover:bg-[#1C2C24] border border-[#E2E4DC] dark:border-white/10 text-left transition cursor-pointer"
            >
              <div className="text-[#17201B] dark:text-[#F3F5EE] font-semibold text-xs truncate">&quot;{plan.destination.name.split(',')[0]} drop point&quot;</div>
              <div className="text-[11px] text-[#6B7267] dark:text-[#9BAAA0] mt-0.5">Please drop at entrance</div>
            </button>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#F8F9F5] dark:bg-[#16231D] border border-transparent dark:border-white/10 text-xs text-[#53584E] dark:text-[#D1DDD6] flex items-start gap-3">
          <Milestone className="w-4 h-4 text-[#143428] dark:text-[#5ee9b5] shrink-0 mt-0.5" strokeWidth={1.75} />
          <div className="leading-relaxed">
            <strong className="text-[#17201B] dark:text-[#F3F5EE] font-bold">Arrival Landmark: </strong>
            {plan.lastMile.antiAnxietyTip}
          </div>
        </div>
      </div>

      {/* Optional Collapsible Live Platform Departures Board (kept out of the 4-stage route flow) */}
      </>
      )}

      {!isDirectRoadMode && (
        <div className="rounded-2xl bg-white dark:bg-[#111A15] border border-[#E2E4DC] dark:border-white/10 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setIsPlatformBoardOpen((prev) => !prev)}
            className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-[#F8F9F5] dark:hover:bg-white/5 transition cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-8 h-8 rounded-xl text-white flex items-center justify-center shrink-0"
                style={{ backgroundColor: plan.originStation.lineColor }}
              >
                <TrainFront className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-[#17201B] dark:text-[#F3F5EE] truncate">
                  Live Train Timings &amp; Feeder Buses • {plan.originStation.name}
                </div>
                <div className="text-[11px] text-[#6B7267] dark:text-[#9BAAA0] truncate">
                  Optional platform board &amp; local station feeders
                </div>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#143428] dark:text-[#5ee9b5] shrink-0">
              <span>{isPlatformBoardOpen ? 'Hide' : 'View'}</span>
              {isPlatformBoardOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </button>

          {isPlatformBoardOpen && (
            <div className="p-4 pt-0 border-t border-[#E2E4DC] dark:border-white/10">
              <LiveStationDepartures
                stationId={plan.originStation.id}
                stationName={plan.originStation.name}
                lineColor={plan.originStation.lineColor}
              />
            </div>
          )}
        </div>
      )}

      {/* Introvert's Zero-Asking Checklist */}
      <div className="rounded-2xl bg-white dark:bg-[#111A15] border border-[#E2E4DC] dark:border-white/10 p-6 sm:p-7 space-y-4 shadow-xs">
        <div className="flex items-center gap-2.5 text-[#17201B] dark:text-[#F3F5EE]">
          <div className="w-6 h-6 rounded-md bg-[#143428]/10 dark:bg-emerald-500/20 text-[#143428] dark:text-[#5ee9b5] flex items-center justify-center">
            <Headphones className="w-3.5 h-3.5" strokeWidth={1.75} />
          </div>
          <h3 className="font-bold text-sm uppercase tracking-wider font-sans">Introvert&apos;s Zero-Asking Checklist</h3>
        </div>
        <div className="grid grid-cols-1 gap-2.5 text-xs text-[#2C332E] dark:text-[#D1DDD6]">
          {plan.introvertChecklist.map((tip, idx) => (
            <div key={idx} className="flex items-start gap-3 bg-[#F8F9F5] dark:bg-[#16231D] border border-transparent dark:border-white/10 p-3.5 rounded-xl">
              <BadgeCheck className="w-4 h-4 text-[#143428] dark:text-[#5ee9b5] shrink-0 mt-0.5" strokeWidth={2} />
              <span className="leading-relaxed">{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Gemini AI Transit Grounding with Official Google Maps Links */}
      <div className="rounded-2xl bg-white dark:bg-[#111A15] border border-[#E2E4DC] dark:border-white/10 p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#143428] flex items-center justify-center font-bold text-white shadow-xs shrink-0">
              <Sparkle className="w-4 h-4 text-emerald-300 shrink-0" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#17201B] dark:text-[#F3F5EE] font-sans">
                Transit Verification &amp; Live Grounding
              </h3>
              <p className="text-[11px] text-[#6B7267] dark:text-[#9BAAA0]">
                Ground-truth cues synced with Google Maps location data
              </p>
            </div>
          </div>

          {onRequestAiRefresh && (
            <button
              onClick={onRequestAiRefresh}
              disabled={aiGuide.loading}
              className="text-xs font-bold text-[#143428] dark:text-[#5ee9b5] hover:text-[#B9552C] dark:hover:text-[#FF7A45] hover:underline disabled:opacity-50 transition cursor-pointer"
            >
              {aiGuide.loading ? 'Updating...' : 'Refresh AI'}
            </button>
          )}
        </div>

        {aiGuide.loading ? (
          <div className="p-4 rounded-xl bg-[#F8F9F5] dark:bg-[#16231D] flex items-center gap-3 text-xs text-[#6B7267] dark:text-[#9BAAA0]">
            <div className="w-4 h-4 rounded-full border-2 border-[#143428] dark:border-[#5ee9b5] border-t-transparent animate-spin"></div>
            Verifying station exits and Google Maps landmark cues...
          </div>
        ) : aiGuide.text ? (
          <div className="space-y-3">
            <div className="text-xs text-[#2C332E] dark:text-[#D1DDD6] leading-relaxed whitespace-pre-line bg-[#F8F9F5] dark:bg-[#16231D] p-4 rounded-xl">
              {aiGuide.text}
            </div>

            {aiGuide.links && aiGuide.links.length > 0 && (
              <div className="pt-2 border-t border-[#E2E4DC] dark:border-white/10">
                <div className="text-[11px] font-bold text-[#6B7267] dark:text-[#9BAAA0] uppercase tracking-wider mb-2">
                  Verified Google Maps Sources:
                </div>
                <div className="flex flex-wrap gap-2">
                  {aiGuide.links.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF2EE] dark:bg-[#2A160E] hover:bg-[#F3E2DB] dark:hover:bg-[#3A1E13] text-[#B9552C] dark:text-[#FF7A45] border border-[#E8C2B3] dark:border-[#B9552C]/40 text-xs font-medium transition"
                    >
                      <MapPinned className="w-3.5 h-3.5 text-[#B9552C] dark:text-[#FF7A45]" strokeWidth={1.75} />
                      <span>{link.title}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 opacity-70 ml-0.5" strokeWidth={1.75} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : aiGuide.error ? (
          <div className="p-3.5 rounded-xl bg-[#F8F9F5] dark:bg-[#16231D] text-[#6B7267] dark:text-[#9BAAA0] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#6B7267] dark:text-[#9BAAA0] shrink-0" strokeWidth={1.75} />
            <span>AI grounding unavailable; deterministic transit engine route is active above.</span>
          </div>
        ) : null}
      </div>

      {/* Metro Ticket Booking Modal */}
      <MetroTicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        originStation={plan.originStation}
        destinationStation={plan.destinationStation}
        interchangeStation={plan.metroLeg.transferStation}
        exitGate={{
          gateNumber: String(plan.metroExit.gateNumber),
          leadsTo: plan.metroExit.leadsTo,
        }}
        baseFarePerPerson={metroFarePerPerson}
        initialPassengerCount={currentPax}
        onTicketSuccess={(ticket) => {
          setIsActivePassModalOpen(true);
        }}
      />

      {/* Active Ticket Pass Modal */}
      <ActiveTicketPassModal
        isOpen={isActivePassModalOpen}
        onClose={() => setIsActivePassModalOpen(false)}
        ticket={activeTicket}
        onMarkUsed={() => {
          if (activeTicket) {
            markUsed(activeTicket.id);
          }
          setIsActivePassModalOpen(false);
        }}
      />
    </div>
  );
}
