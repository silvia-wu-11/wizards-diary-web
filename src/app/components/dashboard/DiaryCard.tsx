import { motion } from "motion/react";
import { format } from "date-fns";
import { DiaryEntry, Book } from "../../lib/storage";
import { Parchment } from "../ui/Parchment";
import { Link } from "react-router";

interface DiaryCardProps {
  entry: DiaryEntry;
  book?: Book;
}

export function DiaryCard({ entry, book }: DiaryCardProps) {
  return (
    <Link to={`/diary/${entry.id}`}>
      <motion.div
        whileHover={{ y: -5, scale: 1.02 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="cursor-pointer"
      >
        <Parchment variant="light" edgeStyle="ragged" className="min-h-[200px] flex flex-col gap-2">
          <div className="flex justify-between items-center text-[#8B5A5A]/60 text-xs uppercase font-display border-b border-[#8B5A5A]/10 pb-1 mb-2">
            <span>{format(new Date(entry.date), "MMM d, yyyy")}</span>
            {book && <span>{book.title}</span>}
          </div>
          
          <h3 className="font-display text-xl text-[#4A4540] leading-tight mb-2">
            {entry.title}
          </h3>
          
          <p className="font-body text-[#4A4540]/80 line-clamp-4 text-base leading-relaxed grow">
            {entry.content}
          </p>

          <div className="flex gap-2 flex-wrap mt-4 pt-2 border-t border-[#8B5A5A]/10">
            {entry.tags.map(tag => (
              <span key={tag} className="text-[10px] bg-[#8B5A5A]/10 text-[#8B5A5A] px-2 py-0.5 rounded-full font-serif uppercase tracking-wider">
                #{tag}
              </span>
            ))}
          </div>
        </Parchment>
      </motion.div>
    </Link>
  );
}
