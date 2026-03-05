import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface ParchmentProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'light' | 'dark' | 'raw';
  edgeStyle?: 'smooth' | 'ragged';
}

export function Parchment({ 
  className, 
  children, 
  variant = 'light', 
  edgeStyle = 'ragged',
  style,
  ...props 
}: ParchmentProps) {
  
  // Custom "ragged" border radius for organic feel
  const raggedRadius = "255px 15px 225px 15px / 15px 225px 15px 255px";
  const smoothRadius = "12px";

  const bgImage = "url('https://images.unsplash.com/photo-1690983331198-b32a245b13cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYXJjaG1lbnQlMjBwYXBlciUyMHRleHR1cmUlMjB2aW50YWdlJTIwb2xkfGVufDF8fHx8MTc3MjY1NzE0MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral')";

  return (
    <div
      className={twMerge(
        "relative p-6 shadow-xl transition-all duration-300",
        "before:absolute before:inset-0 before:bg-[#EBE5DC] before:opacity-90 before:mix-blend-multiply before:-z-10",
        edgeStyle === 'ragged' ? "overflow-visible" : "overflow-hidden",
        className
      )}
      style={{
        borderRadius: edgeStyle === 'ragged' ? raggedRadius : smoothRadius,
        backgroundImage: bgImage,
        backgroundSize: 'cover',
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 0 40px rgba(139, 90, 90, 0.1)",
        ...style
      }}
      {...props}
    >
      {/* Texture overlay for more depth */}
      <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-color-burn" 
           style={{ 
             background: 'radial-gradient(circle at center, transparent 0%, rgba(74, 69, 64, 0.2) 100%)',
             borderRadius: edgeStyle === 'ragged' ? raggedRadius : smoothRadius,
           }} 
      />
      
      <div className="relative z-10 text-[#4A4540] font-serif">
        {children}
      </div>
    </div>
  );
}
