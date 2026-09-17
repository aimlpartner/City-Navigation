'use client';

import { useEffect } from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Router error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F4F5F0] text-[#17201B] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#FAF2EE] border border-[#E8C2B3] text-[#B9552C] flex items-center justify-center mb-6 shadow-xs">
        <AlertCircle className="w-7 h-7" strokeWidth={2} />
      </div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-2">Transit Guide Unavailable</h1>
      <p className="text-sm text-[#53584E] max-w-md mb-6 leading-relaxed">
        A temporary error occurred while rendering the transit application. You can reload the route calculations to try again.
      </p>
      <button
        onClick={() => reset()}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#143428] text-white font-semibold text-sm hover:bg-[#1b4334] transition shadow-xs"
      >
        <RotateCw className="w-4 h-4" />
        <span>Try Again</span>
      </button>
    </div>
  );
}
