'use client';

import React from 'react';
import { Bell, BellRing, CheckCircle2, Navigation, Play, VolumeX } from 'lucide-react';
import { StageNavigationState } from '@/hooks/useStageNavigationNotifier';

interface LiveStageAlertBannerProps {
  stageNav?: StageNavigationState;
  compact?: boolean;
}

export function LiveStageAlertBanner({ stageNav, compact = false }: LiveStageAlertBannerProps) {
  if (!stageNav || stageNav.stages.length === 0) return null;

  const {
    isTracking,
    permissionState,
    stages,
    reachedStageIds,
    distanceToNextM,
    lastNotification,
    toggleTracking,
    triggerNextStagePreview,
  } = stageNav;

  const nextStage = stages.find((s) => !reachedStageIds.includes(s.id));

  return (
    <div
      className={`rounded-2xl border transition-colors ${
        isTracking
          ? 'bg-emerald-50/90 dark:bg-[#0D1E17] border-emerald-200 dark:border-emerald-500/35'
          : 'bg-[#FAF9F5] dark:bg-[#16231D] border-[#E2E4DC] dark:border-white/10'
      } ${compact ? 'p-3' : 'p-3.5 sm:p-4'} space-y-2.5 shadow-xs`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              isTracking
                ? 'bg-[#143428] dark:bg-emerald-500 text-white dark:text-[#061C12]'
                : 'bg-[#143428]/10 dark:bg-white/10 text-[#143428] dark:text-[#5ee9b5]'
            }`}
          >
            {isTracking ? (
              <BellRing className="w-4 h-4 animate-pulse" strokeWidth={2} />
            ) : permissionState === 'denied' ? (
              <VolumeX className="w-4 h-4" strokeWidth={2} />
            ) : (
              <Bell className="w-4 h-4" strokeWidth={2} />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-extrabold text-[#17201B] dark:text-[#F3F5EE]">
                Live Stage Notifications
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isTracking
                    ? 'bg-emerald-500/20 text-[#143428] dark:text-[#5ee9b5] border border-emerald-500/30'
                    : 'bg-[#E2E4DC]/70 dark:bg-white/10 text-[#53584E] dark:text-[#9BAAA0]'
                }`}
              >
                {isTracking ? 'GPS Alerts ON' : 'Tap to Enable'}
              </span>
            </div>
            <p className="text-[11px] text-[#53584E] dark:text-[#9BAAA0] truncate mt-0.5">
              {permissionState === 'denied'
                ? 'Enable Notifications in Android Settings for heads-up stage alerts.'
                : isTracking && nextStage
                ? `Watching next: ${nextStage.shortLabel}${
                    distanceToNextM !== null
                      ? ` (${distanceToNextM < 1000 ? `${distanceToNextM} m` : `${(distanceToNextM / 1000).toFixed(1)} km`} away)`
                      : ''
                  }`
                : 'Push heads-up alerts on your phone as you reach each metro stage & gate.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => void triggerNextStagePreview()}
            className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#111A15] border border-[#D5D8CD] dark:border-white/15 text-[#17201B] dark:text-[#D1DDD6] hover:border-[#143428] dark:hover:border-emerald-400/50 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
            title="Send a live stage notification right now to test alerts on your device"
          >
            <Play className="w-3 h-3 text-[#143428] dark:text-[#5ee9b5]" />
            <span>Test Next Stage</span>
          </button>

          <button
            type="button"
            onClick={() => void toggleTracking()}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
              isTracking
                ? 'bg-[#143428] dark:bg-emerald-500 text-white dark:text-[#061C12] hover:bg-[#1A3E31] dark:hover:bg-emerald-400'
                : 'bg-[#143428] dark:bg-emerald-500 text-white dark:text-[#061C12] hover:bg-[#1E4837] dark:hover:bg-emerald-400'
            }`}
          >
            <Navigation className="w-3 h-3" />
            <span>{isTracking ? 'Active' : 'Start Alerts'}</span>
          </button>
        </div>
      </div>

      {/* Checkpoint Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
        {stages.map((st) => {
          const reached = reachedStageIds.includes(st.id);
          return (
            <span
              key={st.id}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 border ${
                reached
                  ? 'bg-[#143428] dark:bg-emerald-500/25 text-white dark:text-[#5ee9b5] border-[#143428] dark:border-emerald-400/40'
                  : 'bg-white/80 dark:bg-[#111A15] text-[#6B7267] dark:text-[#9BAAA0] border-[#E2E4DC] dark:border-white/10'
              }`}
            >
              {reached && <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />}
              <span>{st.shortLabel}</span>
            </span>
          );
        })}
      </div>

      {lastNotification && (
        <div className="px-2.5 py-1.5 rounded-lg bg-white/90 dark:bg-[#111A15] border border-emerald-200/80 dark:border-emerald-500/25 text-[11px] text-[#17201B] dark:text-[#D1DDD6] flex items-start gap-2">
          <BellRing className="w-3.5 h-3.5 text-[#143428] dark:text-[#5ee9b5] shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="font-bold text-[#143428] dark:text-[#5ee9b5]">{lastNotification.title}: </span>
            <span className="text-[#53584E] dark:text-[#9BAAA0]">{lastNotification.body}</span>
          </div>
        </div>
      )}
    </div>
  );
}
