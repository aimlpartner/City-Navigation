'use client';

import React from 'react';
import { Compass, Map, BookOpen } from 'lucide-react';

export type MobileTab = 'go' | 'map' | 'guide';

interface BottomTabBarProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  hasActiveRoute?: boolean;
}

export function BottomTabBar({ activeTab, onTabChange, hasActiveRoute = false }: BottomTabBarProps) {
  const tabs = [
    {
      id: 'go' as MobileTab,
      label: hasActiveRoute ? 'My Route' : 'Go',
      icon: Compass,
      badge: hasActiveRoute ? 'Active' : undefined,
    },
    {
      id: 'map' as MobileTab,
      label: 'Map',
      icon: Map,
    },
    {
      id: 'guide' as MobileTab,
      label: 'Guide',
      icon: BookOpen,
    },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-[#E2E4DC] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] lg:hidden"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
      }}
    >
      <div className="max-w-md mx-auto px-4 pt-1.5 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              aria-selected={isActive}
              role="tab"
              className={`flex flex-col items-center justify-center min-w-[72px] min-h-[52px] py-1 px-3 rounded-2xl transition-all duration-200 relative ${
                isActive
                  ? 'text-[#143428]'
                  : 'text-[#6B7267] hover:text-[#17201B] active:scale-95'
              }`}
            >
              {/* Active subtle pill background */}
              {isActive && (
                <span className="absolute inset-0 bg-[#143428]/8 rounded-2xl -z-10 animate-fade-in" />
              )}

              <div className="relative">
                <Icon
                  className={`w-6 h-6 transition-transform duration-200 ${
                    isActive ? 'scale-110 text-[#143428]' : 'text-[#8E9487]'
                  }`}
                  strokeWidth={isActive ? 2.5 : 1.75}
                />
                {tab.badge && (
                  <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-[#B9552C] ring-2 ring-white" />
                )}
              </div>

              <span
                className={`text-[13px] font-sans mt-1 tracking-tight transition-colors ${
                  isActive ? 'font-bold text-[#143428]' : 'font-medium text-[#6B7267]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
