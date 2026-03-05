import { Search, Filter, Calendar } from 'lucide-react';
import { motion } from 'motion/react';

export function StickyToolbar({ 
  onSearch, 
  onFilter 
}: { 
  onSearch: (q: string) => void, 
  onFilter: (mood: string) => void 
}) {
  return (
    <motion.div 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-4 z-40 mx-auto max-w-4xl px-4 w-full"
    >
      <div className="bg-parchment/95 backdrop-blur-sm rounded-lg shadow-xl border border-rusty-copper/20 p-2 flex flex-col md:flex-row items-center gap-4 text-ink font-serif overflow-hidden">
        
        {/* Search */}
        <div className="relative flex-grow w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rusty-copper/60" />
          <input 
            type="text" 
            placeholder="Search your memories..." 
            className="w-full bg-transparent pl-9 pr-4 py-2 outline-none text-ink placeholder:text-rusty-copper/40 border-b border-transparent focus:border-gold transition-colors"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>

        {/* Date Filter (Mock) */}
        <div className="flex items-center gap-2 border-l border-rusty-copper/20 pl-4 w-full md:w-auto text-rusty-copper/70 hover:text-burgundy cursor-pointer transition-colors text-sm">
          <Calendar className="w-4 h-4" />
          <span>Select Date</span>
        </div>

        {/* Mood Filter */}
        <div className="flex items-center gap-2 border-l border-rusty-copper/20 pl-4 pr-2 w-full md:w-auto">
           <Filter className="w-4 h-4 text-rusty-copper/70" />
           <select 
             className="bg-transparent outline-none text-sm text-rusty-copper hover:text-burgundy cursor-pointer appearance-none pr-6"
             onChange={(e) => onFilter(e.target.value)}
           >
             <option value="all">All Moods</option>
             <option value="magical">Magical ✨</option>
             <option value="happy">Happy 😊</option>
             <option value="sad">Sad 😢</option>
             <option value="neutral">Neutral 😐</option>
           </select>
        </div>

      </div>

      {/* Ribbon Ends Decoration */}
      <div className="absolute top-1/2 -translate-y-1/2 -left-3 w-4 h-8 bg-gold triangle-left transform rotate-180 hidden md:block opacity-80" style={{clipPath: 'polygon(100% 0, 0 50%, 100% 100%)'}}></div>
      <div className="absolute top-1/2 -translate-y-1/2 -right-3 w-4 h-8 bg-gold triangle-right hidden md:block opacity-80" style={{clipPath: 'polygon(0 0, 100% 50%, 0 100%)'}}></div>
    </motion.div>
  );
}
