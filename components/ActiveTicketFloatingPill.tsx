'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrainFront, QrCode, Clock, ChevronRight, X } from 'lucide-react';
import { useActiveMetroTicket } from '@/hooks/useActiveMetroTicket';
import { ActiveTicketPassModal } from './GoTab/ActiveTicketPassModal';

export function ActiveTicketFloatingPill() {
  const { activeTicket, markUsed } = useActiveMetroTicket();
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [timeLeftMin, setTimeLeftMin] = useState<number>(0);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!activeTicket) {
      setIsDismissed(false);
      return;
    }

    const calcTime = () => {
      const remainingMs = activeTicket.expiresAt - Date.now();
      const mins = Math.max(0, Math.ceil(remainingMs / (60 * 1000)));
      setTimeLeftMin(mins);
    };

    calcTime();
    const interval = setInterval(calcTime, 10000);
    return () => clearInterval(interval);
  }, [activeTicket]);

  if (!activeTicket || activeTicket.status !== 'active' || isDismissed) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-[78px] sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-3 pointer-events-none">
        <motion.div
          initial={{ y: 30, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 30, opacity: 0, scale: 0.95 }}
          className="pointer-events-auto bg-[#143428]/95 text-white p-2.5 sm:p-3 rounded-[20px] shadow-2xl border border-emerald-400/40 flex items-center justify-between gap-2.5 backdrop-blur-xl cursor-pointer hover:bg-[#1A3E31] transition active:scale-98"
          onClick={() => setIsOpenModal(true)}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative">
              <div className="w-8 h-8 rounded-[10px] bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-400/40">
                <QrCode className="w-4 h-4 text-emerald-300" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white truncate">
                <span className="truncate">{activeTicket.originStation.name}</span>
                <span className="text-emerald-400">→</span>
                <span className="truncate">{activeTicket.destinationStation.name}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-emerald-200/90 font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-300" />
                  <span>{timeLeftMin}m valid</span>
                </span>
                <span>•</span>
                <span className="text-emerald-300 font-bold">Tap to scan QR</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="px-2.5 py-1 rounded-full bg-emerald-400/20 text-emerald-300 text-[10px] font-extrabold uppercase border border-emerald-400/30 flex items-center gap-1">
              <span>Pass</span>
              <ChevronRight className="w-3 h-3" />
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsDismissed(true);
              }}
              className="p-1 text-emerald-300/60 hover:text-white rounded-full transition"
              title="Dismiss banner"
              aria-label="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </div>

      <ActiveTicketPassModal
        isOpen={isOpenModal}
        onClose={() => setIsOpenModal(false)}
        ticket={activeTicket}
        onMarkUsed={() => {
          markUsed(activeTicket.id);
          setIsOpenModal(false);
        }}
      />
    </>
  );
}
