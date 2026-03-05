import { motion } from 'motion/react';
import clsx from 'clsx';
import { Book, Heart, Clock } from 'lucide-react';

const MOCK_BOOKS = [
  { id: 1, title: 'Secrets', color: 'bg-red-900', icon: Heart },
  { id: 2, title: 'Potions', color: 'bg-green-900', icon: Clock },
  { id: 3, title: 'Spells', color: 'bg-blue-900', icon: Book },
  { id: 4, title: 'Creatures', color: 'bg-yellow-900', icon: Book },
  { id: 5, title: 'Misc', color: 'bg-purple-900', icon: Book },
];

export function Bookshelf() {
  return (
    <div className="w-full relative py-8 overflow-hidden bg-[#3e2723] rounded-lg shadow-inner mb-8 bg-wood">
      <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-black/50 to-transparent pointer-events-none z-20"></div>
      
      <div className="flex gap-8 px-8 overflow-x-auto pb-4 scrollbar-hide">
        {MOCK_BOOKS.map((book, i) => (
          <motion.div
            key={book.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -10, rotate: -2, scale: 1.05 }}
            className="relative group cursor-pointer flex-shrink-0"
          >
            {/* Book Spine/Cover */}
            <div className={clsx(
              "w-24 h-36 rounded-r-sm rounded-l shadow-xl border-l-4 border-white/10 relative overflow-hidden transform perspective-1000",
              book.color
            )}>
              {/* Texture Overlay */}
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/leather.png')] opacity-30 mix-blend-overlay"></div>
              
              {/* Metallic Accent */}
              <div className="absolute top-4 left-0 w-full h-1 bg-[#C9B896]/50"></div>
              <div className="absolute bottom-4 left-0 w-full h-1 bg-[#C9B896]/50"></div>

              {/* Title */}
              <div className="absolute inset-0 flex items-center justify-center p-2 text-center transform -rotate-90">
                <span className="text-[#EBE5DC] font-serif font-bold text-lg tracking-widest drop-shadow-md">
                  {book.title}
                </span>
              </div>
            </div>

            {/* Shadow below book */}
            <div className="absolute -bottom-4 left-2 w-20 h-2 bg-black/40 blur-sm rounded-full group-hover:scale-x-110 transition-transform"></div>
            
            {/* Magic Glow on Hover */}
            <div className="absolute inset-0 bg-[#C9B896]/0 group-hover:bg-[#C9B896]/20 blur-xl transition-all duration-500 rounded-full opacity-0 group-hover:opacity-100 -z-10"></div>
          </motion.div>
        ))}
        
        {/* Placeholder for "New Book" */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="w-24 h-36 border-2 border-dashed border-[#C9B896]/30 rounded flex items-center justify-center cursor-pointer text-[#C9B896]/50 hover:text-[#C9B896] hover:border-[#C9B896] transition-colors flex-shrink-0"
        >
          <span className="text-2xl font-light">+</span>
        </motion.div>
      </div>
    </div>
  );
}
