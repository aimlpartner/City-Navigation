'use client';

import React from 'react';

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
      badge: hasActiveRoute ? 'Active' : undefined,
    },
    {
      id: 'map' as MobileTab,
      label: 'Map',
    },
    {
      id: 'guide' as MobileTab,
      label: 'Guide',
    },
  ];

  const renderTabIcon = (id: MobileTab, isActive: boolean) => {
    if (id === 'go') {
      if (isActive) {
        return (
          <svg
            viewBox="0 0 24 24"
            className="w-6 h-6 text-[#143428] transition-transform duration-200 scale-105"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" fill="#143428" stroke="#143428" strokeWidth="1.5" />
            <polygon
              points="16.24 7.76 14.14 14.14 7.76 16.24 9.86 9.86 16.24 7.76"
              fill="#FFFFFF"
              stroke="#FFFFFF"
              strokeWidth="0.5"
            />
            <circle cx="12" cy="12" r="1.5" fill="#B9552C" />
          </svg>
        );
      }
      return (
        <svg
          viewBox="0 0 24 24"
          className="w-6 h-6 text-[#8E9487] transition-transform duration-200"
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
            className="w-6 h-6 text-[#143428] transition-transform duration-200 scale-105"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"
              fill="#143428"
              stroke="#143428"
              strokeWidth="1"
            />
            <path d="M15 5.764v15" stroke="#FFFFFF" strokeWidth="1.75" strokeLinecap="round" />
            <path d="M9 3.236v15" stroke="#FFFFFF" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        );
      }
      return (
        <svg
          viewBox="0 0 24 24"
          className="w-6 h-6 text-[#8E9487] transition-transform duration-200"
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
            className="w-6 h-6 text-[#143428] transition-transform duration-200 scale-105"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"
              fill="#143428"
              stroke="#143428"
              strokeWidth="1"
            />
            <path d="M12 7v14" stroke="#FFFFFF" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        );
      }
      return (
        <svg
          viewBox="0 0 24 24"
          className="w-6 h-6 text-[#8E9487] transition-transform duration-200"
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
      className="w-full shrink-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E2E4DC] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] lg:hidden pt-1.5 bottom-nav-safe"
    >
      <div className="max-w-md mx-auto px-4 flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              aria-selected={isActive}
              role="tab"
              className={`flex flex-col items-center justify-center min-w-[72px] min-h-[44px] py-0.5 px-2 transition-all duration-200 relative cursor-pointer ${
                isActive
                  ? 'text-[#143428]'
                  : 'text-[#6B7267] hover:text-[#17201B] active:scale-95'
              }`}
            >
              <div className="relative">
                {renderTabIcon(tab.id, isActive)}
                {tab.badge && (
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-[#B9552C] ring-2 ring-white" />
                )}
              </div>

              <span
                className={`text-[11.5px] font-sans mt-0.5 tracking-tight transition-colors ${
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
