import React from "react";
import { cn } from "./UI";

export function ActionButton({
  icon,
  label,
  onClick,
  className,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 rounded-full border-2 border-[#C9B896]/60 bg-[#2c2420]/90 text-[#C9B896] hover:bg-[#C9B896]/20 hover:border-[#C9B896] hover:text-white transition-all backdrop-blur-sm group font-['Cinzel'] font-bold shadow-[0_4px_15px_rgba(0,0,0,0.5)]",
        className,
      )}
    >
      <span className="group-hover:scale-110 group-hover:-rotate-12 transition-transform">
        {icon}
      </span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
