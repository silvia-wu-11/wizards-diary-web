import { useState, useEffect } from "react";
import { X, Wand2, BookOpen, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "./UI";

export interface BookData {
  name: string;
  color: string;
  type: string;
}

interface CreateBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: BookData) => Promise<void>;
  isCreating: boolean;
}

export function CreateBookModal({
  isOpen,
  onClose,
  onCreate,
  isCreating,
}: CreateBookModalProps) {
  const [newBookName, setNewBookName] = useState("");
  const [newBookColor, setNewBookColor] = useState("#5c2a2a");
  const [newBookType, setNewBookType] = useState("potion");

  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookName.trim()) return;
    await onCreate({
      name: newBookName.trim(),
      color: newBookColor,
      type: newBookType,
    });
    // Optional: reset state on success could be done here or handled by parent if modal unmounts
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-[#2c2420] border-2 border-[#8B5A5A] rounded-xl shadow-2xl shadow-[#8B5A5A]/20 p-8 max-w-md w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-[#C9B896]/60 hover:text-[#C9B896] transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-8">
              <Wand2 className="w-10 h-10 text-[#C9B896] mx-auto mb-3" />
              <h2 className="text-3xl font-['Cinzel'] text-[#C9B896] font-bold">
                Conjure a New Grimoire
              </h2>
              <p className="text-[#C9B896]/70 font-['Caveat'] text-xl mt-2">
                Bind a new book to your collection
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block font-['Cinzel'] text-[#C9B896] mb-2 font-bold">
                  Title of the Grimoire *
                </label>
                <input
                  type="text"
                  required
                  value={newBookName}
                  onChange={(e) => setNewBookName(e.target.value)}
                  placeholder="e.g. Arcane Studies, Potion Recipes..."
                  className="w-full bg-black/20 border border-[#8B5A5A]/50 rounded-lg px-4 py-3 text-[#EBE5DC] font-['Cinzel'] outline-none focus:border-[#C9B896] focus:ring-1 focus:ring-[#C9B896] placeholder:text-[#EBE5DC]/30 transition-all"
                />
              </div>

              <div>
                <label className="block font-['Cinzel'] text-[#C9B896] mb-3 font-bold">
                  Leather Binding Dye
                </label>
                <div className="flex gap-4">
                  {[
                    { hex: "#5c2a2a", name: "Crimson Red" },
                    { hex: "#2c3e50", name: "Midnight Blue" },
                    { hex: "#1e3f20", name: "Forest Emerald" },
                    { hex: "#8a6b22", name: "Antique Gold" },
                    { hex: "#2c2420", name: "Ancient Brown" },
                  ].map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => setNewBookColor(color.hex)}
                      className={cn(
                        "w-10 h-10 rounded-full border-2 transition-all hover:scale-110 shadow-lg",
                        newBookColor === color.hex
                          ? "border-[#C9B896] scale-110 ring-2 ring-[#C9B896]/30"
                          : "border-black/50"
                      )}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-['Cinzel'] text-[#C9B896] mb-2 font-bold">
                  Magical Discipline
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "spells", label: "Spells & Charms" },
                    { id: "potion", label: "Potions" },
                    { id: "creatures", label: "Magical Creatures" },
                    { id: "history", label: "History of Magic" },
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setNewBookType(type.id)}
                      className={cn(
                        "px-4 py-2 rounded-lg font-['Cinzel'] text-sm transition-all border",
                        newBookType === type.id
                          ? "bg-[#8B5A5A] border-[#C9B896] text-[#EBE5DC]"
                          : "bg-black/20 border-[#8B5A5A]/30 text-[#C9B896]/70 hover:bg-black/40"
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[#8B5A5A]/30">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full bg-gradient-to-r from-[#8B5A5A] to-[#5c2a2a] hover:from-[#9c6a6a] hover:to-[#6c3a3a] disabled:from-[#5c4a4a] disabled:to-[#4c3a3a] disabled:cursor-not-allowed text-[#EBE5DC] font-['Cinzel'] font-bold text-lg py-3 rounded-lg border border-[#C9B896]/50 shadow-[0_0_15px_rgba(139,90,90,0.4)] transition-all hover:shadow-[0_0_20px_rgba(201,184,150,0.5)] flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Binding the Grimoire...
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-5 h-5" />
                      Seal the Binding
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
