import React, { useState } from 'react';
import { Search, Filter, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StickyToolbarProps {
  onSearch: (query: string) => void;
  onFilterDate: (date: string) => void;
  onFilterTag: (tag: string) => void; // Simplified for now
}

export function StickyToolbar({ onSearch }: StickyToolbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  // We'll detect scroll in the parent or use an IntersectionObserver, 
  // but for sticky, CSS `sticky` is easiest.

  return (
    <div className="sticky top-4 z-40 mb-8 mx-auto max-w-2xl">
      <motion.div 
        layout
        className="bg-[#EBE5DC] rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-[#C9B896]/50 p-2 flex items-center gap-2 relative overflow-hidden"
        style={{
             backgroundImage: `url('https://images.unsplash.com/photo-1690983331198-b32a245b13cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbGQlMjBwYXJjaG1lbnQlMjBwYXBlciUyMHRleHR1cmUlMjB2aW50YWdlfGVufDF8fHx8MTc3MjYzOTg2Nnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral')`,
             backgroundSize: 'cover'
        }}
      >
        <div className="absolute inset-0 bg-[#EBE5DC]/80 backdrop-blur-sm z-0" />

        <div className="relative z-10 flex items-center w-full gap-2">
            {/* Search Input */}
            <div className="flex-1 flex items-center px-3 gap-2">
                <Search className="w-5 h-5 text-[#8B5A5A]" />
                <input 
                    type="text" 
                    placeholder="Search your memories..."
                    onChange={(e) => onSearch(e.target.value)}
                    className="bg-transparent border-none outline-none w-full text-[#4A4540] placeholder:text-[#4A4540]/50 font-serif"
                />
            </div>

            {/* Separator */}
            <div className="w-[1px] h-6 bg-[#8B5A5A]/30" />

            {/* Filters */}
            <button className="p-2 hover:bg-[#8B5A5A]/10 rounded-full transition-colors text-[#4A4540]" title="Filter by Date">
                <CalendarIcon className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-[#8B5A5A]/10 rounded-full transition-colors text-[#4A4540]" title="Filter by Tag">
                <Filter className="w-5 h-5" />
            </button>
        </div>
      </motion.div>
    </div>
  );
}
