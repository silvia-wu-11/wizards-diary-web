import { format } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import type { DiaryEntry } from "../store";

interface SearchResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: DiaryEntry[]; // 精确匹配
  semanticEntries?: DiaryEntry[]; // 语义匹配（可选）
  onSelectEntry: (entry: DiaryEntry) => void;
}

export function SearchResultModal({
  isOpen,
  onClose,
  entries,
  semanticEntries = [],
  onSelectEntry,
}: SearchResultModalProps) {
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-[#1a1412]/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={onClose}>
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg max-h-[80vh] bg-[#2c2420] rounded-xl border-2 border-faded-gold/40 shadow-[0_0_40px_rgba(201,184,150,0.2)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}>
            <div
              className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay"
              style={{
                backgroundImage:
                  'url("https://www.transparenttextures.com/patterns/aged-paper.png")',
              }}
            />
            <div className="relative p-6 flex flex-col flex-1 min-h-0">
              <h3 className="text-xl font-['Cinzel'] font-bold text-faded-gold mb-4">
                选择要跳转的日记
              </h3>
              <div className="flex-1 overflow-y-auto magic-scrollbar space-y-4 pr-2">
                {/* 精确匹配列表 */}
                {entries.length > 0 && (
                  <div className="space-y-2">
                    {entries.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => onSelectEntry(e)}
                        className="w-full text-left p-4 rounded-lg bg-white/5 border border-faded-gold/20 hover:bg-white/10 hover:border-faded-gold/40 transition-all group">
                        <div className="font-['Cinzel'] text-faded-gold font-medium truncate">
                          {e.title}
                        </div>
                        <div className="text-sm text-[#C9B896]/90 mt-1 truncate">
                          {e.content}
                        </div>
                        <div className="text-xs text-[#C9B896]/60 mt-2">
                          {format(new Date(e.date), "yyyy-MM-dd")}
                        </div>
                        {e.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {e.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-0.5 rounded-full bg-rusty-copper/20 text-rusty-copper border border-rusty-copper/30">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* 语义匹配列表 */}
                {semanticEntries.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-px bg-faded-gold/30 flex-1"></div>
                      <span className="text-xs font-['Cinzel'] text-faded-gold/60">
                        相关记忆
                      </span>
                      <div className="h-px bg-faded-gold/30 flex-1"></div>
                    </div>
                    {semanticEntries.map((e) => (
                      <button
                        key={`semantic-${e.id}`}
                        onClick={() => onSelectEntry(e)}
                        className="w-full text-left p-4 rounded-lg bg-white/5 border border-faded-gold/20 border-dashed hover:bg-white/10 hover:border-faded-gold/40 transition-all group">
                        <div className="font-['Cinzel'] text-faded-gold font-medium truncate">
                          {e.title}
                        </div>
                        <div className="text-sm text-[#C9B896]/90 mt-1 truncate">
                          {e.content}
                        </div>
                        <div className="text-xs text-[#C9B896]/60 mt-2">
                          {format(new Date(e.date), "yyyy-MM-dd")}
                        </div>
                        {e.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {e.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-0.5 rounded-full bg-rusty-copper/20 text-rusty-copper border border-rusty-copper/30">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {entries.length === 0 && semanticEntries.length === 0 && (
                  <div className="text-center py-8 text-faded-gold/50 font-['Caveat'] text-lg">
                    未找到相关的日记
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 rounded-full border border-faded-gold/30 text-faded-gold hover:bg-faded-gold/10 transition-colors font-['Cinzel'] text-sm">
                取消
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
