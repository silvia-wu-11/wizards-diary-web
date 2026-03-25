import { AnimatePresence, motion } from "motion/react";
import { Flame, Loader2, Wand2 } from "lucide-react";

interface DeleteBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export function DeleteBookModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteBookModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-[#1a1412]/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-[#2c2420] rounded-xl border-2 border-faded-gold/40 shadow-[0_0_40px_rgba(153,27,27,0.4)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Parchment texture background */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay"
              style={{
                backgroundImage:
                  'url("https://www.transparenttextures.com/patterns/aged-paper.png")',
              }}
            ></div>

            <div className="relative p-8 flex flex-col items-center text-center">
              {/* Magical Fire Element */}
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
                  className="absolute inset-0 bg-red-500/30 blur-xl rounded-full"
                />
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Flame className="w-16 h-16 text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                </motion.div>
              </div>

              <h3 className="text-2xl font-serif text-faded-gold mb-3 font-bold tracking-wide">
                Obliviate Diary?
              </h3>

              <p className="text-[#d4c5b0] mb-8 font-serif">
                Are you sure you want to banish this entire diary to the void?
                This spell cannot be undone, and all memories within will be
                lost forever.
              </p>

              <div className="flex gap-4 w-full justify-center">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-full border border-faded-gold/30 text-faded-gold hover:bg-faded-gold/10 transition-colors font-serif"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isDeleting}
                  className="px-6 py-2.5 rounded-full bg-red-900/40 border border-red-500/50 text-red-300 hover:bg-red-800/60 hover:text-white hover:border-red-400 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)] disabled:opacity-70 disabled:cursor-not-allowed transition-all font-serif flex items-center gap-2 group"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      删除中...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                      Yes
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
