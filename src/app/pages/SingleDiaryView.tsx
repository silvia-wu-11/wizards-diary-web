import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDiaryStore } from '../lib/store';
import { Book3D } from '../components/diary/Book3D';
import { MagicalButton } from '../components/ui/MagicalButton';
import { ArrowLeft, Edit, Trash, Share2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SingleDiaryView() {
  const params = useParams();
  const id = params.id as string | undefined;
  const router = useRouter();
  const { getEntryById, deleteEntry } = useDiaryStore();
  
  const entry = id ? getEntryById(id) : undefined;

  if (!entry) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-[#EBE5DC]">
        <h2 className="text-3xl mb-4 font-bold" style={{ fontFamily: 'var(--font-magic)' }}>Memory Not Found</h2>
        <p className="mb-8 font-serif italic">It seems this page has been torn from the archives.</p>
        <MagicalButton onClick={() => router.push('/')}>Return to Safety</MagicalButton>
      </div>
    );
  }

  const handleDelete = () => {
    if (confirm("Are you sure you want to burn this memory forever?")) {
        deleteEntry(entry.id);
        toast.success("The memory has been obliterated.");
        router.push('/');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-8">
        <MagicalButton variant="secondary" onClick={() => router.push('/')}>
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </MagicalButton>

        <div className="text-[#C9B896] font-serif italic">
           Reading from the archives...
        </div>
      </div>

      {/* Main 3D Book View */}
      <div className="flex-1 flex items-center justify-center py-10">
        <Book3D entry={entry} onClose={() => router.push('/')} />
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#2D2A26] to-transparent flex justify-center gap-4 z-50">
        <MagicalButton variant="secondary" onClick={() => toast.info("Editing spells are not yet mastered.")}>
          <Edit className="w-4 h-4" />
          <span className="hidden md:inline">Edit</span>
        </MagicalButton>
        <MagicalButton variant="secondary" onClick={handleDelete} className="hover:!text-red-400">
          <Trash className="w-4 h-4" />
          <span className="hidden md:inline">Burn</span>
        </MagicalButton>
        <MagicalButton variant="secondary" onClick={() => toast.success("Copied to clipboard!")}>
          <Share2 className="w-4 h-4" />
          <span className="hidden md:inline">Share</span>
        </MagicalButton>
      </div>
    </div>
  );
}
