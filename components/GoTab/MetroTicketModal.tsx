'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  TrainFront,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users,
  ExternalLink,
  ChevronRight,
  QrCode,
  Zap,
  Info,
  Smartphone,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import {
  calculateTicketPricing,
  saveActiveTicket,
  getDmrcWhatsAppUrl,
  MetroTicket,
} from '@/lib/metro-ticketing';

interface MetroTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  originStation: {
    name: string;
    line: string;
    lineColor: string;
  };
  destinationStation: {
    name: string;
    line: string;
    lineColor: string;
  };
  interchangeStation?: {
    name: string;
    line?: string;
    lineColor?: string;
  };
  exitGate?: {
    gateNumber: string | number;
    leadsTo: string;
  };
  baseFarePerPerson: number;
  initialPassengerCount?: number;
  onTicketSuccess: (ticket: MetroTicket) => void;
}

type UpiAppType = 'generic' | 'gpay' | 'phonepe' | 'paytm';

export function MetroTicketModal({
  isOpen,
  onClose,
  originStation,
  destinationStation,
  interchangeStation,
  exitGate,
  baseFarePerPerson,
  initialPassengerCount = 1,
  onTicketSuccess,
}: MetroTicketModalProps) {
  const [passengerCount, setPassengerCount] = useState<number>(
    Math.max(1, Math.min(6, initialPassengerCount))
  );
  const [selectedUpiApp, setSelectedUpiApp] = useState<UpiAppType>('generic');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pricing = calculateTicketPricing(baseFarePerPerson, passengerCount);

  // 1-Tap In-App Direct Booking via /api/metro/book-ticket
  const handleDirectInAppBooking = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/metro/book-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originStation,
          destinationStation,
          interchangeStation,
          exitGate,
          passengerCount,
          baseFarePerPerson,
          upiApp: selectedUpiApp,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to generate ticket');
      }

      // On mobile devices, trigger native UPI app intent if requested
      if (typeof window !== 'undefined' && data.upiIntentUrl) {
        const isMobile = /android|iphone|ipad/i.test(navigator.userAgent);
        if (isMobile && selectedUpiApp !== 'generic') {
          // Open UPI intent
          window.location.href = data.upiIntentUrl;
        }
      }

      // Save locally for underground offline scanning
      saveActiveTicket(data.ticket);

      // Brief delay for tactile feedback
      setTimeout(() => {
        setIsProcessing(false);
        onTicketSuccess(data.ticket);
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('In-app booking error:', err);
      setErrorMessage(err.message || 'Payment initiation failed. Please try again.');
      setIsProcessing(false);
    }
  };

  // 1-Tap DMRC WhatsApp Booking Fallback
  const handleBookViaWhatsApp = () => {
    const whatsappUrl = getDmrcWhatsAppUrl(originStation.name, destinationStation.name);
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0"
          onClick={onClose}
        />

        <motion.div
          initial={{ y: '100%', opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="relative w-full sm:max-w-lg bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Bar */}
          <div className="bg-[#143428] text-white p-5 pb-4 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[12px] bg-white/10 flex items-center justify-center border border-white/20">
                  <TrainFront className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                    <span>1-Tap Metro Booking</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                      ONDC Transit
                    </span>
                  </h2>
                  <p className="text-[11px] text-emerald-100/80">
                    Instant Gate QR inside app • No queues • 10% Discount
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Route preview strip */}
            <div className="mt-4 p-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white/30"
                  style={{ backgroundColor: originStation.lineColor }}
                />
                <span className="font-bold text-white truncate">{originStation.name}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-200 shrink-0 mx-2" />
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white/30"
                  style={{ backgroundColor: destinationStation.lineColor }}
                />
                <span className="font-bold text-white truncate">{destinationStation.name}</span>
              </div>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-5 overflow-y-auto space-y-4 text-xs text-[#53584E]">
            {/* Passenger Count & Pricing Banner */}
            <div className="p-4 rounded-2xl bg-[#F8F9F5] border border-[#E2E4DC] space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#17201B] font-bold">
                  <Users className="w-4 h-4 text-[#143428]" />
                  <span>Passengers ({passengerCount})</span>
                </div>

                <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-xl border border-[#E2E4DC]">
                  <button
                    type="button"
                    onClick={() => setPassengerCount((p) => Math.max(1, p - 1))}
                    disabled={passengerCount <= 1}
                    className="w-7 h-7 rounded-lg bg-[#F4F5F0] hover:bg-[#EAECE4] disabled:opacity-40 text-[#17201B] font-black text-sm flex items-center justify-center transition cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-sm text-[#17201B] w-4 text-center">
                    {passengerCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPassengerCount((p) => Math.min(6, p + 1))}
                    disabled={passengerCount >= 6}
                    className="w-7 h-7 rounded-lg bg-[#143428] hover:bg-[#1A3E31] disabled:opacity-40 text-white font-black text-sm flex items-center justify-center transition cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Price Calculation Pill */}
              <div className="pt-2 border-t border-[#E2E4DC] flex items-center justify-between text-xs">
                <div>
                  <div className="text-[11px] text-[#6B7267]">
                    Station Token Price: <span className="line-through">₹{pricing.totalBaseFare}</span>
                  </div>
                  <div className="text-[#143428] font-black text-sm flex items-center gap-1.5">
                    <span>Payable: ₹{pricing.totalFare}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Save ₹{pricing.totalSavings}
                    </span>
                  </div>
                </div>

                <span className="text-[11px] font-mono text-[#143428] font-bold bg-white px-2.5 py-1 rounded-lg border border-[#E2E4DC]">
                  ₹{pricing.discountedFarePerPerson}/pax
                </span>
              </div>
            </div>

            {/* Interchange & Exit Guide Chips */}
            {(interchangeStation || exitGate) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                {interchangeStation && (
                  <div className="p-2.5 rounded-xl bg-[#FAF2EE] border border-[#E8C2B3] text-[#B9552C] flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>Change lines at <strong>{interchangeStation.name}</strong></span>
                  </div>
                )}
                {exitGate && (
                  <div className="p-2.5 rounded-xl bg-[#F0F7F4] border border-[#C5E3D5] text-[#143428] flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Deboard at <strong>Gate {exitGate.gateNumber}</strong> ({exitGate.leadsTo})</span>
                  </div>
                )}
              </div>
            )}

            {/* Select Preferred UPI Payment Method */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#6B7267]">
                  Pay Using UPI (Zero Fee):
                </label>
                <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Instant Pass
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* 1. Fast UPI / Instant */}
                <button
                  type="button"
                  onClick={() => setSelectedUpiApp('generic')}
                  className={`p-3 rounded-[14px] border text-left transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                    selectedUpiApp === 'generic'
                      ? 'border-[#143428] bg-[#F4F6F2] shadow-xs'
                      : 'border-[#E2E4DC] bg-white hover:border-[#143428]/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Zap className="w-4 h-4 text-emerald-600" />
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      selectedUpiApp === 'generic' ? 'border-[#143428] bg-[#143428]' : 'border-[#C5C8BD]'
                    }`}>
                      {selectedUpiApp === 'generic' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <div>
                    <span className="font-extrabold text-[#17201B] text-xs block leading-tight">Instant Pass</span>
                    <span className="text-[10px] text-[#6B7267]">Default UPI</span>
                  </div>
                </button>

                {/* 2. Google Pay */}
                <button
                  type="button"
                  onClick={() => setSelectedUpiApp('gpay')}
                  className={`p-3 rounded-[14px] border text-left transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                    selectedUpiApp === 'gpay'
                      ? 'border-[#143428] bg-[#F4F6F2] shadow-xs'
                      : 'border-[#E2E4DC] bg-white hover:border-[#143428]/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      selectedUpiApp === 'gpay' ? 'border-[#143428] bg-[#143428]' : 'border-[#C5C8BD]'
                    }`}>
                      {selectedUpiApp === 'gpay' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <div>
                    <span className="font-extrabold text-[#17201B] text-xs block leading-tight">GPay</span>
                    <span className="text-[10px] text-[#6B7267]">Google Pay</span>
                  </div>
                </button>

                {/* 3. PhonePe */}
                <button
                  type="button"
                  onClick={() => setSelectedUpiApp('phonepe')}
                  className={`p-3 rounded-[14px] border text-left transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                    selectedUpiApp === 'phonepe'
                      ? 'border-[#143428] bg-[#F4F6F2] shadow-xs'
                      : 'border-[#E2E4DC] bg-white hover:border-[#143428]/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Smartphone className="w-4 h-4 text-purple-600" />
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      selectedUpiApp === 'phonepe' ? 'border-[#143428] bg-[#143428]' : 'border-[#C5C8BD]'
                    }`}>
                      {selectedUpiApp === 'phonepe' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <div>
                    <span className="font-extrabold text-[#17201B] text-xs block leading-tight">PhonePe</span>
                    <span className="text-[10px] text-[#6B7267]">UPI Intent</span>
                  </div>
                </button>

                {/* 4. Paytm */}
                <button
                  type="button"
                  onClick={() => setSelectedUpiApp('paytm')}
                  className={`p-3 rounded-[14px] border text-left transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                    selectedUpiApp === 'paytm'
                      ? 'border-[#143428] bg-[#F4F6F2] shadow-xs'
                      : 'border-[#E2E4DC] bg-white hover:border-[#143428]/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <CreditCard className="w-4 h-4 text-sky-600" />
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      selectedUpiApp === 'paytm' ? 'border-[#143428] bg-[#143428]' : 'border-[#C5C8BD]'
                    }`}>
                      {selectedUpiApp === 'paytm' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <div>
                    <span className="font-extrabold text-[#17201B] text-xs block leading-tight">Paytm</span>
                    <span className="text-[10px] text-[#6B7267]">UPI / Wallet</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Error banner if payment fails */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {errorMessage}
              </div>
            )}

            {/* WhatsApp Fallback Option */}
            <div className="pt-1 flex items-center justify-between border-t border-[#E2E4DC] text-[11px]">
              <span className="text-[#6B7267]">Prefer official chatbot?</span>
              <button
                type="button"
                onClick={handleBookViaWhatsApp}
                className="text-[#25D366] hover:text-[#1eb857] font-bold flex items-center gap-1 cursor-pointer"
              >
                <MessageSquare className="w-3 h-3 fill-[#25D366]" />
                <span>Open DMRC WhatsApp (+91 96508 55800)</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* Modal Action Footer */}
          <div className="p-4 sm:p-5 border-t border-[#E2E4DC] bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-left w-full sm:w-auto">
              <span className="text-[10px] text-[#6B7267] block uppercase font-bold tracking-wider">
                Total ({passengerCount} {passengerCount === 1 ? 'Rider' : 'Riders'})
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-[#143428] font-mono">₹{pricing.totalFare}</span>
                <span className="text-xs text-[#6B7267] line-through font-mono">₹{pricing.totalBaseFare}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDirectInAppBooking}
              disabled={isProcessing}
              className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-[#143428] hover:bg-[#1A3E31] active:scale-98 disabled:opacity-75 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Connecting ONDC Gateway & Issuing Pass...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-emerald-300" />
                  <span>Pay ₹{pricing.totalFare} & Issue Pass</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
