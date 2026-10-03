/**
 * Metro Ticketing Library for Delhi-NCR (DMRC & Rapid Metro Gurugram)
 * Supports the Hybrid Ticketing architecture:
 * 1. Official DMRC WhatsApp QR Bot integration (+91 96508 55800)
 * 2. In-App Digital QR Transit Pass generator & offline cache
 * 3. 10% DMRC Digital QR discount calculation
 * 4. 60-minute entry gate validity tracking & turnstile readiness
 */

export interface MetroTicket {
  id: string; // e.g. DMRC-QR-84920194
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
  passengerCount: number;
  baseFarePerPerson: number;
  discountPercent: number; // 10% standard DMRC digital QR discount
  discountedFarePerPerson: number;
  totalFare: number;
  totalSavings: number;
  bookingChannel: 'whatsapp' | 'in_app' | 'paytm';
  bookedAt: number; // timestamp ms
  expiresAt: number; // timestamp ms (60 minutes validity for station entry)
  status: 'active' | 'used' | 'expired';
  qrCodePayload: string;
  securityHash: string;
}

export interface TicketPricingSummary {
  passengerCount: number;
  baseFarePerPerson: number;
  discountPercent: number;
  discountedFarePerPerson: number;
  totalBaseFare: number;
  totalFare: number;
  totalSavings: number;
}

const STORAGE_KEY = 'metronav_active_metro_ticket';
const HISTORY_KEY = 'metronav_ticket_history';
export const TICKET_EVENT_NAME = 'metronav_ticket_change';

/**
 * Calculates official DMRC Digital QR discounted pricing
 * (DMRC offers a 10% discount on QR tickets and Smart Cards to incentivize digital transit)
 */
export function calculateTicketPricing(
  baseFarePerPerson: number,
  passengerCount: number = 1
): TicketPricingSummary {
  const count = Math.max(1, Math.min(6, passengerCount));
  const safeBaseFare = Math.max(10, baseFarePerPerson);
  const discountPercent = 10; // Official DMRC digital QR discount

  // Rounded to nearest rupee per DMRC fare rules
  const discountedFarePerPerson = Math.max(10, Math.round(safeBaseFare * (1 - discountPercent / 100)));
  const totalBaseFare = safeBaseFare * count;
  const totalFare = discountedFarePerPerson * count;
  const totalSavings = Math.max(0, totalBaseFare - totalFare);

  return {
    passengerCount: count,
    baseFarePerPerson: safeBaseFare,
    discountPercent,
    discountedFarePerPerson,
    totalBaseFare,
    totalFare,
    totalSavings,
  };
}

/**
 * Returns the official DMRC WhatsApp Bot URL
 * DMRC operates +91 96508 55800 for instant zero-queue QR token generation
 */
export function getDmrcWhatsAppUrl(originName?: string, destinationName?: string): string {
  const message = originName && destinationName
    ? `Hi, I want to book a ticket from ${originName} to ${destinationName}`
    : `Hi`;
  return `https://wa.me/919650855800?text=${encodeURIComponent(message)}`;
}

/**
 * Alternative deep-links
 */
export function getPaytmMetroUrl(): string {
  return 'https://paytm.com/metro-card-recharge';
}

export function getDmrcAppUrl(): string {
  return 'https://play.google.com/store/apps/details?id=com.dmrc.delhimetro';
}

/**
 * Generates an in-app digital metro ticket with security hash & QR payload
 */
export function generateInAppTicket(params: {
  originStation: { name: string; line: string; lineColor: string };
  destinationStation: { name: string; line: string; lineColor: string };
  interchangeStation?: { name: string; line?: string; lineColor?: string };
  exitGate?: { gateNumber: string | number; leadsTo: string };
  passengerCount: number;
  baseFarePerPerson: number;
  channel?: 'in_app' | 'whatsapp' | 'paytm';
}): MetroTicket {
  const pricing = calculateTicketPricing(params.baseFarePerPerson, params.passengerCount);
  const now = Date.now();
  const randomSuffix = Math.floor(10000000 + Math.random() * 90000000);
  const ticketId = `DMRC-QR-${randomSuffix}`;

  // 60-minute validity from purchase to enter the station turnstile (DMRC rule)
  const expiresAt = now + 60 * 60 * 1000;

  // Generate turnstile scanner payload
  const originCode = params.originStation.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase();
  const destCode = params.destinationStation.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase();
  const secHash = Math.random().toString(36).substring(2, 8).toUpperCase();
  const qrCodePayload = `DMRC:TKT:V2:${originCode}:${destCode}:PAX${pricing.passengerCount}:EXP${Math.floor(expiresAt / 1000)}:SEC${secHash}`;

  const ticket: MetroTicket = {
    id: ticketId,
    originStation: params.originStation,
    destinationStation: params.destinationStation,
    interchangeStation: params.interchangeStation,
    exitGate: params.exitGate,
    passengerCount: pricing.passengerCount,
    baseFarePerPerson: pricing.baseFarePerPerson,
    discountPercent: pricing.discountPercent,
    discountedFarePerPerson: pricing.discountedFarePerPerson,
    totalFare: pricing.totalFare,
    totalSavings: pricing.totalSavings,
    bookingChannel: params.channel || 'in_app',
    bookedAt: now,
    expiresAt,
    status: 'active',
    qrCodePayload,
    securityHash: secHash,
  };

  saveActiveTicket(ticket);
  return ticket;
}

/**
 * Saves ticket to localStorage and dispatches change event
 */
export function saveActiveTicket(ticket: MetroTicket): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ticket));

    // Also append to history (keeping last 10)
    const historyJson = localStorage.getItem(HISTORY_KEY);
    const history: MetroTicket[] = historyJson ? JSON.parse(historyJson) : [];
    const updatedHistory = [ticket, ...history.filter(t => t.id !== ticket.id)].slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));

    window.dispatchEvent(new CustomEvent(TICKET_EVENT_NAME, { detail: ticket }));
  } catch (e) {
    console.error('Error saving active metro ticket:', e);
  }
}

/**
 * Gets the current active ticket (or null if none / expired)
 */
export function getActiveTicket(): MetroTicket | null {
  if (typeof window === 'undefined') return null;

  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return null;

    const ticket: MetroTicket = JSON.parse(json);
    const now = Date.now();

    // Check if expired
    if (now > ticket.expiresAt && ticket.status === 'active') {
      ticket.status = 'expired';
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ticket));
      window.dispatchEvent(new CustomEvent(TICKET_EVENT_NAME, { detail: ticket }));
      return null;
    }

    if (ticket.status !== 'active') {
      return null;
    }

    return ticket;
  } catch (e) {
    console.error('Error reading active metro ticket:', e);
    return null;
  }
}

/**
 * Clears or deletes the active ticket
 */
export function clearActiveTicket(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(TICKET_EVENT_NAME, { detail: null }));
  } catch (e) {
    console.error('Error clearing active metro ticket:', e);
  }
}

/**
 * Marks active ticket as used at the exit gate
 */
export function markTicketUsed(ticketId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return;

    const ticket: MetroTicket = JSON.parse(json);
    if (ticket.id === ticketId) {
      ticket.status = 'used';
      localStorage.removeItem(STORAGE_KEY);

      // Update in history
      const historyJson = localStorage.getItem(HISTORY_KEY);
      if (historyJson) {
        const history: MetroTicket[] = JSON.parse(historyJson);
        const updated = history.map(t => (t.id === ticketId ? { ...t, status: 'used' as const } : t));
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      }

      window.dispatchEvent(new CustomEvent(TICKET_EVENT_NAME, { detail: null }));
    }
  } catch (e) {
    console.error('Error marking ticket as used:', e);
  }
}
