'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  TrainFront,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Users,
  DoorOpen,
  ArrowRight,
  ExternalLink,
  WifiOff,
  Trash2,
  Share2,
  Sparkles,
} from 'lucide-react';
import { MetroTicket, clearActiveTicket, markTicketUsed, getDmrcWhatsAppUrl } from '@/lib/metro-ticketing';
import { MetroQrCode } from '@/components/MetroQrCode';

interface ActiveTicketPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: MetroTicket | null;
  onMarkUsed?: () => void;
}

export function ActiveTicketPassModal({
  isOpen,
  onClose,
  ticket,
  onMarkUsed,
}: ActiveTicketPassModalProps) {
  const [timeLeftStr, setTimeLeftStr] = useState<string>('');
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!ticket) return;

    const updateCountdown = () => {
      const remainingMs = ticket.expiresAt - Date.now();
      if (remainingMs <= 0) {
        setIsExpired(true);
        setTimeLeftStr('00:00 (Expired)');
      } else {
        setIsExpired(false);
        const totalSec = Math.floor(remainingMs / 1000);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        setTimeLeftStr(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [ticket]);

  if (!isOpen || !ticket) return null;

  const handleCompleteJourney = () => {
    markTicketUsed(ticket.id);
    if (onMarkUsed) onMarkUsed();
    onClose();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Metro Ticket: ${ticket.originStation.name} to ${ticket.destinationStation.name}`,
          text: `MetroNav Transit Pass: ${ticket.passengerCount} rider(s) from ${ticket.originStation.name} to ${ticket.destinationStation.name}. Exit at Gate ${ticket.exitGate?.gateNumber || 'Main'}.`,
        });
      } catch (err) {
        // User cancelled or not supported
      }
    } else {
      navigator.clipboard.writeText(`Metro Ticket ${ticket.id}: ${ticket.originStation.name} -> ${ticket.destinationStation.name}`);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0"
          onClick={onClose}
        />

        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.94, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-sm sm:max-w-md bg-white rounded-[28px] shadow-2xl overflow-hidden z-10 flex flex-col my-auto border border-[#E2E4DC]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Transit Pass Header */}
          <div className="bg-[#143428] text-white p-4 sm:p-5 relative overflow-hidden">
            {/* Dynamic Security Pulse Banner */}
            <div className="flex items-center justify-between pb-3 border-b border-emerald-400/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-400/30">
                  <TrainFront className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <span className="text-[10px] font-mono tracking-wider uppercase text-emerald-300 block font-bold">
                    Delhi Metro • DMRC Pass
                  </span>
                  <span className="font-mono text-xs font-bold text-white tracking-wider">
                    {ticket.id}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                  isExpired
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                    : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-rose-400' : 'bg-emerald-400 animate-ping'}`} />
                  {isExpired ? 'Expired' : 'Active Pass'}
                </span>

                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Station Route Journey */}
            <div className="mt-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white/30"
                    style={{ backgroundColor: ticket.originStation.lineColor }}
                  />
                  <div className="truncate">
                    <span className="text-[9px] uppercase tracking-wider text-emerald-200 block font-semibold">
                      Board At
                    </span>
                    <strong className="text-white text-sm block truncate">{ticket.originStation.name}</strong>
                  </div>
                </div>

                <div className="flex flex-col items-center px-2 shrink-0">
                  <ArrowRight className="w-4 h-4 text-emerald-300" />
                  <span className="text-[9px] text-emerald-200 font-mono mt-0.5">
                    {ticket.originStation.line}
                  </span>
                </div>

                <div className="flex items-center gap-2 min-w-0 text-right justify-end">
                  <div className="truncate">
                    <span className="text-[9px] uppercase tracking-wider text-emerald-200 block font-semibold">
                      Deboard At
                    </span>
                    <strong className="text-white text-sm block truncate">{ticket.destinationStation.name}</strong>
                  </div>
                  <span
                    className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white/30"
                    style={{ backgroundColor: ticket.destinationStation.lineColor }}
                  />
                </div>
              </div>

              {ticket.interchangeStation && (
                <div className="text-[10px] text-emerald-100/90 bg-white/10 px-2.5 py-1 rounded-full text-center">
                  Interchange transfer at <strong>{ticket.interchangeStation.name}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Ticket Body / QR Canvas Section */}
          <div className="p-5 flex flex-col items-center text-center relative bg-gradient-to-b from-[#FAF9F5] to-white">
            {/* Animated Security Scanner Bar */}
            <div className="relative p-2 rounded-[20px] bg-white border border-[#E2E4DC] shadow-sm mb-3.5 overflow-hidden">
              <MetroQrCode value={ticket.qrCodePayload} size={190} />

              {/* Dynamic Scan Line Animation */}
              {!isExpired && (
                <motion.div
                  className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_8px_#10B981]"
                  animate={{ top: ['8%', '92%', '8%'] }}
                  transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                />
              )}
            </div>

            <p className="text-[11px] font-bold text-[#17201B] flex items-center gap-1.5">
              <span>Align QR on turnstile glass scanner</span>
              <span className="text-emerald-700 font-extrabold">• Scan & Pass</span>
            </p>

            {/* Countdown Clock */}
            <div className={`mt-3 px-4 py-1.5 rounded-full flex items-center gap-2 text-xs font-mono font-bold ${
              isExpired
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
            }`}>
              <Clock className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
              <span>Valid to enter gate: </span>
              <span className="text-sm font-black">{timeLeftStr}</span>
            </div>

            {/* Crucial Deboard Exit Gate */}
            {ticket.exitGate && (
              <div className="w-full mt-4 p-3 rounded-xl bg-[#FAF2EE] border border-[#E8C2B3] text-left flex items-start gap-2.5">
                <DoorOpen className="w-4 h-4 text-[#B9552C] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-extrabold text-[#B9552C]">
                    Exit Gate {ticket.exitGate.gateNumber}
                  </div>
                  <div className="text-[11px] text-[#53584E]">
                    Leads straight to: <strong>{ticket.exitGate.leadsTo}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Rider & Pricing Stats */}
            <div className="w-full mt-3 grid grid-cols-2 gap-2 text-left text-xs">
              <div className="p-2.5 rounded-xl bg-[#F8F9F5] border border-[#E2E4DC]">
                <span className="text-[10px] text-[#6B7267] block uppercase font-bold">Riders</span>
                <span className="font-bold text-[#17201B] flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[#143428]" />
                  {ticket.passengerCount} {ticket.passengerCount === 1 ? 'Adult' : 'Adults'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#F8F9F5] border border-[#E2E4DC]">
                <span className="text-[10px] text-[#6B7267] block uppercase font-bold">Fare Paid</span>
                <span className="font-bold text-[#143428] font-mono text-sm">
                  ₹{ticket.totalFare} <span className="text-[10px] text-emerald-700 font-normal">(-10% QR)</span>
                </span>
              </div>
            </div>

            {/* Offline Resilience Note */}
            <div className="w-full mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[#6B7267]">
              <WifiOff className="w-3.5 h-3.5 text-[#8E9487]" />
              <span>Saved offline — works inside underground tunnels</span>
            </div>
          </div>

          {/* Pass Footer Controls */}
          <div className="p-4 border-t border-[#E2E4DC] bg-[#FAF9F5] flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="btn-tactile p-2.5 rounded-xl bg-white hover:bg-gray-100 border border-[#E2E4DC] text-[#17201B] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Share Pass"
            >
              <Share2 className="w-3.5 h-3.5 text-[#53584E]" />
              <span>{isCopied ? 'Copied!' : 'Share'}</span>
            </button>

            {ticket.bookingChannel === 'whatsapp' && (
              <a
                href={getDmrcWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-tactile p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <span>DMRC WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <button
              type="button"
              onClick={handleCompleteJourney}
              className="btn-tactile flex-1 px-4 py-2.5 rounded-xl bg-[#143428] hover:bg-[#1A3E31] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Trip Completed</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
