import React from 'react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MagicalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
}

export function MagicalButton({ 
  children, 
  className, 
  variant = 'primary', 
  isLoading, 
  ...props 
}: MagicalButtonProps) {
  const baseStyles = "relative inline-flex items-center justify-center px-6 py-2 font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden";
  
  const variants = {
    primary: "bg-[#8B5A5A] text-[#EBE5DC] border-2 border-[#5c3a3a] shadow-[0_4px_0_#3e2626] hover:shadow-[0_2px_0_#3e2626] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] rounded-lg",
    secondary: "bg-[#4A4540] text-[#C9B896] border-2 border-[#2D2A26] shadow-[0_4px_0_#1a1816] hover:shadow-[0_2px_0_#1a1816] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] rounded-lg",
    ghost: "bg-transparent text-[#8B5A5A] hover:bg-[#8B5A5A]/10 rounded-lg hover:text-[#5c3a3a]"
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className={cn(baseStyles, variants[variant], className)}
      style={{ fontFamily: 'var(--font-magic)' }}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">
        {isLoading && <span className="animate-spin mr-2">✨</span>}
        {children}
      </span>
      
      {/* Shine effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent z-0" />
    </motion.button>
  );
}
