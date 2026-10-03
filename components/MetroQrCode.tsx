'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface MetroQrCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function MetroQrCode({ value, size = 200, className = '' }: MetroQrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    QRCode.toCanvas(
      canvasRef.current,
      value,
      {
        width: size,
        margin: 2,
        color: {
          dark: '#143428',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      },
      (err) => {
        if (err) {
          console.error('Failed to generate QR code canvas:', err);
          setError('Failed to render QR');
        } else {
          setError(null);
        }
      }
    );
  }, [value, size]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 text-gray-500 text-xs rounded-xl p-4 ${className}`}
        style={{ width: size, height: size }}
      >
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className={`relative inline-flex items-center justify-center p-2 rounded-2xl bg-white border border-[#E2E4DC] shadow-xs ${className}`}>
      <canvas ref={canvasRef} className="rounded-xl block" />
    </div>
  );
}
