import { motion } from 'motion/react';
import { useDiaryStore, DiaryEntry } from '../store';
import Link from 'next/link';
import { format } from 'date-fns';
import clsx from 'clsx';
import { Sparkles, Calendar, Tag as TagIcon, ArrowRight } from 'lucide-react';

interface DiaryFeedProps {
  entries: DiaryEntry[];
}

export function DiaryFeed({ entries }: DiaryFeedProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-[#C9B896] font-serif italic text-lg opacity-70">
        <Sparkles size={32} className="mb-4" />
        Your diary is empty. Start writing your magical journey!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 py-8 px-4 w-full max-w-7xl mx-auto">
      {entries.map((entry, index) => (
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          whileHover={{ y: -5, scale: 1.02 }}
          className="relative group h-full"
        >
          <Link href={`/diary/${entry.id}`} className="block h-full">
            <div className={clsx(
              "relative bg-[#EBE5DC] p-6 rounded-lg shadow-lg overflow-hidden h-full flex flex-col justify-between border border-[#C9B896]/30 transition-all duration-300",
              "group-hover:shadow-[0_0_20px_rgba(201,184,150,0.3)] group-hover:border-[#C9B896]",
              "before:absolute before:inset-0 before:bg-[url('https://images.unsplash.com/photo-1617565084998-13053b7d8510?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbGQlMjBwYXJjaG1lbnQlMjBwYXBlciUyMHRleHR1cmV8ZW58MXx8fHwxNzcyNjIzODc5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral')] before:opacity-80 before:mix-blend-multiply before:z-0"
            )}>
              {/* Magical Glow on Hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#C9B896]/0 via-[#C9B896]/10 to-[#8B5A5A]/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10" />

              {/* Content */}
              <div className="relative z-10 flex flex-col h-full">
                {/* Date Badge */}
                <div className="flex items-center gap-2 text-[#8B5A5A] text-sm font-serif mb-3 opacity-80 group-hover:opacity-100 transition-opacity">
                  <Calendar size={14} />
                  <span>{format(new Date(entry.date), 'MMMM do, yyyy')}</span>
                </div>

                {/* Title */}
                <h3 className="font-magic text-2xl text-[#383431] mb-3 leading-tight group-hover:text-[#8B5A5A] transition-colors">
                  {entry.title ?? 'Untitled'}
                </h3>

                {/* Preview Text */}
                <p className="font-serif text-[#4A4540] line-clamp-4 leading-relaxed mb-4 flex-grow text-lg">
                  {entry.content}
                </p>

                {/* Footer: Tags & Read More */}
                <div className="flex items-center justify-between pt-4 border-t border-[#C9B896]/30 mt-auto">
                  <div className="flex flex-wrap gap-2">
                    {entry.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-xs px-2 py-1 bg-[#8B5A5A]/5 text-[#8B5A5A] rounded-full border border-[#8B5A5A]/10">
                        #{tag}
                      </span>
                    ))}
                    {entry.tags.length > 2 && (
                      <span className="text-xs text-[#8B5A5A]/60 px-1 py-1">+{entry.tags.length - 2}</span>
                    )}
                  </div>
                  
                  <span className="text-[#8B5A5A] opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0 flex items-center gap-1 text-sm font-medium">
                    Read <ArrowRight size={14} />
                  </span>
                </div>
              </div>
              
              {/* Paper Edge Effect (Simulated via Clip Path or SVG if needed, but border radius is safer for now) */}
              {/* <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-black/10 to-transparent transform rotate-45 translate-x-4 -translate-y-4"></div> */}
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
