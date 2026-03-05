import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { ImagePreviewGallery, DiaryImage } from '../components/ImagePreviewGallery';
import { Search, Image as ImageIcon, Wand2, Calendar, BookOpen, Star, Filter, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { useDiaryStore } from '../store';
import { ParchmentBox, LeatherBox, MagicButton } from '../components/UI';
import { cn } from '../components/UI';
import { MagicCalendar } from '../components/MagicCalendar';

const compressImage = (file: File, maxSizeMB: number = 2): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDim = 2048;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width *= ratio;
          height *= ratio;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        let quality = 0.8;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length * 0.75 > maxSizeMB * 1024 * 1024 && quality > 0.1) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

export function Dashboard() {
  const navigate = useNavigate();
  const { entries, books, saveEntry, addBook } = useDiaryStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [selectedBook, setSelectedBook] = useState(books[0]?.id || 'book-1');
  const [searchQuery, setSearchQuery] = useState('');
  const [images, setImages] = useState<DiaryImage[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [viewingPreviewIndex, setViewingPreviewIndex] = useState<number | null>(null);
  const [isNewBookModalOpen, setIsNewBookModalOpen] = useState(false);
  const [newBookName, setNewBookName] = useState('');
  const [newBookColor, setNewBookColor] = useState('#5c2a2a');
  const [newBookType, setNewBookType] = useState('potion');
  const [viewingEntryId, setViewingEntryId] = useState<string | null>(null);
  const [selectedFilterDate, setSelectedFilterDate] = useState<string | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isEntryDatePickerOpen, setIsEntryDatePickerOpen] = useState(false);
  
  // New state for the creation date
  const [entryDate, setEntryDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  
  // Tag filter state
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [isBookDropdownOpen, setIsBookDropdownOpen] = useState(false);
  const bookDropdownRef = useRef<HTMLDivElement>(null);

  // Close book dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bookDropdownRef.current && !bookDropdownRef.current.contains(e.target as Node)) {
        setIsBookDropdownOpen(false);
      }
    };
    if (isBookDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isBookDropdownOpen]);

  // Extract unique dates that have entries
  const availableDates = Array.from(new Set(entries.map(e => {
    const d = new Date(e.date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }))).sort((a, b) => b.localeCompare(a));

  // Extract unique tags that have entries
  const availableTags = Array.from(new Set(entries.flatMap(e => e.tags))).sort((a, b) => a.localeCompare(b));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const availableSlots = 5 - images.length;
    const filesToProcess = files.slice(0, availableSlots);
    const newImages = filesToProcess.map(() => ({ id: Math.random().toString(36).substring(2, 9), url: '', loading: true }));
    setImages(prev => [...prev, ...newImages]);
    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      const id = newImages[i].id;
      try {
        const compressedUrl = await compressImage(file, 2);
        setImages(prev => prev.map(img => img.id === id ? { ...img, url: compressedUrl, loading: false } : img));
      } catch (err) {
        setImages(prev => prev.filter(img => img.id !== id));
      }
    }
    e.target.value = '';
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !title.trim()) return;
    if (images.some(img => img.loading)) {
      alert("Please wait for images to finish loading.");
      return;
    }

    saveEntry({
      title,
      content,
      bookId: selectedBook,
      date: new Date(entryDate).toISOString(),
      tags: tagsStr.split(',').map(t => t.trim()).filter(Boolean),
      images: images.length > 0 ? images.map(img => img.url) : undefined
    });
    
    setTitle('');
    setContent('');
    setTagsStr('');
    setImages([]);
  };

  const handleCreateBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookName.trim()) return;
    
    const newBook = {
      id: `book-${Date.now()}`,
      name: newBookName,
      color: newBookColor,
      type: newBookType
    };
    
    // Instead of setState, use the new addBook function
    addBook(newBook);
    
    setSelectedBook(newBook.id);
    setNewBookName('');
    setIsNewBookModalOpen(false);
  };

  const filteredEntries = entries.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          e.content.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    
    if (selectedFilterDate) {
      const d = new Date(e.date);
      const entryDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (entryDateStr !== selectedFilterDate) return false;
    }

    if (selectedTag && !e.tags.includes(selectedTag)) {
      return false;
    }
    
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-castle-stone via-[#2c2438] to-[#1a1420] text-parchment-white p-6 pb-20 font-sans relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-30" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1518118237096-3c22df574888?ixlib=rb-4.1.0&auto=format&fit=crop&q=80')", backgroundSize: "cover", mixBlendMode: 'overlay', filter: 'hue-rotate(20deg) saturate(150%)' }} />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#6b4c7a] rounded-full blur-[150px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#8b6b45] rounded-full blur-[150px] opacity-20 pointer-events-none" />
      
      <div className="max-w-6xl mx-auto space-y-12 relative z-10">
        
        {/* Header */}
        <header className="text-center py-8 m-[0px]">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="text-5xl md:text-6xl text-faded-gold flex items-center justify-center gap-4 mb-2 drop-shadow-[0_0_10px_rgba(201,184,150,0.5)]">
              <Star className="w-8 h-8 text-faded-gold animate-pulse" />
              Wizard's Diary
              <Wand2 className="w-8 h-8 text-faded-gold animate-bounce" />
            </h1>
            <p className="text-faded-gold/80 italic font-['Caveat'] text-[40px]">Record your magical journey...</p>
          </motion.div>
        </header>

        {/* Section 1: Input Area */}
        <section className="mx-[0px] mt-[1px] mb-[48px] mx-[0px] mt-[2px] mb-[48px] mx-[0px] mt-[3px] mb-[48px] mx-[0px] mt-[2px] mb-[48px] mx-[0px] mt-[4px] mb-[48px] mx-[0px] mt-[3px] mb-[48px] mx-[0px] mt-[2px] mb-[48px] mx-[0px] mt-[1px] mb-[48px] mx-[0px] mt-[0px] mb-[48px]">
          <LeatherBox className="max-w-4xl mx-auto">
            <ParchmentBox className="p-8">
              <form onSubmit={handleSave} className="flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-rusty-copper/30 pb-2 mb-2">
                  <input 
                    type="text" 
                    placeholder="Title your entry..." 
                    className="bg-transparent border-none outline-none text-3xl font-['Cinzel'] text-rusty-copper w-full placeholder:text-rusty-copper/50 placeholder:font-['Cinzel']"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />
                  <div className="relative flex items-center gap-2 text-rusty-copper font-['Cinzel'] text-lg whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setIsEntryDatePickerOpen(true)}
                      className="flex items-center gap-2 bg-transparent border-none outline-none text-rusty-copper font-['Cinzel'] cursor-pointer hover:bg-rusty-copper/10 px-2 py-1 rounded transition-colors"
                    >
                      <Calendar className="w-5 h-5" />
                      <span>{entryDate ? format(new Date(entryDate), 'MMM d, yyyy') : 'Select Date'}</span>
                    </button>
                    
                    <AnimatePresence>
                      {isEntryDatePickerOpen && (
                        <MagicCalendar 
                          currentDate={entryDate || undefined}
                          entries={entries}
                          onSelectDate={(dateStr) => {
                            setEntryDate(dateStr);
                            setIsEntryDatePickerOpen(false);
                          }}
                          onClose={() => setIsEntryDatePickerOpen(false)}
                          title="Pick a date for your magic"
                          className="right-0 left-auto"
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 w-full">
                  <div className="bg-black/5 rounded-lg p-3 ring-1 ring-inset ring-rusty-copper/10 hover:ring-rusty-copper/30 transition-shadow">
                    <textarea 
                      className="bg-transparent font-['Caveat'] border-none outline-none min-h-[150px] text-2xl resize-y text-castle-stone placeholder:text-rusty-copper/60 magic-scrollbar w-full"
                      placeholder="Dear diary, today I learned a new spell..."
                      value={content}
                      onChange={e => setContent(e.target.value)}
                    />
                  </div>
                  <ImagePreviewGallery 
                    images={images} 
                    setImages={setImages} 
                    isEditing={true} 
                    previewIndex={previewIndex} 
                    setPreviewIndex={setPreviewIndex} 
                    layoutStyle="flex" 
                  />
                </div>
                
                <div className="flex flex-col md:flex-row gap-4 items-end md:items-center justify-between border-t border-rusty-copper/20 m-[0px] px-[0px] pt-[16px] pb-[0px]">
                  <div className="flex-1 w-full flex items-center gap-3">
                    <input 
                      type="text" 
                      placeholder="Tags (comma separated)..." 
                      className="bg-white/20 px-4 py-2 rounded-full border border-rusty-copper/30 outline-none font-['Caveat'] text-xl placeholder:text-rusty-copper/50 flex-1 focus:ring-2 focus:ring-faded-gold transition-all"
                      value={tagsStr}
                      onChange={e => setTagsStr(e.target.value)}
                    />
                    {/* Custom Magical Book Dropdown */}
                    <div ref={bookDropdownRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setIsBookDropdownOpen(prev => !prev)}
                        className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#C9B896]/60 outline-none cursor-pointer font-['Cinzel'] text-xl text-rusty-copper transition-all"
                      >
                        <BookOpen className="w-5 h-5 text-faded-gold flex-shrink-0" />
                        <span className="max-w-[120px] truncate">
                          {books.find(b => b.id === selectedBook)?.name ?? 'Select Book'}
                        </span>
                        <motion.span
                          animate={{ rotate: isBookDropdownOpen ? 180 : 0 }}
                          transition={{ duration: 0.25 }}
                          className="ml-1 text-faded-gold text-xs"
                        >▼</motion.span>
                      </button>

                      <AnimatePresence>
                        {isBookDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.96 }}
                            transition={{ duration: 0.2 }}
                            className="absolute right-0 top-full mt-2 z-[200] min-w-[180px] rounded-xl overflow-hidden"
                            style={{
                              // background: 'linear-gradient(160deg, #EDE0C4 0%, #E2CFA0 60%, #D4B87A 100%)',
                              background: '#eae5dd',
                              border: '1px solid rgba(201,184,150,0.6)',
                              boxShadow: 'inset 0 0 18px rgba(201,184,150,0.7), 0 0 20px rgba(201,184,150,0.4), 0 8px 24px rgba(0,0,0,0.35)',
                            }}
                          >
                            {/* Decorative top shimmer */}
                            <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg, transparent, #C9B896, #FFE08A, #C9B896, transparent)' }} />
                            <div className="py-2 px-1">
                              <div className="text-xs font-['Cinzel'] text-rusty-copper/60 px-3 pb-1 border-b border-rusty-copper/20 mb-1 tracking-widest uppercase">
                                ✦ Diary Books ✦
                              </div>
                              {books.map(b => (
                                <button
                                  key={b.id}
                                  type="button"
                                  onClick={() => { setSelectedBook(b.id); setIsBookDropdownOpen(false); }}
                                  className="w-full text-left px-3 py-2 flex items-center gap-2 font-['Cinzel'] text-base transition-all rounded-lg"
                                  style={{
                                    color: selectedBook === b.id ? '#5c2a2a' : '#7a4f2a',
                                    background: selectedBook === b.id
                                      ? 'rgba(201,184,150,0.5)'
                                      : 'transparent',
                                    textShadow: selectedBook === b.id ? '0 0 8px rgba(201,184,150,0.8)' : 'none',
                                  }}
                                  onMouseEnter={e => {
                                    if (selectedBook !== b.id) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,184,150,0.3)';
                                  }}
                                  onMouseLeave={e => {
                                    if (selectedBook !== b.id) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                                  }}
                                >
                                  <span
                                    className="w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-white/40"
                                    style={{ backgroundColor: b.color || '#5c2a2a' }}
                                  />
                                  <span className="truncate">{b.name}</span>
                                  {selectedBook === b.id && <Wand2 className="w-3.5 h-3.5 ml-auto text-faded-gold flex-shrink-0" />}
                                </button>
                              ))}
                            </div>
                            {/* Decorative bottom shimmer */}
                            <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg, transparent, #C9B896, #FFE08A, #C9B896, transparent)' }} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {images.length >= 5 ? (
                      <div className="p-2 text-rusty-copper/40 cursor-not-allowed group relative">
                        <ImageIcon className="w-7 h-7" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-castle-stone text-parchment-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          Maximum 5 images allowed
                        </div>
                      </div>
                    ) : (
                      <label className="p-2 text-rusty-copper hover:text-vintage-burgundy transition-colors hover:scale-110 cursor-pointer" title="Upload Image (Max 5)">
                        <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                        <ImageIcon className="w-7 h-7" />
                      </label>
                    )}
                    <MagicButton type="submit">Seal Entry</MagicButton>
                  </div>
                </div>
              </form>
            </ParchmentBox>
          </LeatherBox>
        </section>

        {/* Section 2: Bookshelf */}
        <section>
          <div className="relative bg-gradient-to-b from-[#15100e] via-[#2a201b] to-[#1a1412] rounded-xl border-y-[16px] border-[#3b2f2f] border-x-8 shadow-[inset_0_20px_40px_rgba(0,0,0,0.9),inset_0_-10px_20px_rgba(0,0,0,0.5),0_15px_30px_rgba(0,0,0,0.6)] flex items-end gap-6 overflow-x-auto magic-scrollbar h-[260px] px-8 pb-3 pt-12">
            {/* Shelf highlight and inner shadow */}
            <div className="absolute inset-0 pointer-events-none border-b border-white/5 rounded-sm" />
            
            {books.map((book, idx) => (
              <motion.div 
                key={book.id}
                onClick={() => navigate(`/book/${book.id}`)}
                whileHover={{ y: -10, rotate: -2, scale: 1.05 }}
                className={cn(
                  "relative w-32 h-44 rounded-r-lg shadow-2xl cursor-pointer flex-shrink-0 flex items-center justify-center text-center p-2 border-l-8 border-[#1a1412] transition-colors group",
                )}
                style={{ backgroundColor: book.color || (idx % 2 === 0 ? "#5c2a2a" : "#2c3e50") }}
              >
                <div 
                  className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-r-lg shadow-[0_0_20px_#C9B896_inset] z-20 p-[0px]" 
                />
                <div className="absolute left-2 top-0 bottom-0 w-1 bg-white/10" />
                <h3 className="font-['Cinzel'] text-faded-gold font-bold text-lg leading-tight z-10 drop-shadow-md relative pointer-events-none">
                  {book.name}
                </h3>
              </motion.div>
            ))}
            
            <motion.div 
              whileHover={{ scale: 1.05 }}
              onClick={() => setIsNewBookModalOpen(true)}
              className="w-32 h-44 rounded-r-lg border-2 border-dashed border-faded-gold/50 flex-shrink-0 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors"
            >
              <span className="text-4xl text-faded-gold/50">+</span>
            </motion.div>
          </div>
        </section>

        {/* Section 3: Sticky Toolbar */}
        <section className="sticky top-4 z-50">
          <div className="bg-[#EBE5DC] text-[#4A4540] p-4 rounded-lg shadow-[4px_4px_0_0_rgba(139,90,90,0.15)] border border-[#8B5A5A]/30 flex flex-col md:flex-row gap-4 items-center justify-between relative overflow-visible">
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4A4540 1px, transparent 1px)', backgroundSize: '16px 16px', overflow: 'visible' }}></div>
            
            <div className="flex items-center gap-4 w-full md:w-auto relative z-10">
              <div className="relative">
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsDatePickerOpen(!isDatePickerOpen); }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-md border border-[#4A4540]/30 hover:bg-white/80 transition-colors focus:ring-2 focus:ring-[#8B5A5A] outline-none"
                >
                  <Calendar className="w-5 h-5 text-[#4A4540]" />
                  <span className="font-['Cinzel'] font-bold text-[#4A4540]">
                    {selectedFilterDate ? format(new Date(selectedFilterDate), 'MMM dd, yyyy') : 'All Dates'}
                  </span>
                  {selectedFilterDate && (
                    <X 
                      className="w-4 h-4 ml-1 text-[#4A4540]/60 hover:text-[#4A4540]" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFilterDate(null);
                        setIsDatePickerOpen(false);
                      }}
                    />
                  )}
                </button>
                
                <AnimatePresence>
                  {isDatePickerOpen && (
                    <MagicCalendar 
                      currentDate={selectedFilterDate || undefined}
                      entries={entries}
                      onSelectDate={(dateStr) => {
                        setSelectedFilterDate(dateStr);
                        setIsDatePickerOpen(false);
                      }}
                      onClose={() => setIsDatePickerOpen(false)}
                      title="Dates with Magic Records"
                    />
                  )}
                </AnimatePresence>
              </div>
              <div className="relative">
                <button 
                  onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                  className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-md border border-[#4A4540]/30 hover:bg-white/80 transition-colors focus:ring-2 focus:ring-[#8B5A5A] outline-none"
                >
                  <Filter className="w-5 h-5 text-[#4A4540]" />
                  <span className="font-['Cinzel'] font-bold text-[#4A4540]">
                    {selectedTag ? `#${selectedTag}` : 'All Tags'}
                  </span>
                  {selectedTag && (
                    <X 
                      className="w-4 h-4 ml-1 text-[#4A4540]/60 hover:text-[#4A4540]" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTag(null);
                        setIsTagDropdownOpen(false);
                      }}
                    />
                  )}
                </button>
                
                <AnimatePresence>
                  {isTagDropdownOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full mt-2 left-0 bg-[#EBE5DC] border border-[#8B5A5A]/30 rounded-lg shadow-xl p-3 z-[100] min-w-[200px] max-h-[300px] overflow-y-auto magic-scrollbar"
                    >
                      <div className="text-sm font-['Cinzel'] text-[#4A4540]/70 mb-2 px-2 border-b border-[#8B5A5A]/20 pb-1">
                        Magical Tags
                      </div>
                      {availableTags.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {availableTags.map(tag => (
                            <button
                              key={tag}
                              onClick={() => {
                                setSelectedTag(tag);
                                setIsTagDropdownOpen(false);
                              }}
                              className={cn(
                                "text-left px-3 py-2 rounded-md transition-colors flex items-center justify-between",
                                selectedTag === tag 
                                  ? "bg-[#8B5A5A] text-[#EBE5DC]" 
                                  : "hover:bg-white/50 text-[#4A4540]"
                              )}
                            >
                              <span className="font-['Caveat'] text-xl">#{tag}</span>
                              {selectedTag === tag && <Wand2 className="w-4 h-4" />}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-[#4A4540]/60 text-sm font-['Cinzel']">
                          No tags available
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            <div className="relative w-full md:w-96 z-10">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4A4540]/60" />
              <input 
                type="text" 
                placeholder="Search the archives..." 
                className="w-full bg-white/50 border border-[#4A4540]/30 rounded-full py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-[#8B5A5A] text-xl font-['Caveat'] placeholder:text-[#4A4540]/50 transition-colors hover:bg-white/80"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Section 4: Feed */}
        <section className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          <AnimatePresence>
            {filteredEntries.map(entry => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                layout
                layoutId={entry.id}
                className="break-inside-avoid"
              >
                <ParchmentBox isInteractive>
                  <div 
                    onClick={() => setViewingEntryId(entry.id)}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-['Cinzel'] font-bold text-2xl text-vintage-burgundy leading-tight mb-1">{entry.title}</h3>
                      <span className="text-sm font-['Cinzel'] text-rusty-copper/70 flex-shrink-0 ml-2">
                        {format(new Date(entry.date), 'MMM dd')}
                      </span>
                    </div>
                    
                    <p className="text-xl text-castle-stone/90 line-clamp-4 leading-relaxed">
                      {entry.content}
                    </p>
                    
                    {entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {entry.tags.map(tag => (
                          <span key={tag} className="text-sm bg-rusty-copper/10 text-rusty-copper px-2 py-0.5 rounded-full border border-rusty-copper/20">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div className="mt-2 text-right">
                      <BookOpen className="w-5 h-5 text-faded-gold inline-block" />
                    </div>
                  </div>
                </ParchmentBox>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {filteredEntries.length === 0 && (
            <div className="col-span-full text-center py-20">
              <Wand2 className="w-16 h-16 text-faded-gold/50 mx-auto mb-4" />
              <p className="text-2xl text-faded-gold/70 font-['Caveat']">No magical records found...</p>
            </div>
          )}
        </section>

      </div>

      <AnimatePresence>
        {viewingEntryId && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-12"
            onClick={() => setViewingEntryId(null)}
          >
            <motion.div
              layoutId={viewingEntryId}
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="max-w-4xl w-full max-h-[90vh] flex flex-col relative"
              onClick={e => e.stopPropagation()}
            >
              <ParchmentBox className="p-8 md:p-12 overflow-y-auto magic-scrollbar h-full w-full rounded-lg shadow-[0_0_50px_rgba(201,184,150,0.3)]">
                <button 
                  onClick={() => setViewingEntryId(null)}
                  className="absolute -top-[18] right-0 text-rusty-copper/60 hover:text-vintage-burgundy transition-colors hover:scale-110 z-50 px-[8px] pt-[0px] pb-[8px]"
                >
                  <X className="w-8 h-8" />
                </button>
                
                {(() => {
                  const entry = entries.find(e => e.id === viewingEntryId);
                  if (!entry) return null;
                  return (
                    <div className="flex flex-col gap-6 pt-2 min-h-full">
                      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-rusty-copper/30 pb-6">
                        <h2 className="text-4xl md:text-5xl font-['Cinzel'] font-bold text-vintage-burgundy leading-tight drop-shadow-sm">
                          {entry.title}
                        </h2>
                        <div className="flex items-center gap-2 text-rusty-copper font-['Cinzel'] text-xl whitespace-nowrap">
                          <Calendar className="w-6 h-6" />
                          {format(new Date(entry.date), 'MMMM dd, yyyy')}
                        </div>
                      </div>
                      
                      <div className="text-2xl text-castle-stone/90 leading-relaxed font-sans whitespace-pre-wrap flex-1">
                        {entry.content}
                      </div>

                      {entry.images && entry.images.length > 0 && (
                        <div className="mt-2">
                          <ImagePreviewGallery
                            images={entry.images.map(url => ({ id: url, url, loading: false }))}
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
                          {entry.bookId && (() => {
                            const book = books.find(b => b.id === entry.bookId);
                            if (!book) return null;
                            return (
                              <span className="flex items-center gap-2 text-lg bg-vintage-burgundy/10 text-vintage-burgundy px-4 py-1 rounded-full border border-vintage-burgundy/20 shadow-sm font-['Cinzel'] font-bold">
                                <BookOpen className="w-5 h-5" />
                                {book.name}
                              </span>
                            );
                          })()}
                          {entry.tags.map(tag => (
                            <span key={tag} className="text-lg bg-rusty-copper/10 text-rusty-copper px-4 py-1 rounded-full border border-rusty-copper/20 shadow-sm">
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
                  );
                })()}
              </ParchmentBox>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isNewBookModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#2c2420] border-2 border-[#8B5A5A] rounded-xl shadow-2xl shadow-[#8B5A5A]/20 p-8 max-w-md w-full relative"
            >
              <button 
                onClick={() => setIsNewBookModalOpen(false)}
                className="absolute top-4 right-4 text-[#C9B896]/60 hover:text-[#C9B896] transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="text-center mb-8">
                <Wand2 className="w-10 h-10 text-[#C9B896] mx-auto mb-3" />
                <h2 className="text-3xl font-['Cinzel'] text-[#C9B896] font-bold">Conjure a New Grimoire</h2>
                <p className="text-[#C9B896]/70 font-['Caveat'] text-xl mt-2">Bind a new book to your collection</p>
              </div>

              <form onSubmit={handleCreateBook} className="space-y-6">
                <div>
                  <label className="block font-['Cinzel'] text-[#C9B896] mb-2 font-bold">Title of the Grimoire *</label>
                  <input 
                    type="text" 
                    required
                    value={newBookName}
                    onChange={e => setNewBookName(e.target.value)}
                    placeholder="e.g. Dark Arts Study, Potion Recipes..." 
                    className="w-full bg-black/20 border border-[#8B5A5A]/50 rounded-lg px-4 py-3 text-[#EBE5DC] font-['Cinzel'] outline-none focus:border-[#C9B896] focus:ring-1 focus:ring-[#C9B896] placeholder:text-[#EBE5DC]/30 transition-all"
                  />
                </div>

                <div>
                  <label className="block font-['Cinzel'] text-[#C9B896] mb-3 font-bold">Leather Binding Dye</label>
                  <div className="flex gap-4">
                    {[
                      { hex: '#5c2a2a', name: 'Gryffindor Crimson' },
                      { hex: '#2c3e50', name: 'Ravenclaw Midnight' },
                      { hex: '#1e3f20', name: 'Slytherin Emerald' },
                      { hex: '#8a6b22', name: 'Hufflepuff Gold' },
                      { hex: '#2c2420', name: 'Ancient Brown' }
                    ].map(color => (
                      <button
                        key={color.hex}
                        type="button"
                        onClick={() => setNewBookColor(color.hex)}
                        className={cn(
                          "w-10 h-10 rounded-full border-2 transition-all hover:scale-110 shadow-lg",
                          newBookColor === color.hex ? "border-[#C9B896] scale-110 ring-2 ring-[#C9B896]/30" : "border-black/50"
                        )}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-['Cinzel'] text-[#C9B896] mb-2 font-bold">Magical Discipline</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'spells', label: 'Spells & Charms' },
                      { id: 'potion', label: 'Potions' },
                      { id: 'creatures', label: 'Magical Creatures' },
                      { id: 'history', label: 'History of Magic' }
                    ].map(type => (
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
                    className="w-full bg-gradient-to-r from-[#8B5A5A] to-[#5c2a2a] hover:from-[#9c6a6a] hover:to-[#6c3a3a] text-[#EBE5DC] font-['Cinzel'] font-bold text-lg py-3 rounded-lg border border-[#C9B896]/50 shadow-[0_0_15px_rgba(139,90,90,0.4)] transition-all hover:shadow-[0_0_20px_rgba(201,184,150,0.5)] flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-5 h-5" />
                    Seal Binding
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}