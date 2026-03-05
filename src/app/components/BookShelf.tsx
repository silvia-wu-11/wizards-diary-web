import { motion } from 'motion/react';
import { Book } from 'lucide-react';

const SHELF_BOOKS = [
  { id: 1, title: 'Year 1', color: '#8B5A5A', height: 'h-24' },
  { id: 2, title: 'Potions', color: '#2F4F4F', height: 'h-28' },
  { id: 3, title: 'Spells', color: '#4A4540', height: 'h-20' },
  { id: 4, title: 'Secrets', color: '#556B2F', height: 'h-26' },
  { id: 5, title: 'Year 2', color: '#8B5A5A', height: 'h-24' },
];

export function BookShelf() {
  return (
    <div className="my-12 relative max-w-5xl mx-auto px-4">
      {/* Shelf Content */}
      <div className="flex items-end gap-2 md:gap-4 px-8 pb-1 relative z-10 h-32 overflow-x-auto scrollbar-hide">
        {SHELF_BOOKS.map((book, i) => (
          <motion.div
            key={book.id}
            whileHover={{ y: -10, scale: 1.05 }}
            className={`
              relative w-12 md:w-16 rounded-sm shadow-md cursor-pointer 
              flex items-center justify-center writing-vertical-rl 
              text-parchment/80 font-magic text-sm tracking-widest border-l border-white/10
              ${book.height}
            `}
            style={{ backgroundColor: book.color }}
          >
             <span className="rotate-180 py-2">{book.title}</span>
             <div className="absolute top-2 left-0 w-full h-[1px] bg-gold/30"></div>
             <div className="absolute bottom-2 left-0 w-full h-[1px] bg-gold/30"></div>
          </motion.div>
        ))}
        {/* Empty space filler */}
        <div className="flex-grow"></div>
      </div>

      {/* The Wood Shelf Itself */}
      <div className="h-4 w-full wood-texture rounded-sm shadow-xl relative z-0"></div>
      <div className="h-8 w-[98%] mx-auto bg-[#281815] rounded-b-lg shadow-2xl opacity-80 -mt-1 relative -z-10"></div>
    </div>
  );
}
