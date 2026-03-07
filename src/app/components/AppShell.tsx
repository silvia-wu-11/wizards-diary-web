'use client';

import { useDiaryStore } from '../store';
import { Loader2 } from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const isLoaded = useDiaryStore((state) => state.isLoaded);

  if (!isLoaded) {
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
