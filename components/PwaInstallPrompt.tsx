'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import {
  Download,
  Share2,
  PlusSquare,
  X,
  WifiOff,
  CheckCircle2,
  Smartphone,
  Laptop,
  Globe,
  Sparkles
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function triggerPwaInstall() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-pwa-install'));
  }
}

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOnlineStatus() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

function getServerOnlineStatus() {
  return true;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showUniversalModal, setShowUniversalModal] = useState(false);
  const [activePlatformTab, setActivePlatformTab] = useState<'android' | 'ios' | 'desktop'>('android');
  const [showBanner, setShowBanner] = useState(false);
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineStatus, getServerOnlineStatus);
  const isOffline = !isOnline;
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('MetroNav Service Worker registered with scope:', reg.scope);
          })
          .catch((err) => {
            console.error('Service Worker registration error:', err);
          });
      });
    }

    // 2. Schedule standalone mode and device checks
    const initTimer = setTimeout(() => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;

      if (isStandalone) {
        setIsInstalled(true);
        return;
      }

      // Detect iOS Safari
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
      const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);
      if (isAppleDevice && isSafari) {
        setIsIos(true);
        setActivePlatformTab('ios');
        const dismissed = localStorage.getItem('metronav-ios-prompt-dismissed');
        if (!dismissed) {
          setShowBanner(true);
        }
      } else if (isAppleDevice) {
        setActivePlatformTab('ios');
      } else if (/android/.test(userAgent)) {
        setActivePlatformTab('android');
      } else {
        setActivePlatformTab('desktop');
      }
    }, 1500);

    // 3. Listen for Chromium beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);

      const dismissed = localStorage.getItem('metronav-install-dismissed');
      if (!dismissed) {
        setTimeout(() => setShowBanner(true), 1500);
      }
    };

    // 4. Listen for programmatic install trigger from anywhere in the app
    const handleTriggerInstall = async () => {
      if (deferredPrompt) {
        try {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') {
            setIsInstallable(false);
            setShowBanner(false);
          }
          setDeferredPrompt(null);
        } catch {
          setShowUniversalModal(true);
        }
      } else {
        // If native prompt is not ready (iOS, already prompted, or desktop address bar), show rich modal guide
        setShowUniversalModal(true);
      }
    };

    // 5. Listen for successful install
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setShowBanner(false);
      setShowUniversalModal(false);
      setDeferredPrompt(null);
      setInstallSuccess(true);
      setTimeout(() => setInstallSuccess(false), 4500);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('open-pwa-install', handleTriggerInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      clearTimeout(initTimer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('open-pwa-install', handleTriggerInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      setShowUniversalModal(true);
    }
  };

  const dismissBanner = () => {
    setShowBanner(false);
    if (isIos) {
      localStorage.setItem('metronav-ios-prompt-dismissed', 'true');
    } else {
      localStorage.setItem('metronav-install-dismissed', 'true');
    }
  };

  return (
    <>
      {/* Offline Toast Banner */}
      {isOffline && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#102a20]/95 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-lg animate-bounce">
          <WifiOff className="w-3.5 h-3.5 text-emerald-400" />
          <span>Underground / Offline • Cached metro maps ready</span>
        </div>
      )}

      {/* Install Success Toast */}
      {installSuccess && (
        <div className="fixed top-[calc(max(env(safe-area-inset-top,0px),12px)+8px)] left-1/2 -translate-x-1/2 z-[110] flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#143428] border border-emerald-400/50 text-white text-xs font-bold shadow-2xl animate-in fade-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-4 h-4 text-[#5ee9b5]" />
          <span>MetroNav added to your Home Screen!</span>
        </div>
      )}

      {/* Floating Bottom Install Banner for Mobile/Desktop */}
      {!isInstalled && showBanner && (
        <div className="fixed bottom-[calc(max(env(safe-area-inset-bottom,0px),12px)+84px)] lg:bottom-6 left-3 right-3 lg:left-auto lg:right-6 max-w-md lg:max-w-sm mx-auto lg:mx-0 z-40 bg-[#143428]/95 backdrop-blur-xl border border-emerald-400/30 rounded-2xl p-3 sm:p-4 text-white shadow-2xl transition-all duration-300">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#102a20] border border-emerald-400/30 flex items-center justify-center shrink-0 p-1.5 shadow-inner">
              <Image
                src="/icons/icon.svg"
                alt="MetroNav App Icon"
                width={48}
                height={48}
                unoptimized
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex-1 min-w-0 pr-0.5">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-xs sm:text-sm text-white tracking-tight flex items-center gap-1.5">
                  <span>Download App</span>
                  <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-400/20 text-emerald-300">PWA</span>
                </h4>
                <button
                  onClick={dismissBanner}
                  className="text-emerald-300/60 hover:text-emerald-300 p-1 rounded-lg transition cursor-pointer -mr-1"
                  aria-label="Dismiss banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-emerald-100/70 mt-0.5 leading-snug line-clamp-2">
                One-tap NCR transit guide, live exit gates, and offline station maps.
              </p>

              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={handleInstallClick}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5ee9b5] hover:bg-[#4ade80] text-[#0d211a] text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{deferredPrompt ? 'Install App' : 'Get App'}</span>
                </button>
                <button
                  onClick={dismissBanner}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition cursor-pointer active:scale-95"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Universal Download & Install Instructions Modal */}
      {showUniversalModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4 pb-[max(env(safe-area-inset-bottom,0px),12px)] sm:pb-4 animate-in fade-in duration-200"
          onClick={() => setShowUniversalModal(false)}
        >
          <div
            className="bg-[#143428] border border-emerald-400/30 rounded-3xl p-4 sm:p-6 max-w-lg w-full text-white shadow-2xl relative max-h-[85dvh] sm:max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowUniversalModal(false)}
              className="absolute top-4 right-4 z-10 text-emerald-200/60 hover:text-white p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* App branding */}
            <div className="flex items-center gap-3 sm:gap-3.5 mb-3 sm:mb-4 shrink-0 pr-8">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#102a20] border border-emerald-400/40 p-1.5 sm:p-2 shrink-0 shadow-lg">
                <Image
                  src="/icons/icon.svg"
                  alt="MetroNav"
                  width={56}
                  height={56}
                  unoptimized
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-base sm:text-lg text-white truncate">
                    Download MetroNav
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-[#5ee9b5]/20 text-[#5ee9b5] text-[10px] sm:text-[11px] font-bold shrink-0">
                    Offline Ready
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-emerald-200/80 mt-0.5">
                  Install directly on your phone or desktop without app stores.
                </p>
              </div>
            </div>

            {/* If direct native install prompt is available right now */}
            {deferredPrompt && (
              <div className="mb-3 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-between gap-3 shrink-0">
                <div className="text-xs text-emerald-200">
                  <span className="font-bold text-white block">Ready for 1-Tap Download!</span>
                  Click below to install directly to your device.
                </div>
                <button
                  onClick={handleInstallClick}
                  className="px-4 py-2 rounded-xl bg-[#5ee9b5] text-[#0d211a] font-bold text-xs hover:bg-[#4ade80] transition shrink-0 flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Install Now</span>
                </button>
              </div>
            )}

            {/* Device Platform Selector Tabs */}
            <div className="flex items-center gap-1 sm:gap-1.5 p-1 rounded-2xl bg-[#0e241c] border border-emerald-500/20 mb-3 sm:mb-4 shrink-0">
              <button
                type="button"
                onClick={() => setActivePlatformTab('android')}
                className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 rounded-xl text-[11px] sm:text-xs font-bold transition cursor-pointer ${
                  activePlatformTab === 'android'
                    ? 'bg-[#5ee9b5] text-[#0e241c] shadow-sm'
                    : 'text-emerald-200/70 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Android</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePlatformTab('ios')}
                className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 rounded-xl text-[11px] sm:text-xs font-bold transition cursor-pointer ${
                  activePlatformTab === 'ios'
                    ? 'bg-[#5ee9b5] text-[#0e241c] shadow-sm'
                    : 'text-emerald-200/70 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">iPhone / iPad</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePlatformTab('desktop')}
                className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 rounded-xl text-[11px] sm:text-xs font-bold transition cursor-pointer ${
                  activePlatformTab === 'desktop'
                    ? 'bg-[#5ee9b5] text-[#0e241c] shadow-sm'
                    : 'text-emerald-200/70 hover:text-white'
                }`}
              >
                <Laptop className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Desktop</span>
              </button>
            </div>

            {/* Platform Instructions (Scrollable Middle Area) */}
            <div className="flex-1 overflow-y-auto overscroll-contain pr-1 space-y-3">
              <div className="space-y-2.5 bg-[#0e241c] rounded-2xl p-3.5 sm:p-4 border border-emerald-500/20 text-xs text-emerald-100">
                {activePlatformTab === 'android' && (
                  <>
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-400/20 text-[#5ee9b5] font-black flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </span>
                      <span>
                        Open this page in <strong>Google Chrome</strong> or <strong>Samsung Internet</strong>.
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-400/20 text-[#5ee9b5] font-black flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </span>
                      <span>
                        Tap the <strong>three dots (⋮)</strong> in the top-right corner.
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-400/20 text-[#5ee9b5] font-black flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </span>
                      <span>
                        Tap <strong>&ldquo;Install app&rdquo;</strong> or <strong>&ldquo;Add to Home screen&rdquo;</strong>. It takes 2 seconds!
                      </span>
                    </div>
                  </>
                )}

                {activePlatformTab === 'ios' && (
                  <>
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-400/20 text-[#5ee9b5] font-black flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </span>
                      <span className="leading-relaxed">
                        Make sure you are viewing this page in <strong>Safari</strong> on your iPhone or iPad.
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-400/20 text-[#5ee9b5] font-black flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </span>
                      <span className="leading-relaxed">
                        Tap the <Share2 className="w-3.5 h-3.5 text-[#5ee9b5] inline mx-1" /> <strong>Share</strong> button at the bottom navigation bar.
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-400/20 text-[#5ee9b5] font-black flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </span>
                      <span className="leading-relaxed">
                        Scroll down and tap <PlusSquare className="w-3.5 h-3.5 text-[#5ee9b5] inline mx-1" /> <strong>&ldquo;Add to Home Screen&rdquo;</strong>, then tap <strong>Add</strong>.
                      </span>
                    </div>
                  </>
                )}

                {activePlatformTab === 'desktop' && (
                  <>
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-400/20 text-[#5ee9b5] font-black flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </span>
                      <span className="leading-relaxed">
                        Look at the right side of your <strong>browser URL address bar</strong> for the <Download className="w-3.5 h-3.5 text-[#5ee9b5] inline mx-1" /> <strong>Install</strong> icon.
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-400/20 text-[#5ee9b5] font-black flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </span>
                      <span className="leading-relaxed">
                        Or click the browser menu <strong>(⋮)</strong> &rarr; <strong>&ldquo;Save and share&rdquo;</strong> &rarr; <strong>&ldquo;Install MetroNav&rdquo;</strong>.
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-400/20 text-[#5ee9b5] font-black flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </span>
                      <span className="leading-relaxed">
                        MetroNav will launch as a standalone lightweight desktop app on your taskbar and desktop!
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Offline & Instant Load Perks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px] sm:text-[11px] text-emerald-200/90 shrink-0">
                <div className="p-2 sm:p-2.5 rounded-xl bg-white/5 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#5ee9b5] shrink-0" />
                  <span>Zero app store downloads or logins required</span>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-white/5 flex items-center gap-2">
                  <WifiOff className="w-4 h-4 text-[#5ee9b5] shrink-0" />
                  <span>Works underground without cellular signal</span>
                </div>
              </div>
            </div>

            {/* Bottom Close Button */}
            <button
              onClick={() => setShowUniversalModal(false)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition cursor-pointer shrink-0 mt-2 active:scale-98"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

