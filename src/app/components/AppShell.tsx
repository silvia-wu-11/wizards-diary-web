'use client';

import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useSession } from 'next-auth/react';
import { useDiaryStore } from '../store';
import { Loader2, LogOut } from 'lucide-react';
import { Button } from './ui/button';

const AUTH_PATHS = ['/login', '/register'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isLoaded = useDiaryStore((state) => state.isLoaded);
  const isAuthPage = AUTH_PATHS.some((p) => pathname?.startsWith(p));
  const showSignOut = session && !isAuthPage;

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
      {showSignOut && (
        <header className="fixed top-0 right-0 z-50 p-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-faded-gold hover:text-parchment-white hover:bg-rusty-copper/50"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="size-4 mr-1" />
            登出
          </Button>
        </header>
      )}
      {children}
    </div>
  );
}
