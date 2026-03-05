import React, { useState } from 'react';
import { motion } from 'motion/react';
import { DiaryEntry } from '../../lib/store';
import { format } from 'date-fns';

interface Book3DProps {
  entry: DiaryEntry;
  onClose: () => void;
}

export function Book3D({ entry, onClose }: Book3DProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Toggle book state
  const toggleBook = () => setIsOpen(!isOpen);

  return (
    <div className="relative w-full h-[600px] flex items-center justify-center perspective-[1500px]">
      
      {/* The Book Container */}
      <motion.div
        className="relative w-[300px] h-[450px] md:w-[400px] md:h-[550px] preserve-3d cursor-pointer"
        animate={{ 
          rotateY: isOpen ? -160 : 0,
          x: isOpen ? 150 : 0
        }}
        transition={{ duration: 1, type: "spring", stiffness: 60, damping: 15 }}
        onClick={!isOpen ? toggleBook : undefined}
      >
        {/* Front Cover */}
        <div 
          className="absolute inset-0 bg-[#8B5A5A] rounded-r-md rounded-l-sm shadow-2xl origin-left z-20 backface-hidden flex flex-col items-center justify-center text-[#EBE5DC] border-l-8 border-[#5c3a3a]"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1720708231436-39e822b57d47?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW50YWdlJTIwbGVhdGhlciUyMGJvb2slMjBjb3ZlciUyMHRleHR1cmV8ZW58MXx8fHwxNzcyNjU3NTYyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral')`,
            backgroundBlendMode: 'multiply',
            boxShadow: 'inset 4px 0 10px rgba(0,0,0,0.5), 10px 10px 30px rgba(0,0,0,0.6)'
          }}
        >
           <div className="border-4 border-[#C9B896] p-8 m-8 w-[80%] h-[80%] flex flex-col items-center justify-center text-center opacity-80 rounded">
              <h1 className="text-4xl mb-4 font-bold tracking-widest" style={{ fontFamily: 'var(--font-magic)' }}>
                Wizard's<br/>Diary
              </h1>
              <div className="w-16 h-1 bg-[#C9B896] mb-4" />
              <p className="font-serif italic text-lg">Strictly Confidential</p>
           </div>
           
           {/* Corner metal decorations (CSS) */}
           <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-[#C9B896] rounded-tr-xl" />
           <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-[#C9B896] rounded-br-xl" />
        </div>

        {/* Inside Left Page (Back of Front Cover) */}
        <div 
            className="absolute inset-0 bg-[#EBE5DC] rounded-r-md rounded-l-sm origin-left z-10 overflow-hidden flex flex-col p-8 backface-hidden"
            style={{ 
                transform: 'rotateY(180deg)',
                backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, rgba(74, 69, 64, 0.1) 32px)',
                backgroundSize: '100% 32px'
            }}
        >
            <div className="w-full h-full flex flex-col justify-center items-center text-[#4A4540]/60 italic font-serif">
                 <p>This diary belongs to a powerful wizard.</p>
                 <div className="mt-8 opacity-50">
                    <img src="https://images.unsplash.com/photo-1766879240413-39fafbd23033?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYWdpY2FsJTIwZmFudGFzeSUyMHNwYXJrbGVzJTIwZHVzdHxlbnwxfHx8fDE3NzI2NTc1NjJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" className="w-32 h-32 rounded-full object-cover mix-blend-multiply grayscale" />
                 </div>
            </div>
            {/* Page texture overlay */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1690983331198-b32a245b13cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbGQlMjBwYXJjaG1lbnQlMjBwYXBlciUyMHRleHR1cmUlMjB2aW50YWdlfGVufDF8fHx8MTc3MjYzOTg2Nnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral')] opacity-30 pointer-events-none mix-blend-multiply" />
        </div>

        {/* Inside Right Page (Content) - Actually usually separate, but for 3D flip effect, we might need a separate div that is stationary or moves differently.
            However, for a simple "open book" effect where the cover opens to reveal the first page, we can put the content on a "Page 1" layer behind the cover.
        */}
        
        {/* The "Page Stack" / Right Side Base */}
        <div 
            className="absolute inset-0 bg-[#EBE5DC] rounded-r-md rounded-l-sm shadow-md z-0 flex flex-col p-8 md:p-12 overflow-y-auto"
            style={{ 
                transform: 'translateZ(-5px)', // Slightly behind
                backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, rgba(74, 69, 64, 0.1) 32px)',
                backgroundSize: '100% 32px'
            }} 
        >
             {/* Actual Diary Content */}
             <div className="relative z-10 font-serif leading-[32px] text-lg text-[#2D2A26]">
                <div className="text-right text-[#8B5A5A] font-bold mb-6 text-sm">
                    {format(new Date(entry.date), 'MMMM do, yyyy')}
                </div>
                
                <h2 className="text-2xl font-bold mb-4 text-[#8B5A5A]" style={{ fontFamily: 'var(--font-magic)' }}>{entry.title}</h2>
                
                {entry.imageUrl && (
                    <img src={entry.imageUrl} className="w-full h-48 object-cover rounded mb-6 sepia border-4 border-white shadow-sm transform rotate-1" />
                )}

                <p className="whitespace-pre-wrap">{entry.content}</p>

                <div className="mt-8 pt-4 border-t border-[#8B5A5A]/20 flex gap-2">
                    {entry.tags.map(tag => (
                        <span key={tag} className="text-xs bg-[#8B5A5A]/10 text-[#8B5A5A] px-2 py-1 rounded">#{tag}</span>
                    ))}
                </div>
             </div>

             {/* Page texture overlay */}
             <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1690983331198-b32a245b13cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbGQlMjBwYXJjaG1lbnQlMjBwYXBlciUyMHRleHR1cmUlMjB2aW50YWdlfGVufDF8fHx8MTc3MjYzOTg2Nnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral')] opacity-30 pointer-events-none mix-blend-multiply" />
        </div>
        
        {/* Back Cover (Spine visual) */}
        <div className="absolute top-0 bottom-0 left-[-20px] w-[20px] bg-[#5c3a3a] origin-right transform rotateY(-90deg) translateZ(0)" />
      
      </motion.div>

      {/* Instructions Overlay */}
      {!isOpen && (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[#EBE5DC] font-serif italic text-sm bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm pointer-events-none"
        >
            Click to open the diary
        </motion.div>
      )}

      {/* Close Button when open */}
      {isOpen && (
         <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={(e) => { e.stopPropagation(); toggleBook(); setTimeout(onClose, 800); }} 
            className="absolute top-4 right-4 md:right-[-50px] bg-[#8B5A5A] text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform z-50"
         >
            ✕
         </motion.button>
      )}

    </div>
  );
}
