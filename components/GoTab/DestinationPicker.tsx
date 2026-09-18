'use client';

import React, { useState, useMemo } from 'react';
import {
  FamousDestination,
  FAMOUS_DESTINATIONS,
  METRO_STATIONS
} from '@/lib/delhi-ncr-transit';
import {
  Search,
  ArrowLeft,
  X,
  MapPin,
  ShoppingBag,
  Building2,
  Utensils,
  Landmark,
  DoorOpen,
  Check,
  Plane,
  Sparkles,
  TrainFront
} from 'lucide-react';

interface DestinationPickerProps {
  currentDestination: FamousDestination | null;
  originName: string;
  onSelectDestination: (dest: FamousDestination) => void;
  onBackToOrigin: () => void;
}

export function DestinationPicker({
  currentDestination,
  originName,
  onSelectDestination,
  onBackToOrigin,
}: DestinationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Gurgaon' | 'Delhi' | 'Mall' | 'Food'>('All');

  // Filter destinations based on search query and category/city filter
  const filteredDestinations = useMemo(() => {
    return FAMOUS_DESTINATIONS.filter((dest) => {
      // Text search match
      const query = searchQuery.trim().toLowerCase();
      const station = METRO_STATIONS[dest.nearestStationId];
      const matchesQuery =
        !query ||
        dest.name.toLowerCase().includes(query) ||
        dest.city.toLowerCase().includes(query) ||
        dest.category.toLowerCase().includes(query) ||
        (station && station.name.toLowerCase().includes(query));

      if (!matchesQuery) return false;

      // Filter pill match
      if (activeFilter === 'All') return true;
      if (activeFilter === 'Gurgaon') return dest.city === 'Gurgaon';
      if (activeFilter === 'Delhi') return dest.city === 'Delhi';
      if (activeFilter === 'Mall') return dest.category === 'Mall';
      if (activeFilter === 'Food') return dest.category === 'Dining / Nightlife';

      return true;
    });
  }, [searchQuery, activeFilter]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Mall':
        return <ShoppingBag className="w-5 h-5 text-[#B9552C]" />;
      case 'Dining / Nightlife':
        return <Utensils className="w-5 h-5 text-[#B9552C]" />;
      case 'Tech Park / Hub':
        return <Building2 className="w-5 h-5 text-[#143428]" />;
      default:
        return <Landmark className="w-5 h-5 text-[#143428]" />;
    }
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToOrigin}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F4F5F0] border border-[#E2E4DC] text-xs font-bold text-[#143428] shadow-xs active:scale-95 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Change Starting Point</span>
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#143428]/10 text-[#143428] text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Step 2 of 2</span>
        </div>
      </div>

      {/* Origin Context Reminder */}
      <div className="p-3 rounded-xl bg-[#FAF6F3] border border-[#E8C2B3]/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-[#143428] shrink-0" />
          <span className="text-xs text-[#6B7267] truncate">
            From: <strong className="text-[#17201B] font-bold">{originName}</strong>
          </span>
        </div>
        <button
          type="button"
          onClick={onBackToOrigin}
          className="text-[11px] font-bold text-[#B9552C] hover:underline shrink-0"
        >
          Edit
        </button>
      </div>

      {/* Main Title */}
      <div>
        <h2 className="text-2xl font-black text-[#17201B] tracking-tight font-sans">
          Where do you want to go?
        </h2>
        <p className="text-sm text-[#53584E] mt-0.5">
          Tap any destination card to see your exact metro route & exit gate.
        </p>
      </div>

      {/* Big, Friendly Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-[#8E9487]" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search mall, monument, market, metro..."
          className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-white border border-[#D5D8CD] focus:border-[#143428] focus:ring-2 focus:ring-[#143428]/20 text-[#17201B] placeholder-[#8E9487] text-base font-medium shadow-xs outline-none transition"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8E9487] hover:text-[#17201B]"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Quick Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(['All', 'Gurgaon', 'Delhi', 'Mall', 'Food'] as const).map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                isActive
                  ? 'bg-[#143428] text-white shadow-xs'
                  : 'bg-white text-[#53584E] border border-[#E2E4DC] hover:bg-[#F8F9F5]'
              }`}
            >
              {filter === 'All' ? '🌟 All Places' : filter}
            </button>
          );
        })}
      </div>

      {/* Visual Destination Grid (2 Columns, Big Touch Target Cards) */}
      <div className="grid grid-cols-2 gap-3">
        {filteredDestinations.map((dest) => {
          const isSelected = currentDestination?.id === dest.id;
          const nearestStation = METRO_STATIONS[dest.nearestStationId];

          return (
            <button
              key={dest.id}
              type="button"
              onClick={() => onSelectDestination(dest)}
              className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between min-h-[135px] transition-all relative group active:scale-[0.97] ${
                isSelected
                  ? 'bg-[#FAF6F3] border-[#B9552C] ring-2 ring-[#B9552C] shadow-sm'
                  : 'bg-white hover:bg-[#F8F9F5] border-[#E2E4DC] shadow-xs'
              }`}
            >
              {/* Category Icon & Gate Badge */}
              <div className="flex items-start justify-between gap-1 w-full">
                <div className="w-9 h-9 rounded-xl bg-[#F4F5F0] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  {getCategoryIcon(dest.category)}
                </div>

                <span className="px-2 py-0.5 rounded-md bg-[#B9552C] text-white text-[10px] font-extrabold tracking-wide shrink-0">
                  Gate {dest.bestExitGate}
                </span>
              </div>

              {/* Destination Name */}
              <div className="my-1.5">
                <h3 className="text-sm font-black text-[#17201B] line-clamp-2 leading-snug group-hover:text-[#143428] transition-colors">
                  {dest.name}
                </h3>
              </div>

              {/* Station Tag & Line Indicator */}
              <div className="w-full pt-2 border-t border-[#F0F2EB] flex items-center justify-between text-[11px] text-[#6B7267]">
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: nearestStation?.lineColor || '#0284c7' }}
                  />
                  <span className="truncate font-medium">{nearestStation?.name || 'Metro'}</span>
                </div>

                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-[#B9552C] shrink-0 font-bold" strokeWidth={3} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {filteredDestinations.length === 0 && (
        <div className="p-8 text-center bg-white rounded-2xl border border-[#E2E4DC] space-y-2">
          <p className="text-sm font-bold text-[#17201B]">No destinations match &quot;{searchQuery}&quot;</p>
          <p className="text-xs text-[#6B7267]">Try searching for &quot;Ambience&quot;, &quot;Cyber Hub&quot;, or &quot;India Gate&quot;.</p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="mt-2 text-xs font-bold text-[#143428] underline"
          >
            Clear Search
          </button>
        </div>
      )}
    </div>
  );
}
