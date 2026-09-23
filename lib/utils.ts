import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function decodeGooglePolyline(encoded: string): { lat: number; lng: number }[] {
  if (!encoded) return [];
  const points: { lat: number; lng: number }[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

/**
 * Directly launches the Rapido app on iOS/Android or falls back to official App Store / Play Store.
 * Guarantees zero confusion or accidental routing to other ride apps.
 */
export function openRapidoApp() {
  if (typeof window === 'undefined') return;

  const ua = navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);

  const iosStoreUrl = 'https://apps.apple.com/in/app/rapido-bike-taxi-auto-cabs/id1193166170';
  const androidStoreUrl = 'https://play.google.com/store/apps/details?id=com.rapido.passenger';
  const webFallbackUrl = 'https://rapido.bike/';

  if (isIos) {
    const start = Date.now();
    // Directly request the Rapido app scheme on iOS
    window.location.href = 'rapido://';
    setTimeout(() => {
      // If user is still in the browser after timeout, app is not installed -> route to App Store
      if (Date.now() - start < 2000 && document.hasFocus()) {
        window.open(iosStoreUrl, '_blank');
      }
    }, 1200);
  } else if (isAndroid) {
    // On Android, use standard Android Intent targeting Rapido package
    const intentUrl = 'intent://#Intent;scheme=rapido;package=com.rapido.passenger;end';
    try {
      window.location.href = intentUrl;
    } catch {
      window.open(androidStoreUrl, '_blank');
    }
  } else {
    // Desktop: open Rapido website
    window.open(webFallbackUrl, '_blank');
  }
}
