import { Outlet } from 'react-router';
import { motion } from 'motion/react';

export default function Layout() {
  return (
    <div className="min-h-screen relative font-serif text-[#383431] overflow-hidden">
      {/* Background Layer */}
      <div 
        className="fixed inset-0 z-0 bg-[#383431]"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1681582744988-b50eed2ab566?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXJrJTIwbWFnaWNhbCUyMGNhc3RsZSUyMHN0b25lJTIwd2FsbCUyMHRleHR1cmV8ZW58MXx8fHwxNzcyNjU3MTQwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: 'multiply',
          opacity: 0.4
        }}
      />
      
      {/* Noise Overlay for texture */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03] mix-blend-overlay"
           style={{ backgroundImage: `url('data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)"/%3E%3C/svg%3E')` }}
      />

      {/* Magical Floating Particles (Simplified) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <motion.div 
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }}
          transition={{ duration: 5, repeat: Infinity }}
          className="absolute top-10 left-10 w-2 h-2 rounded-full bg-[#C9B896] blur-sm"
        />
        <motion.div 
          animate={{ opacity: [0.2, 0.5, 0.2], y: [0, -20, 0] }}
          transition={{ duration: 7, repeat: Infinity }}
          className="absolute bottom-20 right-20 w-1 h-1 rounded-full bg-[#C9B896] blur-sm"
        />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-8 md:py-12">
        <Outlet />
      </div>
    </div>
  );
}
