'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useDiaryStore } from '../store';
import { Loader2 } from 'lucide-react';

const AUTH_PATHS = ['/login', '/register'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoaded = useDiaryStore((state) => state.isLoaded);
  const isAuthPage = AUTH_PATHS.some((p) => pathname?.startsWith(p));

  if (!isLoaded && !isAuthPage) {
    return (
      <div className="min-h-screen bg-castle-stone flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-faded-gold animate-spin mb-4" />
        <p className="text-faded-gold font-display text-xl tracking-widest animate-pulse">
          Summoning Memories...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full magic-scrollbar overflow-x-hidden">
      {children}
    </div>
  );
}
