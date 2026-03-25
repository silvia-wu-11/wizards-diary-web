import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
import { cn } from './UI';

interface CalendarEntry {
  id: string;
  date: string;
  title?: string | null;
}

export interface MagicCalendarProps {
  currentDate?: string;
  entries?: CalendarEntry[];
  onSelectDate: (dateStr: string, entryId?: string) => void;
  onClose?: () => void;
  title?: string;
  className?: string;
}

export function MagicCalendar({ 
  currentDate, 
  entries = [], 
  onSelectDate, 
  onClose,
  title = "Days with magic are illuminated",
  className
}: MagicCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => currentDate ? new Date(currentDate) : new Date());
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const firstDay = getDay(monthStart);
  const blanks = Array.from({ length: firstDay });

  return (
    <motion.div 
      ref={calendarRef}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      // Removed the top triangle: removed before:* classes
      className={cn(
        "absolute top-full left-0 w-[320px] bg-gradient-to-br from-[#2c2420] to-[#1a1412] border-2 border-faded-gold/80 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[100] p-5 font-display mt-[16px]",
        className
      )}
    >

      <div className="flex justify-between items-center mb-6 text-faded-gold relative z-10">
        <button 
          type="button"
          onClick={(e) => { e.stopPropagation(); setCurrentMonth(subMonths(currentMonth, 1)); }} 
          className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-bold text-lg tracking-wider">{format(currentMonth, 'MMMM yyyy')}</span>
        <button 
          type="button"
          onClick={(e) => { e.stopPropagation(); setCurrentMonth(addMonths(currentMonth, 1)); }} 
          className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center mb-3 text-xs text-rusty-copper font-bold relative z-10">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
      </div>
      
      <div className="grid grid-cols-7 gap-1.5 relative z-10">
        {blanks.map((_, i) => <div key={`blank-${i}`} />)}
        {days.map(day => {
          const matchingEntry = entries.find(e => isSameDay(new Date(e.date), day));
          const isSelected = currentDate ? isSameDay(day, new Date(currentDate)) : false;
          const hasEntry = !!matchingEntry;
          
          return (
             <button
                type="button"
                key={day.toString()}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                  onSelectDate(dateStr, matchingEntry?.id); 
                }}
                title={hasEntry ? (matchingEntry.title ?? undefined) : undefined}
                className={cn(
                  "h-9 rounded-full flex items-center justify-center text-sm transition-all relative group cursor-pointer",
                  isSelected 
                    ? "bg-faded-gold text-[#2c2420] font-bold shadow-[0_0_15px_rgba(201,184,150,0.6)] scale-110 z-10" 
                    : hasEntry 
                      ? "text-faded-gold hover:bg-faded-gold/20 border border-faded-gold/40" 
                      : "text-white/30 hover:bg-white/5"
                )}
             >
               {format(day, 'd')}
               {hasEntry && !isSelected && (
                 <div className="absolute bottom-1 w-1 h-1 bg-rusty-copper rounded-full" />
               )}
             </button>
          )
        })}
      </div>
      
      {title && (
        <div className="mt-5 pt-3 border-t border-faded-gold/20 text-center relative z-10">
          <p className="text-xs text-faded-gold/60 italic font-serif">{title}</p>
        </div>
      )}
    </motion.div>
  )
}