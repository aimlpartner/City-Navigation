import Link from 'next/link';
import { Compass, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F4F5F0] text-[#17201B] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#143428] text-white flex items-center justify-center mb-6 shadow-md">
        <Compass className="w-7 h-7 text-emerald-300" strokeWidth={2} />
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight mb-2">404</h1>
      <h2 className="text-xl font-bold mb-3">Station or Route Not Found</h2>
      <p className="text-sm text-[#53584E] max-w-md mb-8 leading-relaxed">
        The transit route or page you are looking for does not exist or has moved. Return to the live transit map to search Delhi &amp; Gurgaon routes.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#143428] text-white font-semibold text-sm hover:bg-[#1b4334] transition shadow-xs"
      >
        <Home className="w-4 h-4" />
        <span>Return to Live Transit Guide</span>
      </Link>
    </div>
  );
}
