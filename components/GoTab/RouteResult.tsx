'use client';

import React, { useState } from 'react';
import { MultiModalTripPlan } from '@/lib/delhi-ncr-transit';
import { LiveStationDepartures } from '@/components/LiveStationDepartures';
import { ACTIVE_TRANSIT_ALERTS, getConnectingBusesForStation } from '@/lib/realtime-transit';
import {
  TrainFront,
  DoorOpen,
  CarTaxiFront,
  BusFront,
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
  Milestone,
  ArrowRight,
  RefreshCw,
  GitCommitVertical,
  Flame,
  Radar
} from 'lucide-react';

interface RouteResultProps {
  plan: MultiModalTripPlan;
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
  aiGuide,
  onSwitchToMap,
  onChangeDestination,
  onOpenTransitRadar,
}: RouteResultProps) {
  const [copiedText, setCopiedText] = useState(false);

  const routeAlerts = ACTIVE_TRANSIT_ALERTS.filter(
    (alert) =>
      alert.affectedStations?.includes(plan.originStation.id) ||
      alert.affectedStations?.includes(plan.destinationStation.id) ||
      alert.affectedLines.includes(plan.originStation.line) ||
      alert.affectedLines.includes(plan.destinationStation.line)
  );

  const destinationConnectingBuses = getConnectingBusesForStation(plan.destinationStation.id);

  const handleCopyRoute = () => {
    const summary = `📍 Route to ${plan.destination.name}:
1. Start at ${plan.origin.name} ➔ Go to ${plan.originStation.name} (${plan.firstMile.mode === 'walk' ? 'Walk' : 'Auto/Cab ~₹' + plan.firstMile.estimatedCostInr})
2. Metro: Board ${plan.originStation.line} Line at ${plan.originStation.name}
${plan.metroLeg.requiresTransfer ? `   Interchange at ${plan.metroLeg.transferStation?.name}\n` : ''}3. Deboard: ${plan.destinationStation.name} ➔ EXIT GATE ${plan.metroExit.gateNumber}
4. Last Mile: ${plan.lastMile.options[0]?.description || 'Auto to destination'} (~₹${plan.lastMile.options[0]?.estimatedCostInr || 40})
(Generated via MetroNav Delhi-NCR)`;

    navigator.clipboard.writeText(summary);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const totalDuration =
    plan.firstMile.durationMin +
    plan.metroLeg.totalDurationMin +
    (plan.lastMile.options[0]?.durationMin || 5);

  return (
    <div className="space-y-5 pb-8">
      {/* Editorial Racing Green Hero Banner */}
      <div className="rounded-3xl bg-[#143428] text-white p-5 sm:p-7 shadow-lg relative overflow-hidden border border-[#1E4837]">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Trip Itinerary
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

        {/* 3 Large Metric Stat Boxes */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 mt-5 pt-4 border-t border-white/15 relative z-10">
          <div className="bg-[#1A3E31]/90 rounded-2xl p-2.5 sm:p-3 border border-[#235241] text-center">
            <div className="text-[10px] sm:text-[11px] text-emerald-200/90 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
              <Timer className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span>Time</span>
            </div>
            <div className="text-base sm:text-xl font-black text-white mt-1 tabular-nums">
              ~{totalDuration}m
            </div>
          </div>

          <div className="bg-[#1A3E31]/90 rounded-2xl p-2.5 sm:p-3 border border-[#235241] text-center">
            <div className="text-[10px] sm:text-[11px] text-emerald-200/90 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
              <IndianRupee className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Fare</span>
            </div>
            <div className="text-base sm:text-xl font-black text-amber-200 mt-1 tabular-nums">
              ₹{plan.metroLeg.estimatedFareInr}
            </div>
          </div>

          <div className="bg-[#1A3E31]/90 rounded-2xl p-2.5 sm:p-3 border border-[#B9552C]/50 text-center">
            <div className="text-[10px] sm:text-[11px] text-[#F3A585] font-bold uppercase tracking-wider flex items-center justify-center gap-1">
              <DoorOpen className="w-3.5 h-3.5 text-[#F3A585] shrink-0" />
              <span>Exit</span>
            </div>
            <div className="mt-1 flex items-center justify-center">
              <span className="px-2 py-0.5 rounded-lg bg-[#B9552C] text-white text-[11px] sm:text-xs font-black shadow-xs whitespace-nowrap inline-block">
                Gate {plan.metroExit.gateNumber}
              </span>
            </div>
          </div>
        </div>

        {/* Live Service Alerts */}
        {routeAlerts.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10 relative z-10">
            {routeAlerts.slice(0, 1).map((alert) => (
              <div
                key={alert.id}
                className="p-3 rounded-xl bg-amber-500/20 border border-amber-400/30 text-xs text-amber-100 flex items-center justify-between gap-3 overflow-hidden"
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
      <div className="rounded-2xl bg-white border border-[#E2E4DC] p-5 shadow-xs space-y-3">
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

          <span className="px-3 py-1 rounded-xl bg-[#F8F9F5] border border-[#E2E4DC] text-[#143428] text-xs font-bold flex items-center gap-1.5 shrink-0">
            {plan.firstMile.mode === 'walk' ? (
              <>
                <PersonStanding className="w-3.5 h-3.5 text-[#143428]" />
                <span>Walk ~{plan.firstMile.distanceKm} km</span>
              </>
            ) : (
              <>
                <CarTaxiFront className="w-3.5 h-3.5 text-[#B9552C]" />
                <span>Auto ~{plan.firstMile.distanceKm} km</span>
              </>
            )}
          </span>
        </div>

        <p className="text-sm text-[#53584E] leading-relaxed">
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
      <div className="rounded-2xl bg-white border border-[#E2E4DC] p-5 shadow-xs space-y-4">
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

        <p className="text-sm text-[#53584E] leading-relaxed">
          {plan.lastMile.exactInstructions}
        </p>

        {/* Mode comparison */}
        <div className="grid grid-cols-2 gap-2.5">
          {plan.lastMile.options.map((opt, i) => (
            <div key={i} className="p-3 rounded-xl bg-[#F8F9F5] text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-[#17201B]">
                <span className="capitalize flex items-center gap-1.5 text-xs">
                  {opt.mode === 'walk' && <PersonStanding className="w-3.5 h-3.5 text-[#143428]" />}
                  {opt.mode === 'auto' && <CarTaxiFront className="w-3.5 h-3.5 text-[#B9552C]" />}
                  {opt.mode === 'e-rickshaw' && <Zap className="w-3.5 h-3.5 text-[#143428]" />}
                  {opt.mode}
                </span>
                <span className="font-extrabold text-[#143428]">
                  {opt.estimatedCostInr === 0 ? 'Free' : `₹${opt.estimatedCostInr}`}
                </span>
              </div>
              <div className="text-[11px] text-[#6B7267]">
                {opt.durationMin}m • {opt.description}
              </div>
            </div>
          ))}
        </div>

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
