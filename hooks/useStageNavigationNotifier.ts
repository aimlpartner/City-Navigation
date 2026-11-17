'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { calculateDistance, MultiModalTripPlan, TravelModeChoice } from '@/lib/delhi-ncr-transit';
import {
  buildStagesForTripPlan,
  checkNotificationPermission,
  clearOngoingTripNotification,
  ensureStageNotificationSetup,
  NavigationStage,
  NotificationPermissionLevel,
  notifyStageTransition,
  requestNotificationPermission,
} from '@/lib/stage-notifications';

export interface StageNavigationState {
  isTracking: boolean;
  permissionState: NotificationPermissionLevel;
  stages: NavigationStage[];
  activeStageIndex: number;
  reachedStageIds: string[];
  distanceToNextM: number | null;
  lastNotification: { title: string; body: string; timestamp: number } | null;
  toggleTracking: () => Promise<void>;
  enableAndStart: () => Promise<void>;
  triggerNextStagePreview: () => Promise<void>;
  resetStages: () => Promise<void>;
}

const TRACKING_PREF_KEY = 'metronav_live_stage_alerts_enabled';

interface RouteProgressSnapshot {
  signature: string;
  activeStageIndex: number;
  reachedStageIds: string[];
  distanceToNextM: number | null;
}

export function useStageNavigationNotifier(
  plan: MultiModalTripPlan | null,
  travelMode?: TravelModeChoice
): StageNavigationState {
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [permissionState, setPermissionState] = useState<NotificationPermissionLevel>('prompt');
  const [lastNotification, setLastNotification] = useState<{
    title: string;
    body: string;
    timestamp: number;
  } | null>(null);

  const stages = useMemo(() => buildStagesForTripPlan(plan, travelMode), [plan, travelMode]);

  const routeSignature = useMemo(() => {
    if (!plan) return '';
    return `${plan.origin.lat.toFixed(4)},${plan.origin.lng.toFixed(4)}->${plan.destination.lat.toFixed(4)},${plan.destination.lng.toFixed(4)}:${travelMode || plan.travelMode || 'multimodal'}`;
  }, [plan, travelMode]);

  const [progress, setProgress] = useState<RouteProgressSnapshot>({
    signature: routeSignature,
    activeStageIndex: 0,
    reachedStageIds: [],
    distanceToNextM: null,
  });

  const activeStageIndex = progress.signature === routeSignature ? progress.activeStageIndex : 0;
  const reachedStageIds = useMemo(
    () => (progress.signature === routeSignature ? progress.reachedStageIds : []),
    [progress, routeSignature]
  );
  const distanceToNextM = progress.signature === routeSignature ? progress.distanceToNextM : null;

  const reachedSetRef = useRef<Set<string>>(new Set());
  const activeStageIndexRef = useRef<number>(0);
  const lastSignatureRef = useRef<string>(routeSignature);
  const watchIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      await ensureStageNotificationSetup();
      const perm = await checkNotificationPermission();
      if (!mounted) return;
      setPermissionState(perm);
      try {
        const savedPref = localStorage.getItem(TRACKING_PREF_KEY);
        if (perm === 'granted' && savedPref !== 'false') {
          setIsTracking(true);
        }
      } catch {}
    };
    void init();
    return () => {
      mounted = false;
    };
  }, []);

  // Keep refs & Android ongoing notification clean when route signature changes
  useEffect(() => {
    if (lastSignatureRef.current === routeSignature) return;
    lastSignatureRef.current = routeSignature;
    reachedSetRef.current = new Set();
    activeStageIndexRef.current = 0;
    void clearOngoingTripNotification();
  }, [routeSignature]);

  const fireStageAtIndex = useCallback(
    async (index: number) => {
      const stage = stages[index];
      if (!stage) return;

      reachedSetRef.current.add(stage.id);
      const nextIndex = Math.min(index + 1, Math.max(0, stages.length - 1));
      activeStageIndexRef.current = index;

      setProgress((prev) => ({
        signature: routeSignature,
        activeStageIndex: index,
        reachedStageIds: Array.from(reachedSetRef.current),
        distanceToNextM: prev.signature === routeSignature ? prev.distanceToNextM : null,
      }));
      setLastNotification({
        title: stage.title,
        body: stage.body,
        timestamp: Date.now(),
      });

      const nextStage = !stage.isFinal ? stages[nextIndex] : undefined;
      await notifyStageTransition(stage, index, nextStage);
    },
    [stages, routeSignature]
  );

  const evaluateCoordinates = useCallback(
    (lat: number, lng: number) => {
      if (!stages.length) return;

      const nextUnreachedIdx = stages.findIndex((s) => !reachedSetRef.current.has(s.id));
      const targetStage = stages[nextUnreachedIdx >= 0 ? nextUnreachedIdx : stages.length - 1];
      if (targetStage) {
        const distM = Math.round(calculateDistance(lat, lng, targetStage.lat, targetStage.lng) * 1000);
        setProgress((prev) => ({
          signature: routeSignature,
          activeStageIndex: prev.signature === routeSignature ? prev.activeStageIndex : 0,
          reachedStageIds: prev.signature === routeSignature ? prev.reachedStageIds : [],
          distanceToNextM: distM,
        }));
      }

      for (let i = activeStageIndexRef.current; i < stages.length; i++) {
        const st = stages[i];
        if (reachedSetRef.current.has(st.id)) continue;

        const distMeters = calculateDistance(lat, lng, st.lat, st.lng) * 1000;
        if (distMeters <= st.triggerRadiusMeters) {
          void fireStageAtIndex(i);
          break;
        }
      }
    },
    [stages, routeSignature, fireStageAtIndex]
  );

  useEffect(() => {
    const cleanupWatch = () => {
      if (watchIdRef.current !== null) {
        if (Capacitor.isNativePlatform() && typeof watchIdRef.current === 'string') {
          void Geolocation.clearWatch({ id: watchIdRef.current });
        } else if (typeof navigator !== 'undefined' && navigator.geolocation && typeof watchIdRef.current === 'number') {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        watchIdRef.current = null;
      }
    };

    if (!isTracking || stages.length === 0) {
      cleanupWatch();
      return;
    }

    let cancelled = false;

    const startWatcher = async () => {
      if (reachedSetRef.current.size === 0 && stages[0]) {
        await fireStageAtIndex(0);
      }

      if (Capacitor.isNativePlatform()) {
        try {
          const geoPerm = await Geolocation.checkPermissions();
          if (geoPerm.location !== 'granted' && geoPerm.coarseLocation !== 'granted') {
            await Geolocation.requestPermissions();
          }
          const id = await Geolocation.watchPosition(
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 },
            (position, err) => {
              if (cancelled || err || !position) return;
              evaluateCoordinates(position.coords.latitude, position.coords.longitude);
            }
          );
          if (!cancelled) {
            watchIdRef.current = id;
          } else {
            void Geolocation.clearWatch({ id });
          }
        } catch (err) {
          console.warn('Capacitor Geolocation watch failed:', err);
        }
        return;
      }

      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        const webWatchId = navigator.geolocation.watchPosition(
          (pos) => {
            if (cancelled) return;
            evaluateCoordinates(pos.coords.latitude, pos.coords.longitude);
          },
          (err) => {
            console.warn('Web geolocation watch note:', err.message);
          },
          { enableHighAccuracy: true, maximumAge: 8000, timeout: 15000 }
        );
        watchIdRef.current = webWatchId;
      }
    };

    void startWatcher();

    return () => {
      cancelled = true;
      cleanupWatch();
    };
  }, [isTracking, stages, fireStageAtIndex, evaluateCoordinates]);

  const enableAndStart = useCallback(async () => {
    const perm = await requestNotificationPermission();
    setPermissionState(perm);

    if (Capacitor.isNativePlatform()) {
      try {
        await Geolocation.requestPermissions();
      } catch {}
    }

    try {
      localStorage.setItem(TRACKING_PREF_KEY, 'true');
    } catch {}
    setIsTracking(true);
  }, []);

  const toggleTracking = useCallback(async () => {
    if (isTracking) {
      setIsTracking(false);
      try {
        localStorage.setItem(TRACKING_PREF_KEY, 'false');
      } catch {}
      await clearOngoingTripNotification();
      return;
    }
    await enableAndStart();
  }, [isTracking, enableAndStart]);

  const triggerNextStagePreview = useCallback(async () => {
    if (!stages.length) return;
    if (permissionState !== 'granted') {
      const perm = await requestNotificationPermission();
      setPermissionState(perm);
    }

    const nextIdx = stages.findIndex((s) => !reachedSetRef.current.has(s.id));
    if (nextIdx >= 0) {
      await fireStageAtIndex(nextIdx);
    } else {
      reachedSetRef.current = new Set();
      setProgress({
        signature: routeSignature,
        activeStageIndex: 0,
        reachedStageIds: [],
        distanceToNextM: null,
      });
      await fireStageAtIndex(0);
    }
  }, [stages, permissionState, routeSignature, fireStageAtIndex]);

  const resetStages = useCallback(async () => {
    reachedSetRef.current = new Set();
    activeStageIndexRef.current = 0;
    setProgress({
      signature: routeSignature,
      activeStageIndex: 0,
      reachedStageIds: [],
      distanceToNextM: null,
    });
    await clearOngoingTripNotification();
  }, [routeSignature]);

  return {
    isTracking,
    permissionState,
    stages,
    activeStageIndex,
    reachedStageIds,
    distanceToNextM,
    lastNotification,
    toggleTracking,
    enableAndStart,
    triggerNextStagePreview,
    resetStages,
  };
}
