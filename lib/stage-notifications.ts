import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { calculateDistance, MultiModalTripPlan, TravelModeChoice } from '@/lib/delhi-ncr-transit';

export const STAGE_CHANNEL_ID = 'metronav_stage_progress';
export const ADVISORY_CHANNEL_ID = 'metronav_transit_advisories';
export const ONGOING_TRIP_NOTIFICATION_ID = 9000;

export interface NavigationStage {
  id: string;
  stageBadge: string;
  shortLabel: string;
  title: string;
  body: string;
  largeBody: string;
  summaryText: string;
  lat: number;
  lng: number;
  triggerRadiusMeters: number;
  isFinal?: boolean;
}

export type NotificationPermissionLevel = 'granted' | 'denied' | 'prompt';

let channelsInitialized = false;
let listenersInitialized = false;

export function buildStagesForTripPlan(
  plan: MultiModalTripPlan | null,
  travelMode?: TravelModeChoice
): NavigationStage[] {
  if (!plan) return [];

  const mode = travelMode || plan.travelMode || 'multimodal';
  const shortDest = plan.destination.name.split(',')[0].trim();
  const isDirectRoad = mode === 'driving' || mode === 'walking' || (plan.isDirectRoadRecommended && mode !== 'transit');

  if (isDirectRoad) {
    const midLat = (plan.origin.lat + plan.destination.lat) / 2;
    const midLng = (plan.origin.lng + plan.destination.lng) / 2;
    const totalDistKm = Math.max(
      0.4,
      Math.round(calculateDistance(plan.origin.lat, plan.origin.lng, plan.destination.lat, plan.destination.lng) * 1.25 * 10) / 10
    );
    const modeLabel = mode === 'walking' ? 'Walk' : 'Cab / Drive';

    return [
      {
        id: 'direct-start',
        stageBadge: 'START',
        shortLabel: 'Start',
        title: `${modeLabel} started to ${shortDest}`,
        body: `Distance ${totalDistKm} km (~${plan.liveTraffic?.totalDurationMin || 18} min). Follow live GPS directions.`,
        largeBody: `Heading directly toward ${plan.destination.name} (~${totalDistKm} km). MetroNav will alert you halfway and upon arrival.`,
        summaryText: `Direct ${modeLabel}`,
        lat: plan.origin.lat,
        lng: plan.origin.lng,
        triggerRadiusMeters: 250,
      },
      {
        id: 'direct-midway',
        stageBadge: 'HALFWAY',
        shortLabel: 'En Route',
        title: `Halfway to ${shortDest}`,
        body: `Keep heading toward ${shortDest}. Watch for drop-off entrance signage ahead.`,
        largeBody: `You are midway along your direct corridor to ${plan.destination.name}. Stay alert for entry gates.`,
        summaryText: 'En Route',
        lat: midLat,
        lng: midLng,
        triggerRadiusMeters: 450,
      },
      {
        id: 'direct-arrived',
        stageBadge: 'ARRIVED',
        shortLabel: 'Dest',
        title: `Arrived at ${shortDest}`,
        body: `You have reached ${plan.destination.name}. Trip complete!`,
        largeBody: `Welcome to ${plan.destination.name}. Check MetroNav for entrance details and nearby landmarks.`,
        summaryText: 'Destination Reached',
        lat: plan.destination.lat,
        lng: plan.destination.lng,
        triggerRadiusMeters: 200,
        isFinal: true,
      },
    ];
  }

  const stages: NavigationStage[] = [];
  const primaryLine = plan.metroLeg.lines?.[0];
  const lineDirection = primaryLine?.direction || `towards ${plan.destinationStation.name}`;

  // Stage 01: First Mile Departure -> En Route to Boarding Station
  stages.push({
    id: 'stage-01-first-mile',
    stageBadge: 'STAGE 01',
    shortLabel: 'First Mile',
    title: `Stage 01 • Head to ${plan.originStation.name} Metro`,
    body: `${plan.firstMile.distanceKm} km (~${plan.firstMile.durationMin}m) • ${plan.firstMile.instructions}`,
    largeBody: `${plan.firstMile.instructions} Keep your QR metro ticket ready before security check.`,
    summaryText: `To ${plan.originStation.name}`,
    lat: plan.origin.lat,
    lng: plan.origin.lng,
    triggerRadiusMeters: 300,
  });

  // Stage 02: Reached Origin Metro Station
  stages.push({
    id: 'stage-02-board-metro',
    stageBadge: 'STAGE 02',
    shortLabel: 'Board Metro',
    title: `Reached ${plan.originStation.name} • Board ${plan.originStation.line} Line`,
    body: `Take metro ${lineDirection} (${plan.metroLeg.totalStops} stops, ~${plan.metroLeg.totalDurationMin}m).`,
    largeBody: `Board ${plan.originStation.line} Line (${lineDirection}). Ride ${plan.metroLeg.totalStops} stops toward ${plan.destinationStation.name}. Next major cue will alert you before deboarding.`,
    summaryText: `${plan.originStation.line} Line`,
    lat: plan.originStation.lat,
    lng: plan.originStation.lng,
    triggerRadiusMeters: 380,
  });

  // Optional Interchange Alert(s)
  const transferStations =
    plan.metroLeg.transferStations && plan.metroLeg.transferStations.length > 0
      ? plan.metroLeg.transferStations
      : plan.metroLeg.transferStation
      ? [plan.metroLeg.transferStation]
      : [];

  if (plan.metroLeg.requiresTransfer && transferStations.length > 0) {
    transferStations.forEach((tr, idx) => {
      const nextLeg = plan.metroLeg.lines?.[idx + 1];
      stages.push({
        id: `stage-interchange-${tr.id}-${idx}`,
        stageBadge: 'TRANSFER',
        shortLabel: 'Interchange',
        title: `Interchange at ${tr.name}`,
        body: nextLeg
          ? `Switch to ${nextLeg.line} Line (${nextLeg.direction}) without exiting fare gates.`
          : plan.metroLeg.transferInstruction || 'Follow overhead painted signs to change metro lines.',
        largeBody:
          plan.metroLeg.transferInstruction ||
          `Step off at ${tr.name} and follow the colored ceiling/floor interchange arrows inside the concourse. Do not exit AFC gates.`,
        summaryText: `Transfer: ${tr.name}`,
        lat: tr.lat,
        lng: tr.lng,
        triggerRadiusMeters: 450,
      });
    });
  }

  // Stage 03: Arriving at Destination Station + Exact Exit Gate
  stages.push({
    id: 'stage-03-exit-gate',
    stageBadge: 'STAGE 03',
    shortLabel: `Gate ${plan.metroExit.gateNumber}`,
    title: `Deboard at ${plan.destinationStation.name} • Use Gate ${plan.metroExit.gateNumber}`,
    body: `Exit via Gate ${plan.metroExit.gateNumber} (${plan.metroExit.leadsTo})`,
    largeBody: `Tap out and head directly to Exit Gate ${plan.metroExit.gateNumber} leading to ${plan.metroExit.leadsTo}. ${plan.metroExit.signageTip}`,
    summaryText: `Exit Gate ${plan.metroExit.gateNumber}`,
    lat: plan.destinationStation.lat,
    lng: plan.destinationStation.lng,
    triggerRadiusMeters: 450,
  });

  // Stage 04: Final Arrival at Target Destination
  const lastMileHint =
    plan.lastMile.options?.[0]?.description || plan.lastMile.exactInstructions || `Finish final ${plan.lastMile.distanceKm} km.`;
  stages.push({
    id: 'stage-04-arrived',
    stageBadge: 'STAGE 04',
    shortLabel: 'Arrived',
    title: `Arrived at ${shortDest}`,
    body: `You have arrived near ${shortDest}. Tap to view arrival landmarks & tips.`,
    largeBody: `${lastMileHint} Welcome to ${plan.destination.name}!`,
    summaryText: 'Arrived',
    lat: plan.destination.lat,
    lng: plan.destination.lng,
    triggerRadiusMeters: 200,
    isFinal: true,
  });

  return stages;
}

export async function ensureStageNotificationSetup(): Promise<void> {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return;

  if (!channelsInitialized) {
    try {
      await LocalNotifications.createChannel({
        id: STAGE_CHANNEL_ID,
        name: 'Live Route Stage Updates',
        description: 'Google Maps style turn-by-turn alerts when reaching each metro stage or exit gate',
        importance: 5,
        visibility: 1,
        vibration: true,
        sound: 'default',
      });
      await LocalNotifications.createChannel({
        id: ADVISORY_CHANNEL_ID,
        name: 'Metro & Line Advisories',
        description: 'Real-time transit alerts and ticket pass notifications',
        importance: 4,
        visibility: 1,
        vibration: true,
      });
      channelsInitialized = true;
    } catch (err) {
      console.warn('Notification channel setup error:', err);
    }
  }

  if (!listenersInitialized) {
    listenersInitialized = true;
    try {
      await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        window.dispatchEvent(
          new CustomEvent('metronav:stage-notification-tap', {
            detail: action.notification?.extra || {},
          })
        );
      });
    } catch (err) {
      console.warn('Local notification listener error:', err);
    }

    // Remote FCM Push integration: only register FirebaseMessaging if FCM build flag is enabled
    // (calling PushNotifications.register() without google-services.json throws if Firebase isn't initialized).
    if (process.env.NEXT_PUBLIC_ENABLE_FCM === 'true') {
      try {
        await PushNotifications.addListener('pushNotificationReceived', (push) => {
          void dispatchStageNotification({
            id: Math.floor(Date.now() % 100000) + 10000,
            title: push.title || 'MetroNav Transit Alert',
            body: push.body || 'Tap to view updated metro directions.',
            summaryText: 'Push Advisory',
            channelId: ADVISORY_CHANNEL_ID,
          });
        });
        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          window.dispatchEvent(
            new CustomEvent('metronav:stage-notification-tap', {
              detail: action.notification?.data || {},
            })
          );
        });
        const pushPerm = await PushNotifications.checkPermissions();
        if (pushPerm.receive === 'granted') {
          await PushNotifications.register();
        }
      } catch (err) {
        console.warn('Push notification listener setup skipped:', err);
      }
    }
  }
}

export async function checkNotificationPermission(): Promise<NotificationPermissionLevel> {
  if (typeof window === 'undefined') return 'prompt';

  if (Capacitor.isNativePlatform()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') return 'granted';
      if (status.display === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'prompt';
    }
  }

  if ('Notification' in window) {
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
  }
  return 'prompt';
}

export async function requestNotificationPermission(): Promise<NotificationPermissionLevel> {
  if (typeof window === 'undefined') return 'denied';

  if (Capacitor.isNativePlatform()) {
    await ensureStageNotificationSetup();
    try {
      const res = await LocalNotifications.requestPermissions();
      if (res.display === 'granted') {
        if (process.env.NEXT_PUBLIC_ENABLE_FCM === 'true') {
          try {
            const pRes = await PushNotifications.requestPermissions();
            if (pRes.receive === 'granted') await PushNotifications.register();
          } catch {}
        }
        return 'granted';
      }
      return res.display === 'denied' ? 'denied' : 'prompt';
    } catch {
      return 'denied';
    }
  }

  if ('Notification' in window) {
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted' ? 'granted' : perm === 'denied' ? 'denied' : 'prompt';
    } catch {
      return 'denied';
    }
  }

  return 'denied';
}

export async function dispatchStageNotification(opts: {
  id: number;
  title: string;
  body: string;
  largeBody?: string;
  summaryText?: string;
  ongoing?: boolean;
  autoCancel?: boolean;
  channelId?: string;
  extra?: Record<string, unknown>;
}): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  if (Capacitor.isNativePlatform()) {
    await ensureStageNotificationSetup();
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') return false;

      await LocalNotifications.schedule({
        notifications: [
          {
            id: opts.id,
            title: opts.title,
            body: opts.body,
            largeBody: opts.largeBody || opts.body,
            summaryText: opts.summaryText || 'MetroNav Live Route',
            channelId: opts.channelId || STAGE_CHANNEL_ID,
            smallIcon: 'ic_stat_metronav',
            iconColor: '#5ee9b5',
            ongoing: Boolean(opts.ongoing),
            autoCancel: opts.autoCancel !== false,
            extra: opts.extra || {},
          },
        ],
      });
      return true;
    } catch (err) {
      console.warn('Native notification schedule failed:', err);
      return false;
    }
  }

  // Browser Web Notification API fallback
  if ('Notification' in window && Notification.permission === 'granted' && !opts.ongoing) {
    try {
      new Notification(opts.title, {
        body: opts.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: `metronav-stage-${opts.id}`,
      });
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

export async function notifyStageTransition(
  stage: NavigationStage,
  stageIndex: number,
  nextStage?: NavigationStage
): Promise<boolean> {
  const stageNumberId = 9010 + stageIndex;

  // 1. Fire high-priority heads-up stage notification
  const headsUpSent = await dispatchStageNotification({
    id: stageNumberId,
    title: stage.title,
    body: stage.body,
    largeBody: stage.largeBody,
    summaryText: stage.summaryText,
    ongoing: false,
    autoCancel: true,
    channelId: STAGE_CHANNEL_ID,
    extra: { stageId: stage.id, stageIndex },
  });

  // 2. Maintain Google-Maps-style ongoing route progress notification on Android
  if (Capacitor.isNativePlatform()) {
    if (stage.isFinal) {
      await clearOngoingTripNotification();
    } else if (nextStage) {
      await dispatchStageNotification({
        id: ONGOING_TRIP_NOTIFICATION_ID,
        title: `Next: ${nextStage.title}`,
        body: nextStage.body,
        largeBody: `${stage.stageBadge} complete. Upcoming: ${nextStage.largeBody}`,
        summaryText: `Active • ${stage.stageBadge} -> ${nextStage.stageBadge}`,
        ongoing: true,
        autoCancel: false,
        channelId: STAGE_CHANNEL_ID,
        extra: { ongoing: true, nextStageId: nextStage.id },
      });
    }
  }

  return headsUpSent;
}

export async function clearOngoingTripNotification(): Promise<void> {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.cancel({
      notifications: [{ id: ONGOING_TRIP_NOTIFICATION_ID }],
    });
  } catch {}
}
