'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrainFront,
  MessageSquare,
  CircleHelp,
  Clock,
  IndianRupee,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export function CityQuickGuide() {
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggle = (id: string) => {
    setOpenSection(openSection === id ? null : id);
  };

  return (
    <div className="rounded-[24px] bg-white border border-[#E2E4DC] p-6 sm:p-7 shadow-xs space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-[#143428]/10 text-[#143428] flex items-center justify-center">
          <CircleHelp className="w-4 h-4" strokeWidth={2} />
        </div>
        <div>
          <h3 className="font-bold text-[#17201B] text-sm sm:text-base font-sans">
            Delhi-Gurgaon Newcomer Survival Guide
          </h3>
          <p className="text-xs text-[#6B7267]">
            Crucial unspoken transit rules so you never have to ask anyone
          </p>
        </div>
      </div>

      <div className="space-y-2.5 text-xs">
          {/* Rapid Metro Gurgaon & Sikanderpur */}
        <div className="border border-[#E2E4DC] rounded-2xl overflow-hidden bg-[#F8F9F5]">
          <button
            onClick={() => toggle('rapid-metro')}
            className="w-full p-3.5 text-left font-bold flex items-center justify-between hover:bg-[#EAECE4]/50 transition"
          >
            <div className="flex items-center gap-2.5 text-[#17201B]">
              <TrainFront className="w-4 h-4 text-[#143428] shrink-0" strokeWidth={1.75} />
              <span>How Rapid Metro Gurgaon connects to Delhi Metro</span>
            </div>
            {openSection === 'rapid-metro' ? (
              <ChevronUp className="w-4 h-4 text-[#143428] shrink-0" strokeWidth={2} />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#6B7267] shrink-0" strokeWidth={1.75} />
            )}
          </button>
          <AnimatePresence initial={false}>
            {openSection === 'rapid-metro' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-white text-[#53584E] space-y-2 border-t border-[#E2E4DC] leading-relaxed text-xs">
                  <p>
                    <strong className="text-[#17201B]">Sikanderpur</strong> is the single interchange hub between Delhi Metro (Yellow Line) and Rapid Metro Gurgaon.
                  </p>
                  <ul className="list-disc pl-4 space-y-1.5 text-[#53584E]">
                    <li>You <strong className="text-[#143428]">do not exit the gates</strong> to change trains. A 100-meter air-conditioned elevated skywalk links both platforms directly.</li>
                    <li>Rapid Metro loops through DLF Phase 2, Phase 3, Cyber City, Moulsari Avenue (Ambience Mall), and Golf Course Road (Sectors 54, 55, 56).</li>
                    <li>Standard Delhi Metro Smart Cards and QR tickets work seamlessly on both networks.</li>
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* WhatsApp QR ticketing */}
        <div className="border border-[#E2E4DC] rounded-2xl overflow-hidden bg-[#F8F9F5]">
          <button
            onClick={() => toggle('whatsapp-ticket')}
            className="w-full p-3.5 text-left font-bold flex items-center justify-between hover:bg-[#EAECE4]/50 transition"
          >
            <div className="flex items-center gap-2.5 text-[#17201B]">
              <MessageSquare className="w-4 h-4 text-[#143428] shrink-0" strokeWidth={1.75} />
              <span>Buy Tickets via WhatsApp (Zero Queues & Zero Talking)</span>
            </div>
            {openSection === 'whatsapp-ticket' ? (
              <ChevronUp className="w-4 h-4 text-[#143428] shrink-0" strokeWidth={2} />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#6B7267] shrink-0" strokeWidth={1.75} />
            )}
          </button>
          <AnimatePresence initial={false}>
            {openSection === 'whatsapp-ticket' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-white text-[#53584E] space-y-2 border-t border-[#E2E4DC] leading-relaxed text-xs">
                  <p className="text-[#17201B] font-medium">
                    Never stand in ticket token queues or talk to ticket counter agents:
                  </p>
                  <ol className="list-decimal pl-4 space-y-1.5 text-[#53584E]">
                    <li>Save <strong className="text-[#143428]">+91 96508 55800</strong> (Official DMRC WhatsApp chatbot) or open Paytm / DMRC Momentum 2.0 app.</li>
                    <li>Send <strong className="text-[#17201B]">&quot;Hi&quot;</strong> on WhatsApp and tap &quot;Buy Ticket&quot;.</li>
                    <li>Select boarding and destination stations, pay via UPI (Google Pay / PhonePe / Paytm).</li>
                    <li>You receive a QR code image instantly. Just tap your phone screen on the QR scanner at the automatic entry gates.</li>
                  </ol>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Auto & Cab Pricing Reality */}
        <div className="border border-[#E2E4DC] rounded-2xl overflow-hidden bg-[#F8F9F5]">
          <button
            onClick={() => toggle('cab-rules')}
            className="w-full p-3.5 text-left font-bold flex items-center justify-between hover:bg-[#EAECE4]/50 transition"
          >
            <div className="flex items-center gap-2.5 text-[#17201B]">
              <IndianRupee className="w-4 h-4 text-[#B9552C] shrink-0" strokeWidth={1.75} />
              <span>Gurgaon & Delhi First/Last Mile Pricing Cheat Sheet</span>
            </div>
            {openSection === 'cab-rules' ? (
              <ChevronUp className="w-4 h-4 text-[#B9552C] shrink-0" strokeWidth={2} />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#6B7267] shrink-0" strokeWidth={1.75} />
            )}
          </button>
          <AnimatePresence initial={false}>
            {openSection === 'cab-rules' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-white text-[#53584E] space-y-2 border-t border-[#E2E4DC] leading-relaxed text-xs">
                  <ul className="list-disc pl-4 space-y-1.5 text-[#53584E]">
                    <li><strong className="text-[#17201B]">Shared E-Rickshaw:</strong> ₹10–₹20 per seat. Common at Saket, Central Sec, and Moulsari Ave for short hops under 1.5 km.</li>
                    <li><strong className="text-[#17201B]">Private Auto Rickshaw:</strong> Street autos in Gurgaon rarely use meters. Standard short distance fare is ₹40–₹60.</li>
                    <li><strong className="text-[#B9552C] font-bold">Introvert Best Practice:</strong> Book <em className="text-[#143428] font-medium not-italic">Rapido Auto</em> or <em className="text-[#143428] font-medium not-italic">Uber Auto</em> right as you deboard the metro. The app sets the exact pickup pin and fixed fare, so you simply match the vehicle number and get in without negotiating.</li>
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Timings & Ladies Coach */}
        <div className="border border-[#E2E4DC] rounded-2xl overflow-hidden bg-[#F8F9F5]">
          <button
            onClick={() => toggle('timings')}
            className="w-full p-3.5 text-left font-bold flex items-center justify-between hover:bg-[#EAECE4]/50 transition"
          >
            <div className="flex items-center gap-2.5 text-[#17201B]">
              <Clock className="w-4 h-4 text-[#143428] shrink-0" strokeWidth={1.75} />
              <span>Operating Timings & Reserved Coaches</span>
            </div>
            {openSection === 'timings' ? (
              <ChevronUp className="w-4 h-4 text-[#143428] shrink-0" strokeWidth={2} />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#6B7267] shrink-0" strokeWidth={1.75} />
            )}
          </button>
          <AnimatePresence initial={false}>
            {openSection === 'timings' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-white text-[#53584E] space-y-2 border-t border-[#E2E4DC] leading-relaxed text-xs">
                  <ul className="list-disc pl-4 space-y-1.5 text-[#53584E]">
                    <li><strong className="text-[#17201B]">Hours:</strong> Delhi & Gurgaon Metros run from <strong className="text-[#143428]">05:30 AM to 11:30 PM</strong> daily (Sunday starts at 06:00 AM).</li>
                    <li><strong className="text-[#B9552C]">Reserved Coach:</strong> The very first coach in moving direction is strictly reserved for women travelers. Platform floors are painted pink.</li>
                    <li><strong className="text-[#B9552C]">Rush Hours:</strong> 08:30 AM–10:30 AM and 05:30 PM–07:30 PM on weekdays. Avoid Sikanderpur and Rajiv Chowk during peak rush if crowded spaces cause stress.</li>
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
