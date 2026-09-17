import type {Metadata} from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css'; // Global styles

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-plus-jakarta',
});

export const metadata: Metadata = {
  title: 'MetroNav Delhi-NCR | Live Metro & Bus Transit Guide',
  description: 'Real-time multi-modal transit navigation, live metro & bus schedules, expected delays, and introvert-friendly first/last mile guide for Delhi and Gurgaon.',
  openGraph: {
    title: 'MetroNav Delhi-NCR | Live Metro & Bus Transit Guide',
    description: 'Real-time multi-modal transit navigation, live metro & bus schedules, expected delays, and introvert-friendly first/last mile guide for Delhi and Gurgaon.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MetroNav Delhi-NCR | Live Metro & Bus Transit Guide',
    description: 'Real-time multi-modal transit navigation, live metro & bus schedules, expected delays, and introvert-friendly first/last mile guide for Delhi and Gurgaon.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={plusJakartaSans.className}>
      <body className="bg-[#F4F5F0] text-[#17201B] antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

