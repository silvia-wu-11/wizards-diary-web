import { RouterProvider } from 'react-router';
import { router } from './routes';
import '../styles/fonts.css';
import { useDiaryStore } from './store';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function App() {
  const isLoaded = useDiaryStore(state => state.isLoaded);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-castle-stone flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-faded-gold animate-spin mb-4" />
        <p className="text-faded-gold font-display text-xl tracking-widest animate-pulse">Summoning Memories...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full magic-scrollbar overflow-x-hidden">
      <RouterProvider router={router} />
    </div>
  );
}
