import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-plus-jakarta',
});

export const viewport: Viewport = {
  themeColor: '#F4F5F0',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || 'http://localhost:3000'),
  title: 'MetroNav Delhi-NCR | Live Metro & Bus Transit Guide',
  description: 'Real-time multi-modal transit navigation, live metro & bus schedules, expected delays, and introvert-friendly first/last mile guide for Delhi and Gurgaon.',
  applicationName: 'MetroNav',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MetroNav',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'MetroNav Delhi-NCR | Live Metro & Bus Transit Guide',
    description: 'Real-time multi-modal transit navigation, live metro & bus schedules, expected delays, and introvert-friendly first/last mile guide for Delhi and Gurgaon.',
    type: 'website',
    images: ['/icons/icon-512x512.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MetroNav Delhi-NCR | Live Metro & Bus Transit Guide',
    description: 'Real-time multi-modal transit navigation, live metro & bus schedules, expected delays, and introvert-friendly first/last mile guide for Delhi and Gurgaon.',
    images: ['/icons/icon-512x512.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plusJakartaSans.className}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MetroNav" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="bg-[#F4F5F0] text-[#17201B] antialiased" suppressHydrationWarning>
        <PwaInstallPrompt />
        {children}
      </body>
    </html>
  );
}
