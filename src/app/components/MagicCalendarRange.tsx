'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  isWithinInterval,
} from 'date-fns';
import { cn } from './UI';

export interface MagicCalendarRangeProps {
  /** 当前选中的范围 */
  range?: { from: string; to: string };
  onSelectRange: (from: string, to: string) => void;
  onClear?: () => void;
  onClose?: () => void;
  title?: string;
  className?: string;
}

export function MagicCalendarRange({
  range,
  onSelectRange,
  onClear,
  onClose,
  title = 'Select date range',
  className,
}: MagicCalendarRangeProps) {
  const [currentMonth, setCurrentMonth] = useState(() =>
    range?.from ? new Date(range.from) : new Date()
  );
  const [draftFrom, setDraftFrom] = useState<string | null>(range?.from ?? null);
  const [draftTo, setDraftTo] = useState<string | null>(range?.to ?? null);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDay = getDay(monthStart);
  const blanks = Array.from({ length: firstDay });

  const handleDateClick = (day: Date) => {
    const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;

    if (!draftFrom) {
      setDraftFrom(dateStr);
      setDraftTo(dateStr);
    } else if (!draftTo || draftFrom === draftTo) {
      const fromDate = new Date(draftFrom);
      const toDate = new Date(dateStr);
      const [from, to] = fromDate <= toDate ? [draftFrom, dateStr] : [dateStr, draftFrom];
      setDraftFrom(from);
      setDraftTo(to);
      onSelectRange(from, to);
    } else {
      setDraftFrom(dateStr);
      setDraftTo(dateStr);
    }
  };

  const handleClear = () => {
    setDraftFrom(null);
    setDraftTo(null);
    onClear?.();
    onClose?.();
  };

  const fromDate = draftFrom ? new Date(draftFrom) : null;
  const toDate = draftTo ? new Date(draftTo) : null;

  return (
    <motion.div
      ref={calendarRef}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'absolute top-full left-0 w-[320px] bg-gradient-to-br from-[#2c2420] to-[#1a1412] border-2 border-faded-gold/80 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[100] p-5 font-display mt-[16px]',
        className
      )}
    >
      <div className="flex justify-between items-center mb-6 text-faded-gold relative z-10">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setCurrentMonth(subMonths(currentMonth, 1));
          }}
          className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-bold text-lg tracking-wider">
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setCurrentMonth(addMonths(currentMonth, 1));
          }}
          className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-3 text-xs text-rusty-copper font-bold relative z-10">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5 relative z-10">
        {blanks.map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((day) => {
          const isInRange =
            fromDate &&
            toDate &&
            isWithinInterval(day, { start: fromDate, end: toDate });
          const isStart = draftFrom && isSameDay(day, new Date(draftFrom));
          const isEnd = draftTo && isSameDay(day, new Date(draftTo));
          const isSelected = isStart || isEnd;

          return (
            <button
              type="button"
              key={day.toString()}
              onClick={(e) => {
                e.stopPropagation();
                handleDateClick(day);
              }}
              className={cn(
                'h-9 rounded-full flex items-center justify-center text-sm transition-all relative cursor-pointer',
                isSelected
                  ? 'bg-faded-gold text-[#2c2420] font-bold shadow-[0_0_15px_rgba(201,184,150,0.6)] scale-110 z-10'
                  : isInRange
                    ? 'bg-faded-gold/30 text-faded-gold hover:bg-faded-gold/40'
                    : 'text-white/30 hover:bg-white/5'
              )}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      {(draftFrom || range) && (
        <div className="mt-5 pt-3 border-t border-faded-gold/20 flex items-center justify-between gap-2 relative z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="text-xs text-faded-gold/70 hover:text-faded-gold transition-colors flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
          {title && (
            <p className="text-xs text-faded-gold/60 italic font-serif">{title}</p>
          )}
        </div>
      )}
    </motion.div>
  );
}
