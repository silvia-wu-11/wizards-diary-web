/* eslint-disable @next/next/no-img-element */
import { X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Dispatch, SetStateAction, useEffect } from "react";
import { createPortal } from "react-dom";

export interface DiaryImage {
  id: string;
  url: string;
  loading: boolean;
}

interface ImagePreviewGalleryProps {
  images: DiaryImage[];
  setImages: Dispatch<SetStateAction<DiaryImage[]>>;
  isEditing: boolean;
  maxImages?: number;
  previewIndex: number | null;
  setPreviewIndex: Dispatch<SetStateAction<number | null>>;
  layoutStyle?: "grid" | "flex"; // grid for DiaryView, flex for Dashboard
}

export function ImagePreviewGallery({
  images,
  setImages,
  isEditing,
  previewIndex,
  setPreviewIndex,
  layoutStyle = "grid"
}: ImagePreviewGalleryProps) {
  
  const handleRemoveImage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setImages(prev => prev.filter(img => img.id !== id));
    if (previewIndex !== null) setPreviewIndex(null);
  };

  const handlePrevPreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewIndex !== null) {
      setPreviewIndex((previewIndex - 1 + images.length) % images.length);
    }
  };

  const handleNextPreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewIndex !== null) {
      setPreviewIndex((previewIndex + 1) % images.length);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (previewIndex === null) return;
      if (e.key === "Escape") setPreviewIndex(null);
      if (e.key === "ArrowLeft") setPreviewIndex((previewIndex - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") setPreviewIndex((previewIndex + 1) % images.length);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewIndex, images.length, setPreviewIndex]);

  if (images.length === 0) return null;

  return (
    <>
      {layoutStyle === "grid" ? (
        <div className="absolute inset-0 p-4 grid grid-cols-3 gap-3 md:gap-4 overflow-y-auto magic-scrollbar place-content-center bg-parchment/60">
          {images.map((img, idx) => (
            <div key={img.id} className="relative w-full aspect-square rounded-md overflow-hidden border-2 border-faded-gold group bg-rusty-copper/10 shadow-lg">
              {img.loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Loader2 className="w-8 h-8 animate-spin text-rusty-copper" />
                </div>
              ) : (
                <>
                  <img 
                    src={img.url} 
                    alt="upload" 
                    className="z-50 w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" 
                    onClick={() => setPreviewIndex(idx)} 
                  />
                  {isEditing && (
                    <button 
                      type="button" 
                      onClick={(e) => handleRemoveImage(img.id, e)} 
                      className="absolute top-2 right-2 z-50 bg-black/50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto py-2 magic-scrollbar w-full">
          {images.map((img, idx) => (
            <div key={img.id} className="relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden border border-faded-gold group bg-rusty-copper/10">
              {img.loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-rusty-copper" />
                </div>
              ) : (
                <>
                  <img 
                    src={img.url} 
                    alt="upload" 
                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" 
                    onClick={() => setPreviewIndex(idx)} 
                  />
                  {isEditing && (
                    <button 
                      type="button" 
                      onClick={(e) => handleRemoveImage(img.id, e)} 
                      className="absolute top-1 right-1 z-50 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen Preview — rendered via Portal directly into document.body to escape all stacking contexts */}
      {createPortal(
        <AnimatePresence>
          {previewIndex !== null && images[previewIndex] && !images[previewIndex].loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 backdrop-blur-md"
              style={{ zIndex: 99999 }}
              onClick={() => setPreviewIndex(null)}
            >
              <button 
                className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors bg-white/10 rounded-full p-2 hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); setPreviewIndex(null); }}
                style={{ zIndex: 100001 }}
              >
                <X className="w-8 h-8" />
              </button>

              {images.length > 1 && (
                <>
                  <button 
                    className="absolute left-4 md:left-10 text-white/50 hover:text-white transition-all hover:scale-110 bg-black/50 rounded-full p-2"
                    style={{ zIndex: 100001 }}
                    onClick={handlePrevPreview}
                  >
                    <ChevronLeft className="w-12 h-12" />
                  </button>
                  <button 
                    className="absolute right-4 md:right-10 text-white/50 hover:text-white transition-all hover:scale-110 bg-black/50 rounded-full p-2"
                    style={{ zIndex: 100001 }}
                    onClick={handleNextPreview}
                  >
                    <ChevronRight className="w-12 h-12" />
                  </button>
                </>
              )}

              <motion.img 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                src={images[previewIndex].url} 
                alt="fullscreen preview" 
                className="h-[70vh] w-auto max-w-[90vw] object-contain drop-shadow-2xl rounded-sm"
                style={{ zIndex: 100000 }}
                onClick={e => e.stopPropagation()} 
              />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}