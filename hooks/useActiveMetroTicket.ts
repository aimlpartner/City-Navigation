'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MetroTicket,
  getActiveTicket,
  clearActiveTicket,
  markTicketUsed,
  TICKET_EVENT_NAME,
} from '@/lib/metro-ticketing';

export function useActiveMetroTicket() {
  const [activeTicket, setActiveTicket] = useState<MetroTicket | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const syncTicket = useCallback(() => {
    const ticket = getActiveTicket();
    setActiveTicket(ticket);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    syncTicket();

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<MetroTicket | null>;
      if (customEvent.detail !== undefined) {
        setActiveTicket(customEvent.detail);
      } else {
        syncTicket();
      }
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'metronav_active_metro_ticket') {
        syncTicket();
      }
    };

    window.addEventListener(TICKET_EVENT_NAME, handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);

    // Interval to check ticket expiry every 15s
    const timer = setInterval(() => {
      syncTicket();
    }, 15000);

    return () => {
      window.removeEventListener(TICKET_EVENT_NAME, handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
      clearInterval(timer);
    };
  }, [syncTicket]);

  return {
    activeTicket,
    isLoaded,
    hasActiveTicket: !!activeTicket,
    clearTicket: clearActiveTicket,
    markUsed: (id: string) => markTicketUsed(id),
    syncTicket,
  };
}
