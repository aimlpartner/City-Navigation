'use client';

import React from 'react';
import { motion } from 'motion/react';

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
      badge: hasActiveRoute,
    },
    {
      id: 'map' as MobileTab,
      label: 'Map',
      badge: false,
    },
    {
      id: 'guide' as MobileTab,
      label: 'Guide',
      badge: false,
    },
  ];

  const renderTabIcon = (id: MobileTab, isActive: boolean) => {
    if (id === 'go') {
      if (isActive) {
        return (
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 text-[#5ee9b5] transition-transform duration-200"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" fill="#1A3E31" stroke="#5ee9b5" strokeWidth="1.75" />
            <polygon
              points="16.24 7.76 14.14 14.14 7.76 16.24 9.86 9.86 16.24 7.76"
              fill="#FFFFFF"
              stroke="#FFFFFF"
              strokeWidth="0.5"
            />
            <circle cx="12" cy="12" r="1.5" fill="#5ee9b5" />
          </svg>
        );
      }
      return (
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4 text-[#6B7267] transition-transform duration-200"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.14 14.14 7.76 16.24 9.86 9.86 16.24 7.76" />
        </svg>
      );
    }

    if (id === 'map') {
      if (isActive) {
        return (
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 text-[#5ee9b5] transition-transform duration-200"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"
              fill="#1A3E31"
              stroke="#5ee9b5"
              strokeWidth="1.5"
            />
            <path d="M15 5.764v15" stroke="#FFFFFF" strokeWidth="1.75" strokeLinecap="round" />
            <path d="M9 3.236v15" stroke="#FFFFFF" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        );
      }
      return (
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4 text-[#6B7267] transition-transform duration-200"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
          <path d="M15 5.764v15" />
          <path d="M9 3.236v15" />
        </svg>
      );
    }

    if (id === 'guide') {
      if (isActive) {
        return (
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 text-[#5ee9b5] transition-transform duration-200"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"
              fill="#1A3E31"
              stroke="#5ee9b5"
              strokeWidth="1.5"
            />
            <path d="M12 7v14" stroke="#FFFFFF" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        );
      }
      return (
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4 text-[#6B7267] transition-transform duration-200"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 7v14" />
          <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
        </svg>
      );
    }

    return null;
  };

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-3 sm:bottom-4 z-40 flex justify-center pointer-events-none px-4 pb-[env(safe-area-inset-bottom,0px)] lg:hidden"
    >
      <div className="pointer-events-auto floating-capsule-glass rounded-full p-1.5 flex items-center gap-1 shadow-2xl relative">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              aria-selected={isActive}
              role="tab"
              whileTap={{ scale: 0.90 }}
              whileHover={{ scale: 1.04 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              className={`relative z-10 flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full cursor-pointer select-none ${
                isActive
                  ? 'text-white'
                  : 'text-[#53584E] hover:text-[#17201B]'
              }`}
            >
              {/* Motion Spring Animated Pill Background */}
              {isActive && (
                <motion.div
                  layoutId="floating-capsule-indicator"
                  className="absolute inset-0 rounded-full bg-[#143428] shadow-[0_2px_10px_rgba(20,52,40,0.35)]"
                  transition={{ type: 'spring', stiffness: 440, damping: 34 }}
                />
              )}

              {/* Icon & Label */}
              <div className="relative z-10 flex items-center gap-1.5">
                <div className="relative flex items-center justify-center">
                  {renderTabIcon(tab.id, isActive)}
                  {tab.badge && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#5ee9b5]" />
                    </span>
                  )}
                </div>

                <span
                  className={`text-xs font-sans tracking-tight transition-colors ${
                    isActive ? 'font-bold text-white' : 'font-semibold text-[#53584E]'
                  }`}
                >
                  {tab.label}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
