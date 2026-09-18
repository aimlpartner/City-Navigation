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
  Radar
} from 'lucide-react';

interface IntrovertGuideCardProps {
  plan: MultiModalTripPlan;
  aiGuide: {
    loading: boolean;
    text: string | null;
    error: string | null;
    links: { title: string; uri: string; source?: string }[];
  };
  onRequestAiRefresh?: () => void;
  onOpenTransitRadar?: () => void;
}

export function IntrovertGuideCard({
  plan,
  aiGuide,
  onRequestAiRefresh,
  onOpenTransitRadar
}: IntrovertGuideCardProps) {
  const [copiedText, setCopiedText] = useState(false);

  const routeAlerts = ACTIVE_TRANSIT_ALERTS.filter(
    alert =>
      alert.affectedStations?.includes(plan.originStation.id) ||
      alert.affectedStations?.includes(plan.destinationStation.id) ||
      alert.affectedLines.includes(plan.originStation.line) ||
      alert.affectedLines.includes(plan.destinationStation.line)
  );

  const destinationConnectingBuses = getConnectingBusesForStation(plan.destinationStation.id);

  const handleCopySummary = () => {
    const summary = `📍 Route to ${plan.destination.name}:
1. Start at ${plan.origin.name} -> Head to ${plan.originStation.name} (${plan.firstMile.mode === 'walk' ? 'Walk' : 'Auto/Cab ~₹' + plan.firstMile.estimatedCostInr})
2. Metro: Board ${plan.originStation.line} at ${plan.originStation.name}
${plan.metroLeg.requiresTransfer ? `   Change at ${plan.metroLeg.transferStation?.name} without exiting gates\n` : ''}3. Deboard: ${plan.destinationStation.name} -> EXIT GATE ${plan.metroExit.gateNumber}
4. Last Mile: ${plan.lastMile.options[0]?.description || 'Auto to destination'} (~₹${plan.lastMile.options[0]?.estimatedCostInr || 40})
(Generated via MetroNav Delhi-NCR)`;

    navigator.clipboard.writeText(summary);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Editorial British Racing Green Hero Summary Banner */}
      <div className="rounded-2xl sm:rounded-[24px] bg-[#143428] text-white p-5 sm:p-8 border border-[#1E4837] shadow-lg relative overflow-hidden">
        {/* Subtle decorative botanical ambient glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-[11px] sm:text-xs font-semibold mb-2 border border-white/15">
              <Headphones className="w-3.5 h-3.5 text-emerald-300 shrink-0" strokeWidth={1.75} />
              <span>Introvert Confident Transit Plan</span>
              <BadgeCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={2} />
            </div>
            <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white font-sans leading-tight">
              To {plan.destination.name}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-1">
              Departing from <span className="text-white font-semibold">{plan.origin.name}</span>
            </p>
          </div>

          <button
            onClick={handleCopySummary}
            className="flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs text-white transition shrink-0 font-medium shadow-xs"
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

        {/* Quick Stats Strip in Muted Pine */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-5 pt-4 border-t border-white/10 text-center relative z-10">
          <div className="bg-[#1A3E31]/85 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 border border-[#235241]">
            <div className="text-[10px] sm:text-[11px] text-emerald-200/80 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
              <Timer className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-300 shrink-0" strokeWidth={1.75} />
              <span className="truncate">Est. Duration</span>
            </div>
            <div className="text-sm sm:text-xl font-extrabold text-white mt-1 tabular-nums flex items-center justify-center gap-0.5">
              <span>~{plan.firstMile.durationMin + plan.metroLeg.totalDurationMin + (plan.lastMile.options[0]?.durationMin || 5)} min</span>
            </div>
          </div>

          <div className="bg-[#1A3E31]/85 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 border border-[#235241]">
            <div className="text-[10px] sm:text-[11px] text-emerald-200/80 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
              <IndianRupee className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-300 shrink-0" strokeWidth={1.75} />
              <span className="truncate">Metro Fare</span>
            </div>
            <div className="text-sm sm:text-xl font-extrabold text-amber-200 mt-1 tabular-nums">
              ₹{plan.metroLeg.estimatedFareInr}
            </div>
          </div>

          <div className="bg-[#1A3E31]/85 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 border border-[#B9552C]/40">
            <div className="text-[10px] sm:text-[11px] text-[#F3A585] font-bold uppercase tracking-wider flex items-center justify-center gap-1">
              <DoorOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#F3A585] shrink-0" strokeWidth={1.75} />
              <span className="truncate">Deboard Exit</span>
            </div>
            <div className="text-sm sm:text-xl font-extrabold text-white mt-1 flex items-center justify-center">
              <span className="px-2 py-0.5 rounded-md sm:rounded-lg bg-[#B9552C] text-white text-[11px] sm:text-sm font-bold shadow-xs">
                Gate {plan.metroExit.gateNumber}
              </span>
            </div>
          </div>
        </div>

        {/* Live Service Alerts & Status Banner */}
        {routeAlerts.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-white/10 space-y-2 relative z-10">
            {routeAlerts.slice(0, 1).map(alert => (
              <div
                key={alert.id}
                className="p-2.5 sm:p-3 rounded-xl bg-amber-500/15 border border-amber-400/30 text-xs text-amber-100 flex items-center justify-between gap-2.5 overflow-hidden"
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
                    className="px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/30 font-bold shrink-0 text-[11px] whitespace-nowrap transition flex items-center gap-1.5"
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

      {/* Transit Journey Section Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#143428] text-white flex items-center justify-center shadow-xs">
            <Route className="w-4 h-4 text-emerald-300" strokeWidth={2} />
          </div>
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-[#17201B] font-sans">
              Step-by-Step Transit Track
            </h3>
            <p className="text-xs text-[#6B7267]">
              Exact boarding platforms, transfers, and deboard exit gates
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-[#143428] bg-[#143428]/10 px-2.5 py-1 rounded-full border border-[#143428]/20 hidden sm:inline-flex">
          4 Connected Stages
        </span>
      </div>

      {/* STAGE 01: First Mile */}
      <div className="rounded-2xl bg-white border border-[#E2E4DC] p-6 sm:p-7 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E4DC]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center px-3 py-1 rounded-lg bg-[#143428] text-white font-mono font-extrabold text-xs shadow-xs shrink-0 tracking-wider">
              STAGE 01
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-[#6B7267] uppercase tracking-wider block">
                First Mile Leg
              </span>
              <h4 className="font-bold text-base text-[#17201B] truncate">
                Head to {plan.originStation.name} Metro
              </h4>
            </div>
          </div>

          <span className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-[#F8F9F5] border border-[#E2E4DC] text-[#17201B] text-xs font-bold flex items-center gap-2 shrink-0">
            {plan.firstMile.mode === 'walk' ? (
              <>
                <PersonStanding className="w-4 h-4 text-[#143428]" strokeWidth={2} />
                <span>Walk ~{plan.firstMile.distanceKm} km</span>
              </>
            ) : (
              <>
                <CarTaxiFront className="w-4 h-4 text-[#B9552C]" strokeWidth={2} />
                <span>Auto/Cab ~{plan.firstMile.distanceKm} km</span>
              </>
            )}
          </span>
        </div>

        <p className="text-sm text-[#53584E] leading-relaxed">
          {plan.firstMile.instructions}
        </p>

        {/* Unnested Zero-Asking Callout (Clean subtle background, no double card border) */}
        <div className="p-4 rounded-xl bg-[#F8F9F5] text-xs text-[#53584E] flex items-start gap-3">
          <VolumeX className="w-4 h-4 text-[#143428] shrink-0 mt-0.5" strokeWidth={1.75} />
          <div className="leading-relaxed">
            <strong className="text-[#17201B] font-bold">Zero-Asking Tip: </strong>
            {plan.firstMile.antiAnxietyTip}
          </div>
        </div>
      </div>

      {/* Subtle Stage Connector */}
      <div className="flex items-center justify-center -my-2">
        <div className="h-6 w-0.5 bg-[#D5D8CD] rounded-full"></div>
      </div>

      {/* STAGE 02: The Metro Journey (Flat, unnested hierarchy with generous breathing room) */}
      <div className="rounded-2xl bg-white border border-[#E2E4DC] p-6 sm:p-7 space-y-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E4DC]">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex items-center justify-center px-3 py-1 rounded-lg text-white font-mono font-extrabold text-xs shadow-xs shrink-0 tracking-wider"
              style={{ backgroundColor: plan.originStation.lineColor }}
            >
              STAGE 02
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-[#6B7267] uppercase tracking-wider block">
                Metro Transit Leg
              </span>
              <h4 className="font-bold text-base text-[#17201B] truncate">
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

        {/* Metro Leg Details & Platform Signage - Clean typographic flow without nested cards */}
        <div className="space-y-4">
          {plan.metroLeg.lines.map((leg, idx) => (
            <div key={idx} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="font-bold flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: leg.lineColor }}
                  ></span>
                  <span className="text-[#17201B]">{leg.from}</span>
                  <ArrowRight className="w-4 h-4 text-[#8E9487] shrink-0" strokeWidth={2} />
                  <span className="text-[#17201B]">{leg.to}</span>
                </div>
                <span className="text-[#143428] font-bold tabular-nums bg-[#143428]/10 px-3 py-1 rounded-lg text-xs">
                  ~{leg.stopsCount} {leg.stopsCount === 1 ? 'stop' : 'stops'}
                </span>
              </div>

              {/* Direct Platform Guidance */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-[#F8F9F5] p-3.5 rounded-xl">
                <div className="flex items-center gap-2 text-[#53584E]">
                  <Signpost className="w-4 h-4 text-[#143428] shrink-0" strokeWidth={1.75} />
                  <span className="font-bold text-[#17201B]">Platform Signage to look for:</span>
                </div>
                <div className="bg-white px-3 py-1 rounded-lg font-mono font-bold text-[#143428] text-xs border border-[#E2E4DC] self-start sm:self-auto">
                  {leg.direction}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Interchange Alert if required */}
        {plan.metroLeg.requiresTransfer && (
          <div className="p-4 rounded-xl bg-[#FAF2EE] text-xs space-y-2 border-l-4 border-[#B9552C]">
            <div className="font-bold flex items-center gap-2 text-[#B9552C] text-sm">
              <GitCommitVertical className="w-4 h-4 text-[#B9552C]" strokeWidth={2} />
              <span>Interchange at {plan.metroLeg.transferStation?.name}</span>
            </div>
            <p className="text-[#53584E] leading-relaxed">
              {plan.metroLeg.transferInstruction}
            </p>
            <div className="text-[#A84B25] text-xs font-semibold">
              Look for illuminated overhead arrows along the skywalk — zero ticket re-scan required.
            </div>
          </div>
        )}
      </div>

      {/* Subtle Stage Connector */}
      <div className="flex items-center justify-center -my-2">
        <div className="h-6 w-0.5 bg-[#D5D8CD] rounded-full"></div>
      </div>

      {/* Dedicated Live Station Platform Board for Boarding Station */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold text-[#6B7267] uppercase tracking-wider px-1 flex items-center justify-between">
          <span>Live Boarding Platform Board • {plan.originStation.name}</span>
          <span className="text-[#143428] font-mono">Real-time PIDS</span>
        </div>
        <LiveStationDepartures
          stationId={plan.originStation.id}
          stationName={plan.originStation.name}
          lineColor={plan.originStation.lineColor}
        />
      </div>

      {/* Subtle Stage Connector */}
      <div className="flex items-center justify-center -my-2">
        <div className="h-6 w-0.5 bg-[#D5D8CD] rounded-full"></div>
      </div>

      {/* STAGE 03: Deboarding & The Exact Exit Gate (Spacious, unnested highlight) */}
      <div className="rounded-2xl bg-white border border-[#E8C2B3] p-6 sm:p-7 space-y-5 shadow-xs bg-gradient-to-b from-white via-white to-[#FAF6F3]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8C2B3]/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center px-3 py-1 rounded-lg bg-[#B9552C] text-white font-mono font-extrabold text-xs shadow-xs shrink-0 tracking-wider">
              STAGE 03
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-[#B9552C] uppercase tracking-wider block">
                Crucial Exit Point
              </span>
              <h4 className="font-bold text-base text-[#17201B] truncate">
                Deboard at {plan.destinationStation.name}
              </h4>
            </div>
          </div>

          <div className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#B9552C] text-white text-sm font-extrabold tracking-wide shadow-xs flex items-center gap-2 shrink-0">
            <DoorOpen className="w-4 h-4" strokeWidth={2} />
            <span>EXIT GATE {plan.metroExit.gateNumber}</span>
          </div>
        </div>

        {/* Direct exit advice without an enclosed inner box */}
        <div className="space-y-3.5 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-bold text-[#B9552C] text-sm">Gate {plan.metroExit.gateNumber} directly faces:</span>
            <span className="font-bold bg-[#FAF2EE] px-3 py-1.5 rounded-lg border border-[#E8C2B3] text-[#17201B] text-xs">
              {plan.metroExit.leadsTo}
            </span>
          </div>

          <div className="text-[#53584E] leading-relaxed flex items-start gap-3 pt-1">
            <Eye className="w-4 h-4 text-[#B9552C] shrink-0 mt-0.5" strokeWidth={1.75} />
            <div>
              <strong className="text-[#17201B] font-bold">How to locate without asking anyone: </strong>
              {plan.metroExit.signageTip} Once you tap out through the AFC turnstiles, look up at the illuminated green directional signs hanging directly from the ceiling.
            </div>
          </div>
        </div>
      </div>

      {/* Subtle Stage Connector */}
      <div className="flex items-center justify-center -my-2">
        <div className="h-6 w-0.5 bg-[#D5D8CD] rounded-full"></div>
      </div>

      {/* STAGE 04: Last Mile from Metro Gate to Destination */}
      <div className="rounded-2xl bg-white border border-[#E2E4DC] p-6 sm:p-7 space-y-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E4DC]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center px-3 py-1 rounded-lg bg-[#143428] text-white font-mono font-extrabold text-xs shadow-xs shrink-0 tracking-wider">
              STAGE 04
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-[#6B7267] uppercase tracking-wider block">
                Final Mile Leg
              </span>
              <h4 className="font-bold text-base text-[#17201B] truncate">
                Reach {plan.destination.name.split(',')[0]}
              </h4>
            </div>
          </div>

          <span className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-[#F8F9F5] border border-[#E2E4DC] text-[#143428] text-xs font-bold shrink-0">
            {plan.lastMile.distanceKm} km remaining
          </span>
        </div>

        <p className="text-sm text-[#53584E] leading-relaxed">
          {plan.lastMile.exactInstructions}
        </p>

        {/* Last Mile Mode Comparison (Clean chips with generous breathing room) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {plan.lastMile.options.map((opt, i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-[#F8F9F5] text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between font-bold text-[#17201B]">
                <span className="capitalize flex items-center gap-2 text-sm">
                  {opt.mode === 'walk' && <PersonStanding className="w-4 h-4 text-[#143428]" strokeWidth={2} />}
                  {opt.mode === 'auto' && <CarTaxiFront className="w-4 h-4 text-[#B9552C]" strokeWidth={2} />}
                  {opt.mode === 'e-rickshaw' && <Zap className="w-4 h-4 text-[#143428]" strokeWidth={2} />}
                  {opt.mode === 'cab' && <CarTaxiFront className="w-4 h-4 text-[#53584E]" strokeWidth={2} />}
                  {opt.mode}
                </span>
                <span className="font-extrabold tabular-nums text-[#143428]">
                  {opt.estimatedCostInr === 0 ? 'Free' : `₹${opt.estimatedCostInr}`}
                </span>
              </div>
              <div className="text-[#6B7267] text-xs leading-relaxed">
                {opt.durationMin} mins • {opt.description}
              </div>
            </div>
          ))}
        </div>

        {/* Connecting Feeder Bus (Flattened with clean list items) */}
        {destinationConnectingBuses.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#17201B]">
              <span className="flex items-center gap-2">
                <BusFront className="w-4 h-4 text-[#B9552C]" strokeWidth={2} />
                Connecting Feeder Bus at Station Bay:
              </span>
              <span className="text-[11px] text-[#6B7267] font-medium">GMCBL / DTC Feeder</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {destinationConnectingBuses.slice(0, 2).map(bus => (
                <div
                  key={bus.busId}
                  className="p-3.5 rounded-xl bg-[#F8F9F5] text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-[#17201B] flex items-center gap-2 text-sm">
                      <span className="text-[#B9552C]">{bus.routeNumber}</span>
                      {bus.isAirConditioned && (
                        <span className="px-2 py-0.5 rounded bg-[#143428]/10 text-[#143428] text-[10px] font-bold">
                          AC
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#6B7267] truncate max-w-[180px] mt-0.5">To {bus.destination}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[#143428] text-sm">in {bus.etaMin}m</div>
                    <div className="text-xs text-[#6B7267]">₹{bus.fareInr}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Zero-Speaking Driver Phrases for Autos */}
        <div className="space-y-2.5 pt-2">
          <div className="font-bold text-[#17201B] text-xs flex items-center gap-2">
            <MessageSquareCode className="w-4 h-4 text-[#143428]" strokeWidth={2} />
            <span>Zero-Talking Driver Phrases (Tap to copy):</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => {
                navigator.clipboard.writeText('भैया, मीटर से चलेंगे?');
              }}
              className="p-3.5 rounded-xl bg-[#F8F9F5] hover:bg-[#EAECE4] text-left transition"
            >
              <div className="text-[#17201B] font-semibold text-xs">&quot;Bhaiya, meter se chalenge?&quot;</div>
              <div className="text-[11px] text-[#6B7267] mt-0.5">Brother, will you go by meter?</div>
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`भैया, ${plan.destination.name.split(',')[0]} ड्रॉप पॉइंट पे उतार देना।`);
              }}
              className="p-3.5 rounded-xl bg-[#F8F9F5] hover:bg-[#EAECE4] text-left transition"
            >
              <div className="text-[#17201B] font-semibold text-xs truncate">&quot;{plan.destination.name.split(',')[0]} drop point&quot;</div>
              <div className="text-[11px] text-[#6B7267] mt-0.5">Please drop at entrance</div>
            </button>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#F8F9F5] text-xs text-[#53584E] flex items-start gap-3">
          <Milestone className="w-4 h-4 text-[#143428] shrink-0 mt-0.5" strokeWidth={1.75} />
          <div className="leading-relaxed">
            <strong className="text-[#17201B] font-bold">Arrival Landmark: </strong>
            {plan.lastMile.antiAnxietyTip}
          </div>
        </div>
      </div>

      {/* Introvert's Zero-Asking Checklist */}
      <div className="rounded-2xl bg-white border border-[#E2E4DC] p-6 sm:p-7 space-y-4 shadow-xs">
        <div className="flex items-center gap-2.5 text-[#17201B]">
          <div className="w-6 h-6 rounded-md bg-[#143428]/10 text-[#143428] flex items-center justify-center">
            <Headphones className="w-3.5 h-3.5" strokeWidth={1.75} />
          </div>
          <h3 className="font-bold text-sm uppercase tracking-wider font-sans">Introvert&apos;s Zero-Asking Checklist</h3>
        </div>
        <div className="grid grid-cols-1 gap-2.5 text-xs text-[#2C332E]">
          {plan.introvertChecklist.map((tip, idx) => (
            <div key={idx} className="flex items-start gap-3 bg-[#F8F9F5] p-3.5 rounded-xl">
              <BadgeCheck className="w-4 h-4 text-[#143428] shrink-0 mt-0.5" strokeWidth={2} />
              <span className="leading-relaxed">{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Gemini AI Transit Grounding with Official Google Maps Links */}
      <div className="rounded-2xl bg-white border border-[#E2E4DC] p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#143428] flex items-center justify-center font-bold text-white shadow-xs shrink-0">
              <Sparkle className="w-4 h-4 text-emerald-300 shrink-0" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#17201B] font-sans">
                Transit Verification & Live Grounding
              </h3>
              <p className="text-[11px] text-[#6B7267]">
                Ground-truth cues synced with Google Maps location data
              </p>
            </div>
          </div>

          {onRequestAiRefresh && (
            <button
              onClick={onRequestAiRefresh}
              disabled={aiGuide.loading}
              className="text-xs font-bold text-[#143428] hover:text-[#B9552C] hover:underline disabled:opacity-50 transition"
            >
              {aiGuide.loading ? 'Updating...' : 'Refresh AI'}
            </button>
          )}
        </div>

        {aiGuide.loading ? (
          <div className="p-4 rounded-xl bg-[#F8F9F5] flex items-center gap-3 text-xs text-[#6B7267]">
            <div className="w-4 h-4 rounded-full border-2 border-[#143428] border-t-transparent animate-spin"></div>
            Verifying station exits and Google Maps landmark cues...
          </div>
        ) : aiGuide.text ? (
          <div className="space-y-3">
            <div className="text-xs text-[#2C332E] leading-relaxed whitespace-pre-line bg-[#F8F9F5] p-4 rounded-xl">
              {aiGuide.text}
            </div>

            {/* MANDATORY: Render Grounding Links from groundingChunks.maps.uri */}
            {aiGuide.links && aiGuide.links.length > 0 && (
              <div className="pt-2 border-t border-[#E2E4DC]">
                <div className="text-[11px] font-bold text-[#6B7267] uppercase tracking-wider mb-2">
                  Verified Google Maps Sources:
                </div>
                <div className="flex flex-wrap gap-2">
                  {aiGuide.links.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF2EE] hover:bg-[#F3E2DB] text-[#B9552C] border border-[#E8C2B3] text-xs font-medium transition"
                    >
                      <MapPinned className="w-3.5 h-3.5 text-[#B9552C]" strokeWidth={1.75} />
                      <span>{link.title}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 opacity-70 ml-0.5" strokeWidth={1.75} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : aiGuide.error ? (
          <div className="p-3.5 rounded-xl bg-[#F8F9F5] text-[#6B7267] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#6B7267] shrink-0" strokeWidth={1.75} />
            <span>AI grounding unavailable; deterministic transit engine route is active above.</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
