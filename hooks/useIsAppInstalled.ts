'use client';

import { useState, useEffect } from 'react';

/**
 * Checks whether the web app is running as an installed PWA / standalone application
 * or has been marked as installed on the device.
 */
export function checkIsAppInstalled(): boolean {
  if (typeof window === 'undefined') return false;

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.startsWith('android-app://');

  const isMarkedInstalled =
    typeof localStorage !== 'undefined' &&
    localStorage.getItem('metronav-app-installed') === 'true';

  return Boolean(isStandalone || isMarkedInstalled);
}

/**
 * React hook that returns true if the app is currently running in standalone
 * installed mode on mobile/desktop, or if the user has installed the PWA.
 */
export function useIsAppInstalled(): boolean {
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    const update = () => {
      const installed = checkIsAppInstalled();
      setIsInstalled(installed);
      if (installed && typeof localStorage !== 'undefined') {
        localStorage.setItem('metronav-app-installed', 'true');
      }
    };

    update();

    const mqlStandalone = window.matchMedia('(display-mode: standalone)');
    const handleMqlChange = () => update();

    if (mqlStandalone.addEventListener) {
      mqlStandalone.addEventListener('change', handleMqlChange);
    } else {
      mqlStandalone.addListener(handleMqlChange);
    }

    const handleAppInstalled = () => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('metronav-app-installed', 'true');
      }
      setIsInstalled(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('app-installed-change', update);

    return () => {
      if (mqlStandalone.removeEventListener) {
        mqlStandalone.removeEventListener('change', handleMqlChange);
      } else {
        mqlStandalone.removeListener(handleMqlChange);
      }
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('app-installed-change', update);
    };
  }, []);

  return isInstalled;
}
