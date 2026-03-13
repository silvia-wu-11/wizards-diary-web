import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DiaryEntry } from '../lib/store';
import { format } from 'date-fns';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
interface MagicBookProps {
  entry: DiaryEntry;
  onClose: () => void;
}

export function MagicBook({ entry, onClose }: MagicBookProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Variants for book opening animation
  const bookVariants = {
    closed: { 
      rotateY: 0, 
      width: '300px', 
      height: '400px',
      x: 0,
      transition: { duration: 0.8, ease: "easeInOut" }
    },
    open: { 
      rotateY: -180, // Rotate the cover open
      width: '600px', // Expand width
      height: '400px',
      x: -150, // Center adjustment
      transition: { duration: 0.8, ease: "easeInOut" }
    }
  };

  // Simplified approach: Instead of complex 3D CSS which is hard to perfect without a library,
  // let's do a cross-fade or slide animation between cover and open pages.
  // Or simpler: A modal that expands.

  // Let's try a "Flip" card effect with CSS 3D transform.
  
  return (
    <div className="flex items-center justify-center min-h-[80vh] perspective-[2000px]">
      <motion.div
        className={clsx(
          "relative transform-style-3d transition-all duration-1000",
          isOpen ? "w-[90vw] max-w-4xl h-[80vh]" : "w-[300px] h-[400px]"
        )}
        onClick={() => !isOpen && setIsOpen(true)}
      >
        {/* Closed State (Front Cover) */}
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              key="cover"
              initial={{ opacity: 0, rotateY: 90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: -90 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 bg-[#2c241b] rounded-r-lg rounded-l-sm shadow-2xl cursor-pointer flex flex-col items-center justify-center border-l-8 border-[#3e2723] overflow-hidden"
            >
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1635602115502-09cf7f9f8877?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXJrJTIwYnJvd24lMjB3b3JuJTIwbGVhdGhlciUyMHRleHR1cmV8ZW58MXx8fHwxNzcyNjU4NDEyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral')] opacity-50 mix-blend-overlay"></div>
              
              {/* Gold Embossing */}
              <div className="w-4/5 h-4/5 border-2 border-[#C9B896] rounded flex flex-col items-center justify-center p-8 text-center relative z-10">
                <div className="mb-4 text-[#C9B896] opacity-80">
                  <span className="text-4xl">✨</span>
                </div>
                <h1 className="font-magic text-3xl text-[#C9B896] mb-2 drop-shadow-md">{entry.title}</h1>
                <p className="font-serif text-[#C9B896] opacity-70 italic">{format(new Date(entry.date), 'MMMM do, yyyy')}</p>
                <div className="mt-8 text-sm text-[#C9B896]/50 uppercase tracking-widest">Tap to Open</div>
              </div>

              {/* Spine Effect */}
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/50 to-transparent"></div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Open State (Pages) */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="pages"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="absolute inset-0 flex shadow-2xl rounded overflow-hidden bg-[#2c241b]" // Dark background behind pages
            >
              {/* Left Page */}
              <div className="flex-1 bg-[#EBE5DC] relative p-8 md:p-12 overflow-y-auto border-r border-[#C9B896]/20 bg-[url('https://images.unsplash.com/photo-1617565084998-13053b7d8510?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbGQlMjBwYXJjaG1lbnQlMjBwYXBlciUyMHRleHR1cmV8ZW58MXx8fHwxNzcyNjIzODc5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral')] bg-cover bg-blend-multiply">
                <div className="h-full flex flex-col relative z-10">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                        className="absolute top-0 left-0 text-[#8B5A5A] hover:text-[#4A4540] flex items-center gap-1 mb-4"
                    >
                        <ArrowLeft size={16} /> Close Book
                    </button>

                    <div className="mt-8 text-center border-b-2 border-[#8B5A5A]/20 pb-4 mb-6">
                        <h2 className="font-magic text-3xl md:text-4xl text-[#383431] mb-2">{entry.title}</h2>
                        <div className="font-serif text-[#8B5A5A] italic">{format(new Date(entry.date), 'EEEE, MMMM do, yyyy')}</div>
                    </div>

                    {entry.imageUrl && (
                        <div className="mb-6 p-2 bg-white shadow-lg rotate-1 transform mx-auto max-w-xs">
                            <img src={entry.imageUrl} alt="Memory" className="w-full h-auto grayscale-[0.2] sepia-[0.3]" />
                        </div>
                    )}

                    <div className="mt-auto pt-4 flex gap-2 justify-center">
                        {entry.tags.map(tag => (
                            <span key={tag} className="font-hand text-xl text-[#8B5A5A]">#{tag}</span>
                        ))}
                    </div>
                </div>
                {/* Page Shadow Gradient */}
                <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black/10 to-transparent pointer-events-none"></div>
              </div>

              {/* Right Page */}
              <div className="flex-1 bg-[#EBE5DC] relative p-8 md:p-12 overflow-y-auto bg-[url('https://images.unsplash.com/photo-1617565084998-13053b7d8510?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbGQlMjBwYXJjaG1lbnQlMjBwYXBlciUyMHRleHR1cmV8ZW58MXx8fHwxNzcyNjIzODc5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral')] bg-cover bg-blend-multiply hidden md:block">
                 <div className="font-serif text-xl leading-loose text-[#383431] first-letter:text-5xl first-letter:font-magic first-letter:float-left first-letter:mr-2 first-letter:text-[#8B5A5A]">
                    {entry.content}
                 </div>
                 
                 {/* Page Number */}
                 <div className="absolute bottom-8 right-8 font-magic text-[#8B5A5A]/50">Page 394</div>
                 
                 {/* Binding Shadow */}
                 <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black/10 to-transparent pointer-events-none"></div>
              </div>

              {/* Mobile Content (if screen is small, merge content) */}
              <div className="md:hidden absolute inset-0 bg-[#EBE5DC] p-8 overflow-y-auto">
                 {/* ... similar content but stacked ... */}
                 {/* For simplicity, the Left Page already covers mobile reasonably well if we just let it scroll and show content. */}
                 {/* But let's add content to Left Page on mobile if needed or just show Right Page below. */}
                 {/* Actually, let's just make the Right Page display:none on mobile and put content in Left Page if mobile. */}
                 {/* CSS 'hidden md:block' handles the right page. We need to inject content into left page on mobile? */}
                 {/* Or just make the container flex-col on mobile? */}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
