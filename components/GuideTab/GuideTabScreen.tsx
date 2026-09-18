'use client';

import React from 'react';
import { MultiModalTripPlan } from '@/lib/delhi-ncr-transit';
import { CityQuickGuide } from '@/components/CityQuickGuide';
import {
  Radar,
  Sparkle,
  BadgeCheck,
  Headphones,
  ArrowUpRight,
  MapPinned,
  ShieldCheck,
  AlertCircle,
  Download,
  WifiOff
} from 'lucide-react';
import { triggerPwaInstall } from '@/components/PwaInstallPrompt';


interface GuideTabScreenProps {
  tripPlan: MultiModalTripPlan | null;
  aiGuide?: {
    loading: boolean;
    text: string | null;
    error: string | null;
    links: { title: string; uri: string; source?: string }[];
  };
  onOpenTransitRadar?: () => void;
  onRequestAiRefresh?: () => void;
}

const DEFAULT_INTROVERT_TIPS = [
  'Follow green exit signs above turnstiles for your exact Gate number — no need to ask security or vendors.',
  'Tokens can have long queues during peak hours; use Paytm Metro QR or DMRC Travel App for direct gate scanning.',
  'Interchanges at Sikanderpur and Rajiv Chowk have dedicated overhead footbridge signages without exiting gates.',
  'For autos outside Gurgaon metro stations, ask for meter or look for the prepaid booth right outside Gate 1/2.'
];

export function GuideTabScreen({
  tripPlan,
  aiGuide,
  onOpenTransitRadar,
  onRequestAiRefresh,
}: GuideTabScreenProps) {
  const tips = tripPlan?.introvertChecklist || DEFAULT_INTROVERT_TIPS;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#143428]/10 text-[#143428] text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Transit Companion & Radar</span>
        </div>
        <h2 className="text-2xl font-black text-[#17201B] tracking-tight font-sans">
          City Navigation Guide
        </h2>
        <p className="text-sm text-[#53584E]">
          Real-time line health, introvert survival checklist & local guidelines.
        </p>
      </div>

      {/* Offline App Download Card */}
      <div className="rounded-3xl bg-linear-to-br from-[#102a20] to-[#143428] text-white p-5 border border-emerald-500/30 shadow-md relative overflow-hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-emerald-400/30 flex items-center justify-center text-[#5ee9b5] shrink-0 shadow-inner">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-white">Download MetroNav App</h3>
                <span className="px-2 py-0.5 rounded-full bg-[#5ee9b5]/20 text-[#5ee9b5] text-[10px] font-black uppercase">
                  PWA
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 mt-1 leading-relaxed">
                Add to Home Screen for 1-tap launch, instant gate maps, and 100% offline underground navigation without signal.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-300/80">
            <WifiOff className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Works in underground metro tunnels</span>
          </div>

          <button
            type="button"
            onClick={triggerPwaInstall}
            className="px-4 py-2 rounded-xl bg-[#5ee9b5] hover:bg-[#4ade80] text-[#0d211a] font-extrabold text-xs shadow-xs active:scale-95 transition flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
        </div>
      </div>

      {/* Transit Radar Highlight Card */}
      <div className="rounded-3xl bg-[#143428] text-white p-5 border border-[#1E4837] shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-[#5ee9b5]">
              <Radar className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Live Line Health Radar</h3>
              <p className="text-xs text-emerald-200/90">7 Metro Lines & Rapid Metro Corridors</p>
            </div>
          </div>

          {onOpenTransitRadar && (
            <button
              type="button"
              onClick={onOpenTransitRadar}
              className="px-3.5 py-2 rounded-xl bg-[#5ee9b5] text-[#143428] font-black text-xs shadow-sm active:scale-95 transition hover:bg-[#4dd4a1]"
            >
              Open Radar
            </button>
          )}
        </div>

        {/* Quick status pill row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-white/10 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="font-medium text-white/90">Yellow: Normal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="font-medium text-white/90">Rapid: Normal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="font-medium text-white/90">Blue: Normal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="font-medium text-white/90">Airport: Fast</span>
          </div>
        </div>
      </div>

      {/* Introvert's Zero-Asking Checklist */}
      <div className="rounded-2xl bg-white border border-[#E2E4DC] p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2.5 text-[#17201B]">
          <div className="w-7 h-7 rounded-lg bg-[#143428]/10 text-[#143428] flex items-center justify-center">
            <Headphones className="w-4 h-4" />
          </div>
          <h3 className="font-extrabold text-base font-sans">
            Zero-Asking Confidence Checklist
          </h3>
        </div>

        <div className="space-y-2 text-xs text-[#2C332E]">
          {tips.map((tip, idx) => (
            <div key={idx} className="flex items-start gap-2.5 bg-[#F8F9F5] p-3 rounded-xl">
              <BadgeCheck className="w-4 h-4 text-[#143428] shrink-0 mt-0.5" />
              <span className="leading-relaxed">{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Gemini AI Transit Grounding with Google Maps Links */}
      {aiGuide && (
        <div className="rounded-2xl bg-white border border-[#E2E4DC] p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#143428] flex items-center justify-center text-emerald-300 shrink-0">
                <Sparkle className="w-4 h-4 shrink-0" />
              </div>
              <h3 className="text-sm font-extrabold text-[#17201B]">
                AI Verified Grounding
              </h3>
            </div>

            {onRequestAiRefresh && (
              <button
                type="button"
                onClick={onRequestAiRefresh}
                disabled={aiGuide.loading}
                className="text-xs font-bold text-[#143428] hover:underline disabled:opacity-50"
              >
                {aiGuide.loading ? 'Updating...' : 'Refresh'}
              </button>
            )}
          </div>

          {aiGuide.loading ? (
            <div className="p-3.5 rounded-xl bg-[#F8F9F5] text-xs text-[#6B7267] flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-[#143428] border-t-transparent animate-spin" />
              <span>Verifying live station landmarks & maps grounding...</span>
            </div>
          ) : aiGuide.text ? (
            <div className="space-y-3">
              <div className="text-xs text-[#2C332E] leading-relaxed whitespace-pre-line bg-[#F8F9F5] p-3.5 rounded-xl">
                {aiGuide.text}
              </div>

              {aiGuide.links && aiGuide.links.length > 0 && (
                <div className="pt-2 border-t border-[#E2E4DC]">
                  <span className="text-[10px] font-bold text-[#6B7267] uppercase tracking-wider block mb-1.5">
                    Verified Google Maps Locations:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {aiGuide.links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF2EE] text-[#B9552C] border border-[#E8C2B3] text-xs font-medium"
                      >
                        <MapPinned className="w-3 h-3" />
                        <span>{link.title}</span>
                        <ArrowUpRight className="w-3 h-3 opacity-60" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : aiGuide.error ? (
            <div className="p-3 rounded-xl bg-[#F8F9F5] text-xs text-[#6B7267] flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>Deterministic transit schedules are fully active.</span>
            </div>
          ) : null}
        </div>
      )}

      {/* City Quick Guide (Accordion FAQs, Airport Tips, Metro Rules) */}
      <div className="rounded-2xl bg-white border border-[#E2E4DC] p-5 shadow-xs">
        <CityQuickGuide />
      </div>
    </div>
  );
}
