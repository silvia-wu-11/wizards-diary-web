import { useState } from "react";
import { format } from "date-fns";
import { Parchment } from "../ui/Parchment";
import { motion } from "motion/react";
import { Book } from "../../lib/storage";

interface DiaryInputProps {
  onAddEntry: (title: string, content: string, bookId: string) => void;
  activeBook?: Book;
  books: Book[];
}

export function DiaryInput({ onAddEntry, activeBook, books }: DiaryInputProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || !activeBook) return;

    setIsSubmitting(true);
    // Simulate magical delay
    setTimeout(() => {
      onAddEntry(title, content, activeBook.id);
      setTitle("");
      setContent("");
      setIsSubmitting(false);
    }, 800);
  };

  return (
    <div className="relative mx-auto max-w-2xl px-4 py-8">
      {/* Leather Frame */}
      <div className="relative bg-[#4A332A] rounded-xl p-2 shadow-2xl border-4 border-[#6B4A3E]">
        {/* Metal Clasps */}
        <div className="absolute top-1/2 -left-3 w-6 h-8 bg-gradient-to-b from-[#C9B896] to-[#8B7355] rounded-l-md shadow-md z-20" />
        <div className="absolute top-1/2 -right-3 w-6 h-8 bg-gradient-to-b from-[#C9B896] to-[#8B7355] rounded-r-md shadow-md z-20" />

        <Parchment variant="light" edgeStyle="ragged" className="min-h-[300px] flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-[#8B5A5A]/20 pb-2 mb-2">
            <span className="font-display text-[#8B5A5A] text-lg">
              {format(new Date(), "MMMM do, yyyy")}
            </span>
            <span className="text-sm italic text-[#4A4540]/60 font-serif">
              {activeBook ? `Writing in: ${activeBook.title}` : "Select a journal..."}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 h-full grow">
            <input
              type="text"
              placeholder="Title of your memory..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent border-b-2 border-transparent focus:border-[#8B5A5A]/50 outline-none text-2xl font-display text-[#4A4540] placeholder-[#4A4540]/30 transition-colors"
            />
            
            <textarea
              placeholder="What magic happened today?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full grow bg-transparent outline-none text-lg font-body text-[#4A4540] placeholder-[#4A4540]/30 resize-none min-h-[150px]"
            />

            <div className="flex justify-end mt-auto pt-4 border-t border-[#8B5A5A]/10">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={!activeBook || isSubmitting}
                className={`
                  relative px-6 py-2 bg-[#8B5A5A] text-[#EBE5DC] font-display font-bold text-lg rounded shadow-lg 
                  disabled:opacity-50 disabled:cursor-not-allowed
                  border-2 border-[#C9B896] hover:bg-[#6B4A3E] transition-colors
                  group overflow-hidden
                `}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {isSubmitting ? "Sealing..." : "Seal Memory"}
                </span>
                {/* Shine effect */}
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12" />
              </motion.button>
            </div>
          </form>
        </Parchment>
      </div>
    </div>
  );
}
