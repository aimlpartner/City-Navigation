"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type LiquidGlassProps = HTMLAttributes<HTMLDivElement> & {
  contentClassName?: string;
  /** Corner radius in px. Default 999 (pill). */
  radius?: number;
  /** Preserved for API compatibility with callers. */
  bevelDepth?: number;
  /** Preserved for API compatibility with callers. */
  scale?: number;
  /** Preserved for API compatibility with callers. */
  aberration?: number;
  /** Preserved for API compatibility with callers. */
  frost?: number;
  /** Preserved for API compatibility with callers. */
  tint?: number;
};

/**
 * Lightweight frosted surface container.
 * Uses clean semi-opaque CSS backgrounds and soft borders instead of SVG displacement filters
 * so scrolling, typing, and map interactions remain lag-free.
 */
export function LiquidGlass({
  children,
  className,
  contentClassName,
  radius = 999,
  bevelDepth: _bevelDepth,
  scale: _scale,
  aberration: _aberration,
  frost: _frost,
  tint: _tint,
  style,
  ...rest
}: LiquidGlassProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-white/95 dark:bg-[#111915]/95 border border-[#E2E4DC] dark:border-white/12 shadow-[0_6px_20px_-4px_rgba(20,52,40,0.08)] dark:shadow-[0_10px_28px_-4px_rgba(0,0,0,0.6)]",
        className,
      )}
      style={{
        borderRadius: radius,
        ...style,
      }}
      {...rest}
    >
      {contentClassName ? (
        <div className={cn("relative z-10", contentClassName)}>{children}</div>
      ) : (
        children
      )}
    </div>
  );
}
