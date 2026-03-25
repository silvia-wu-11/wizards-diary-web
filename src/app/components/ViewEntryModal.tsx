import { format } from "date-fns";
import { BookOpen, Calendar, Wand2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React from "react";
import type { DiaryEntry } from "../store";
import { ImagePreviewGallery } from "./ImagePreviewGallery";
import { ParchmentBox } from "./UI";

interface ViewEntryModalProps {
  entryId: string | null;
  onClose: () => void;
  entries: DiaryEntry[];
  books: { id: string; name: string }[];
  viewingPreviewIndex: number | null;
  setViewingPreviewIndex: React.Dispatch<React.SetStateAction<number | null>>;
}

export function ViewEntryModal({
  entryId,
  onClose,
  entries,
  books,
  viewingPreviewIndex,
  setViewingPreviewIndex,
}: ViewEntryModalProps) {
  const entry = entries.find((e) => e.id === entryId);

  return (
    <AnimatePresence>
      {entryId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-12"
          onClick={onClose}>
          <motion.div
            layoutId={entryId}
            initial={{ scale: 0.9, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="max-w-4xl w-full max-h-[90vh] flex flex-col relative"
            onClick={(e) => e.stopPropagation()}>
            <ParchmentBox className="p-8 md:p-12 overflow-y-auto magic-scrollbar h-full w-full rounded-lg shadow-[0_0_50px_rgba(201,184,150,0.3)]">
              <button
                onClick={onClose}
                className="absolute -top-[18px] right-0 text-rusty-copper/60 hover:text-vintage-burgundy transition-colors hover:scale-110 z-50 px-[8px] pt-[0px] pb-[8px]">
                <X className="w-8 h-8" />
              </button>

              {entry && (
                <div className="flex flex-col gap-6 pt-2 min-h-full">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-rusty-copper/30 pb-6">
                    <h2 className="text-4xl md:text-5xl font-['Cinzel'] font-bold text-vintage-burgundy leading-tight drop-shadow-sm">
                      {entry.title ?? ""}
                    </h2>
                    <div className="flex items-center gap-2 text-rusty-copper font-['Cinzel'] text-xl whitespace-nowrap">
                      <Calendar className="w-6 h-6" />
                      {format(new Date(entry.date), "MMMM dd, yyyy")}
                    </div>
                  </div>

                  <div className="text-2xl text-castle-stone/90 leading-relaxed font-sans whitespace-pre-wrap flex-1">
                    {entry.content}
                  </div>

                  {(entry.imageUrls?.length ?? entry.images?.length ?? 0) >
                    0 && (
                    <div className="mt-2">
                      <ImagePreviewGallery
                        images={(entry.imageUrls ?? entry.images ?? []).map(
                          (url) => ({
                            id: url,
                            url,
                            loading: false,
                          }),
                        )}
                        setImages={() => {}}
                        isEditing={false}
                        previewIndex={viewingPreviewIndex}
                        setPreviewIndex={setViewingPreviewIndex}
                        layoutStyle="flex"
                      />
                    </div>
                  )}

                  {(entry.bookId || entry.tags.length > 0) && (
                    <div className="flex flex-wrap items-center gap-3 mt-8 pt-6 border-t border-rusty-copper/20">
                      {entry.bookId &&
                        (() => {
                          const book = books.find((b) => b.id === entry.bookId);
                          if (!book) return null;
                          return (
                            <span className="flex items-center gap-2 text-lg bg-vintage-burgundy/10 text-vintage-burgundy px-4 py-1 rounded-full border border-vintage-burgundy/20 shadow-sm font-['Cinzel'] font-bold">
                              <BookOpen className="w-5 h-5" />
                              {book.name}
                            </span>
                          );
                        })()}
                      {entry.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-lg bg-rusty-copper/10 text-rusty-copper px-4 py-1 rounded-full border border-rusty-copper/20 shadow-sm font-[Caveat]">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-8 text-center text-faded-gold/40 flex items-center justify-center gap-4">
                    <div className="h-px bg-faded-gold/20 flex-1"></div>
                    <Wand2 className="w-6 h-6" />
                    <div className="h-px bg-faded-gold/20 flex-1"></div>
                  </div>
                </div>
              )}
            </ParchmentBox>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
