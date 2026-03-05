import { motion } from "motion/react";
import { Book } from "../../lib/storage";
import { BookCover } from "../ui/BookCover";
import { Plus } from "lucide-react";

interface BookshelfProps {
  books: Book[];
  activeBookId?: string;
  onSelectBook: (bookId: string) => void;
  onAddBook?: () => void;
}

export function Bookshelf({ books, activeBookId, onSelectBook, onAddBook }: BookshelfProps) {
  return (
    <div className="relative py-8 md:py-12 px-4 overflow-hidden rounded-lg mx-auto max-w-5xl">
      {/* Background Shelves (Visual Only) */}
      <div 
        className="absolute bottom-6 left-0 right-0 h-4 md:h-6 z-0 rounded shadow-2xl"
        style={{
          background: 'linear-gradient(90deg, #4A332A 0%, #6B4A3E 50%, #4A332A 100%)',
          boxShadow: '0 10px 20px rgba(0,0,0,0.5), inset 0 2px 5px rgba(255,255,255,0.1)'
        }}
      />
      
      {/* Books Container */}
      <div className="relative z-10 flex items-end justify-center gap-6 md:gap-10 overflow-x-auto pb-6 md:pb-8 hide-scrollbar snap-x">
        {books.map((book) => (
          <div key={book.id} className="snap-center shrink-0">
            <BookCover 
              book={book} 
              selected={activeBookId === book.id} 
              onClick={() => onSelectBook(book.id)} 
            />
          </div>
        ))}

        {/* Add New Book Placeholder */}
        <motion.div 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAddBook}
          className="w-24 h-32 md:w-32 md:h-44 shrink-0 bg-[#383431]/50 border-2 border-dashed border-[#C9B896]/50 rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-[#383431]/70 transition-colors"
        >
          <Plus className="text-[#C9B896] w-8 h-8" />
          <span className="text-[#C9B896]/70 text-xs mt-2 font-serif">New Journal</span>
        </motion.div>
      </div>

      {/* Magical Glow under active book */}
      {activeBookId && (
        <motion.div 
          layoutId="book-glow"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 w-32 h-1 bg-[#C9B896] blur-xl opacity-50 z-0"
        />
      )}
    </div>
  );
}
