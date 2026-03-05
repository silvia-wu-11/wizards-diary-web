import { motion } from "motion/react";
import { Book } from "../../lib/storage";

interface BookCoverProps {
  book: Book;
  onClick?: () => void;
  selected?: boolean;
}

export function BookCover({ book, onClick, selected }: BookCoverProps) {
  const leatherTexture = "https://images.unsplash.com/photo-1571829604981-ea159f94e5ad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicm93biUyMHZpbnRhZ2UlMjBsZWF0aGVyJTIwdGV4dHVyZSUyMGJvb2slMjBjb3ZlcnxlbnwxfHx8fDE3NzI2NTcxNDB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

  // Different hues for variety
  const hueRotate = book.coverStyle === 'leather-red' ? 'hue-rotate(-30deg)' 
                  : book.coverStyle === 'leather-blue' ? 'hue-rotate(180deg)' 
                  : 'hue-rotate(0deg)';

  return (
    <motion.div
      whileHover={{ y: -10, rotateX: 10, scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="relative w-24 h-32 md:w-32 md:h-44 cursor-pointer perspective-500 group mx-2"
    >
      {/* Spine effect */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-3 md:w-4 rounded-l-md z-20 shadow-inner brightness-75"
        style={{ 
          backgroundImage: `url(${leatherTexture})`,
          backgroundSize: 'cover',
          filter: hueRotate
        }}
      />
      
      {/* Cover */}
      <div 
        className="absolute inset-0 rounded-r-md rounded-l-sm shadow-xl z-10 flex flex-col items-center justify-center p-2 text-center border-r-2 border-white/10"
        style={{ 
          backgroundImage: `url(${leatherTexture})`,
          backgroundSize: 'cover',
          filter: hueRotate,
          boxShadow: selected ? '0 0 20px #C9B896, 5px 5px 15px rgba(0,0,0,0.5)' : '5px 5px 15px rgba(0,0,0,0.5)'
        }}
      >
        {/* Decorative border */}
        <div className="absolute inset-2 border border-[#C9B896]/50 rounded-sm pointer-events-none" />
        <div className="absolute inset-3 border border-[#C9B896]/30 rounded-sm pointer-events-none" />

        <h3 className="text-[#C9B896] font-display text-xs md:text-sm font-bold drop-shadow-md relative z-10">
          {book.title}
        </h3>
        
        {/* Emblem */}
        <div className="mt-2 w-8 h-8 md:w-10 md:h-10 rounded-full border border-[#C9B896]/40 flex items-center justify-center bg-black/20">
           <div className="w-1 h-1 bg-[#C9B896] rounded-full animate-pulse" />
        </div>
      </div>
    </motion.div>
  );
}
