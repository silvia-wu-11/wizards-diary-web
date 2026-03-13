import React from 'react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ParchmentCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverEffect?: boolean;
}

export function ParchmentCard({ children, className, hoverEffect = false, ...props }: ParchmentCardProps) {
  return (
    <motion.div
      whileHover={hoverEffect ? { y: -5, scale: 1.01 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="inline-block"
    >
      <div
        className={cn(
          "relative bg-[#EBE5DC] p-6 text-[#2D2A26] overflow-hidden",
          "rounded-sm shadow-[2px_3px_10px_rgba(0,0,0,0.2)]",
          "before:absolute before:inset-0 before:bg-[url('https://images.unsplash.com/photo-1690983331198-b32a245b13cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbGQlMjBwYXJjaG1lbnQlMjBwYXBlciUyMHRleHR1cmUlMjB2aW50YWdlfGVufDF8fHx8MTc3MjYzOTg2Nnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral')] before:opacity-30 before:pointer-events-none before:bg-cover",
          "border border-[#d6cbb5]",
          className
        )}
        {...props}
      >
      {/* Ragged edge effect via mask or border image could be complex, keeping it simple with pseudo-elements for now or just clean rounded corners with texture */}
      
      {/* Inner subtle glow/shadow to create depth */}
      <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(139,90,90,0.05)] pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
      </div>
    </motion.div>
  );
}
