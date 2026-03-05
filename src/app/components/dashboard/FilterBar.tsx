import { motion } from "motion/react";
import { Search, Filter, Calendar } from "lucide-react";
import { Parchment } from "../ui/Parchment";

interface FilterBarProps {
  onSearch: (query: string) => void;
  onFilter: (filter: string) => void;
  searchQuery: string;
}

export function FilterBar({ onSearch, onFilter, searchQuery }: FilterBarProps) {
  return (
    <div className="sticky top-2 z-50 flex items-center justify-center p-4">
      <Parchment variant="dark" edgeStyle="smooth" className="flex items-center gap-4 bg-[#EBE5DC]/90 backdrop-blur shadow-2xl rounded-full px-6 py-2 min-w-[300px] md:min-w-[500px] border border-[#C9B896]/30">
        
        {/* Search */}
        <div className="flex-1 flex items-center gap-2">
          <Search className="w-4 h-4 text-[#8B5A5A]" />
          <input
            type="text"
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="bg-transparent outline-none w-full text-[#4A4540] placeholder-[#8B5A5A]/50 font-serif"
          />
        </div>

        <div className="w-[1px] h-6 bg-[#8B5A5A]/20" />

        {/* Filters */}
        <div className="flex items-center gap-3 text-[#8B5A5A]">
          <button className="hover:text-[#6B4A3E] transition-colors p-1 rounded-full hover:bg-[#8B5A5A]/10" title="Filter by date">
            <Calendar className="w-4 h-4" />
          </button>
          <button className="hover:text-[#6B4A3E] transition-colors p-1 rounded-full hover:bg-[#8B5A5A]/10" title="Filter by tag">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </Parchment>
    </div>
  );
}
