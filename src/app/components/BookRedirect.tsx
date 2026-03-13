'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDiaryStore } from '../store';
import { toast } from 'sonner';

export function BookRedirect({ bookId }: { bookId: string }) {
  const router = useRouter();
  const { entries, books } = useDiaryStore();

  useEffect(() => {
    const book = books.find((b) => b.id === bookId);
    if (!book) {
      toast.error('This book seems to have vanished.');
      router.replace('/');
      return;
    }

    const bookEntries = entries
      .filter((e) => e.bookId === bookId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (bookEntries.length > 0) {
      router.replace(`/diary/${bookEntries[0].id}`);
    } else {
      router.replace(`/diary/new?bookId=${bookId}`);
    }
  }, [bookId, entries, books, router]);

  return (
    <div className="min-h-screen bg-[#2c2420] flex items-center justify-center font-display text-faded-gold text-xl">
      Opening book...
    </div>
  );
}
