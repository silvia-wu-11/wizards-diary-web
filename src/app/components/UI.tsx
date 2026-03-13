import { ReactNode } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ParchmentBoxProps {
  children: ReactNode;
  className?: string;
  isInteractive?: boolean;
}

export function ParchmentBox({ children, className, isInteractive = false }: ParchmentBoxProps) {
  return (
    <div
      className={cn(
        'relative bg-parchment parchment-shape text-[#383431] p-6 shadow-xl border border-[#C9B896]/30',
        isInteractive && 'transition-all duration-300 hover:-translate-y-1 magic-glow cursor-pointer',
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-white/10 to-[#8B5A5A]/5 parchment-shape pointer-events-none shadow-[inset_0_0_20px_rgba(235,229,220,0.8)]" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

export function LeatherBox({ children, className, isInteractive = false }: ParchmentBoxProps) {
  return (
    <div
      className={cn(
        'relative bg-leather rounded-lg text-[#EBE5DC] p-6 shadow-2xl border-4 border-[#383431]',
        isInteractive && 'transition-all duration-300 hover:-translate-y-1 hover:shadow-[#C9B896]/50 shadow-lg cursor-pointer',
        className
      )}
    >
      <div className="absolute inset-0 bg-black/40 rounded-sm pointer-events-none" />
      <div className="absolute top-1/2 -left-2 w-4 h-8 bg-gradient-to-r from-[#C9B896] to-[#8B5A5A] rounded-r-md -translate-y-1/2 shadow-inner border border-[#383431]" />
      <div className="absolute top-1/2 -right-2 w-4 h-8 bg-gradient-to-l from-[#C9B896] to-[#8B5A5A] rounded-l-md -translate-y-1/2 shadow-inner border border-[#383431]" />
      
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

export function MagicButton({ children, className, onClick, type = "button", disabled }: { children: ReactNode, className?: string, onClick?: () => void, type?: "button" | "submit" | "reset"; disabled?: boolean }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'bg-[#8B5A5A] hover:bg-[#724545] text-[#EBE5DC] font-bold py-2 px-6 rounded-sm shadow-md transition-all duration-200 border border-[#C9B896]/50',
        'hover:shadow-[0_0_15px_#C9B896] hover:-translate-y-0.5',
        disabled && 'opacity-70 cursor-not-allowed hover:translate-y-0',
        className
      )}
      style={{ fontFamily: "'Cinzel', serif" }}
    >
      {children}
    </button>
  );
}
