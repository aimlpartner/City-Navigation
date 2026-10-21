'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LiquidGlass } from './ui/liquid-glass';

interface ThemeToggleProps {
  className?: string;
  variant?: 'icon' | 'compact' | 'pill';
  showLabel?: boolean;
}

export function ThemeToggle({
  className = '',
  variant = 'icon',
  showLabel = false,
}: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === 'dark' : false;

  const toggleTheme = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const nextTheme = isDark ? 'light' : 'dark';

      // Check for View Transitions API support with reduced-motion preference check
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (!document.startViewTransition || prefersReducedMotion) {
        setTheme(nextTheme);
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      const transition = document.startViewTransition(() => {
        setTheme(nextTheme);
      });

      transition.ready.then(() => {
        const clipPath = [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ];

        document.documentElement.animate(
          {
            clipPath: isDark ? [...clipPath].reverse() : clipPath,
          },
          {
            duration: 480,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            pseudoElement: isDark
              ? '::view-transition-old(root)'
              : '::view-transition-new(root)',
          }
        );
      });
    },
    [isDark, setTheme]
  );

  if (!mounted) {
    return (
      <div
        className={`w-10 h-10 rounded-full bg-white/40 dark:bg-black/30 border border-white/60 dark:border-white/10 ${className}`}
      />
    );
  }

  if (variant === 'pill' || showLabel) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        className={`group relative select-none rounded-full cursor-pointer transition-transform duration-150 active:scale-95 ${className}`}
      >
        <LiquidGlass
          radius={999}
          scale={60}
          aberration={8}
          bevelDepth={30}
          frost={1.5}
          tint={isDark ? 0.08 : 0.08}
          className="rounded-full px-3 py-1.5 border border-white/70 dark:border-emerald-400/20 shadow-[0_4px_16px_-2px_rgba(20,52,40,0.12)] dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)] flex items-center gap-2"
          contentClassName="flex items-center gap-2"
        >
          <div className="relative w-4 h-4 flex items-center justify-center">
            <AnimatePresence mode="wait" initial={false}>
              {isDark ? (
                <motion.div
                  key="moon"
                  initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Moon className="w-4 h-4 text-emerald-400" strokeWidth={2} />
                </motion.div>
              ) : (
                <motion.div
                  key="sun"
                  initial={{ rotate: 90, scale: 0.5, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: -90, scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Sun className="w-4 h-4 text-[#B9552C]" strokeWidth={2} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <span className="text-xs font-bold text-[#143428] dark:text-emerald-300">
            {isDark ? 'Night' : 'Light'}
          </span>
        </LiquidGlass>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={`group relative select-none rounded-full cursor-pointer transition-transform duration-150 active:scale-90 ${className}`}
    >
      <LiquidGlass
        radius={999}
        scale={60}
        aberration={8}
        bevelDepth={30}
        frost={1.5}
        tint={isDark ? 0.08 : 0.08}
        className="w-10 h-10 rounded-full border border-white/70 dark:border-emerald-400/25 shadow-[0_6px_20px_-3px_rgba(20,52,40,0.14)] dark:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.6)] flex items-center justify-center p-0"
        contentClassName="w-full h-full flex items-center justify-center"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.div
              key="moon-icon"
              initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex items-center justify-center"
            >
              <Moon className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(56,225,159,0.5)]" strokeWidth={2} />
            </motion.div>
          ) : (
            <motion.div
              key="sun-icon"
              initial={{ rotate: 90, scale: 0.4, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: -90, scale: 0.4, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex items-center justify-center"
            >
              <Sun className="w-4.5 h-4.5 text-[#B9552C] group-hover:rotate-45 transition-transform" strokeWidth={2.1} />
            </motion.div>
          )}
        </AnimatePresence>
      </LiquidGlass>
    </button>
  );
}
