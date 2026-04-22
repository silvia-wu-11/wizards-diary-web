/**
 * 通用危险操作确认弹窗。
 */
import { Flame, Loader2, Wand2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

interface ConfirmActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isSubmitting: boolean;
  title: string;
  description: string;
  confirmText: string;
  cancelText?: string;
}

export function ConfirmActionModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  title,
  description,
  confirmText,
  cancelText = "Keep It",
}: ConfirmActionModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] flex items-center justify-center bg-[#1a1412]/90 p-4 backdrop-blur-md"
          onClick={onClose}>
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="pointer-events-auto relative w-full max-w-md overflow-hidden rounded-xl border-2 border-faded-gold/40 bg-[#2c2420] shadow-[0_0_40px_rgba(153,27,27,0.4)]"
            onClick={(e) => e.stopPropagation()}>
            <div
              className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay"
              style={{
                backgroundImage:
                  'url("https://www.transparenttextures.com/patterns/aged-paper.png")',
              }}
            />

            <div className="relative flex flex-col items-center p-8 text-center">
              <div className="relative mb-6">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 rounded-full bg-red-500/30 blur-xl"
                />
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}>
                  <Flame className="h-16 w-16 text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                </motion.div>
              </div>

              <h3 className="mb-3 text-2xl font-bold tracking-wide text-faded-gold font-serif">
                {title}
              </h3>

              <p className="mb-8 font-serif text-[#d4c5b0]">{description}</p>

              <div className="flex w-full justify-center gap-4">
                <button
                  onClick={onClose}
                  className="rounded-full border border-faded-gold/30 px-6 py-2.5 font-serif text-faded-gold transition-colors hover:bg-faded-gold/10">
                  {cancelText}
                </button>
                <button
                  onClick={() => void onConfirm()}
                  disabled={isSubmitting}
                  className="group flex items-center gap-2 rounded-full border border-red-500/50 bg-red-900/40 px-6 py-2.5 font-serif text-red-300 transition-all hover:border-red-400 hover:bg-red-800/60 hover:text-white hover:shadow-[0_0_15px_rgba(239,68,68,0.5)] disabled:cursor-not-allowed disabled:opacity-70">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Working the Spell...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 transition-transform group-hover:rotate-12" />
                      {confirmText}
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
