'use client';

import { motion } from 'motion/react';

interface OldFriendButtonProps {
  onClick: () => void;
}

/**
 * 拟人形象按钮：头像/插画 + 「老朋友」文案
 * 用于首页筛选栏右侧
 */
export function OldFriendButton({ onClick }: OldFriendButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-faded-gold/20 border-2 border-faded-gold/50 hover:bg-faded-gold/30 hover:border-faded-gold/70 transition-colors text-faded-gold font-['Cinzel'] font-bold shadow-[0_0_15px_rgba(201,184,150,0.2)]"
      aria-label="与老朋友对话"
    >
      <div className="w-8 h-8 rounded-full bg-faded-gold/30 flex items-center justify-center text-lg">
        ✦
      </div>
      <span>老朋友</span>
    </motion.button>
  );
}
