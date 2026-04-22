"use client";

import { format } from "date-fns";
import {
  ArrowLeft,
  Book,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Loader2,
  Plus,
  Search,
  Trash2,
  User,
  Wand2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import {
  createEmptyDiaryAudioDraft,
  uploadDiaryAudio,
  type DiaryAudioDraft,
} from "../../lib/audio";
import { ActionButton } from "../components/ActionButton";
import { AudioRecorderField } from "../components/AudioRecorderField";
import { AuthModal } from "../components/auth/AuthModal";
import { ConfirmActionModal } from "../components/ConfirmActionModal";
import {
  DiaryImage,
  ImagePreviewGallery,
} from "../components/ImagePreviewGallery";
import { MagicCalendar } from "../components/MagicCalendar";
import { OldFriendChatDrawer } from "../components/OldFriendChat/OldFriendChatDrawer";
import { SearchResultModal } from "../components/SearchResultModal";
import { cn } from "../components/UI";
import { useDiaryStore, type DiaryEntry } from "../store";
import type { OldFriendContext } from "../types/ai-chat";

import {
  handleImagePasteHelper,
  handleImageUploadHelper,
} from "../../lib/image";

export function DiaryView({
  id,
  bookId: paramBookId,
  initialOpen = false,
  initialFocusContent = false,
}: {
  id: string;
  bookId?: string;
  initialOpen?: boolean;
  initialFocusContent?: boolean;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const {
    entries,
    deleteEntry,
    deleteBook,
    addEntry,
    updateEntry,
    books,
    loadData,
  } = useDiaryStore();

  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isHoveringCover, setIsHoveringCover] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState("");
  const [showSearchResultModal, setShowSearchResultModal] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResultModalExactEntries, setSearchResultModalExactEntries] =
    useState<DiaryEntry[]>([]);
  const [
    searchResultModalSemanticEntries,
    setSearchResultModalSemanticEntries,
  ] = useState<DiaryEntry[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingBook, setIsDeletingBook] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTearingEntry, setIsTearingEntry] = useState(false);
  const [isOldFriendOpen, setIsOldFriendOpen] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);

  const isNewEntry = id === "new";
  const [isEditing, setIsEditing] = useState(isNewEntry);

  const calendarRef = useRef<HTMLButtonElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const entry = isNewEntry ? null : entries.find((e) => e.id === id);

  const [editTitle, setEditTitle] = useState(entry?.title || "");
  const [editContent, setEditContent] = useState(entry?.content || "");
  const [editTags, setEditTags] = useState<string[]>(entry?.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [images, setImages] = useState<DiaryImage[]>(
    (entry?.imageUrls ?? entry?.images ?? []).map((url) => ({
      id: Math.random().toString(36).substring(2, 9),
      url,
      loading: false,
    })),
  );
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [audio, setAudio] = useState<DiaryAudioDraft>(() =>
    entry?.audioUrl
      ? {
          file: null,
          previewUrl: entry.audioUrl,
          audioUrl: entry.audioUrl,
          name: entry.audioName ?? "",
          durationSec: entry.audioDurationSec ?? null,
          mimeType: entry.audioMimeType ?? null,
        }
      : createEmptyDiaryAudioDraft(),
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await handleImageUploadHelper(e, images, setImages, 6);
  };

  // Update edit state if navigating to a different entry
  useEffect(() => {
    setIsEditing(id === "new");
    setEditTitle(entry?.title ?? "");
    setEditContent(entry?.content || "");
    setEditTags(entry?.tags || []);
    setTagInput("");
    const urls = entry?.imageUrls ?? entry?.images ?? [];
    setImages(
      urls.map((url) => ({
        id: Math.random().toString(36).substring(2, 9),
        url,
        loading: false,
      })),
    );
    setAudio(
      entry?.audioUrl
        ? {
            file: null,
            previewUrl: entry.audioUrl,
            audioUrl: entry.audioUrl,
            name: entry.audioName ?? "",
            durationSec: entry.audioDurationSec ?? null,
            mimeType: entry.audioMimeType ?? null,
          }
        : createEmptyDiaryAudioDraft(),
    );
  }, [id, entry]);

  const handleSave = async () => {
    if (isRecordingAudio) {
      toast.error("Stop recording before sealing the page.");
      return;
    }
    if (images.some((img) => img.loading)) {
      toast.error("Wait for the images to settle before sealing the page.");
      return;
    }
    let finalTags = editTags;
    if (tagInput.trim() && !editTags.includes(tagInput.trim())) {
      finalTags = [...editTags, tagInput.trim()];
      setEditTags(finalTags);
      setTagInput("");
    }

    // 检查登录状态
    if (!session?.user) {
      toast.error("Sign in before continuing.");
      setIsAuthModalOpen(true);
      return;
    }

    setIsSaving(true);
    try {
      let uploadedAudio = null as null | {
        url: string;
        mimeType: string;
      };
      if (audio.file) {
        uploadedAudio = await uploadDiaryAudio(
          audio.file,
          isNewEntry ? undefined : entry?.id,
        );
      }

      if (isNewEntry) {
        const newEntry = await addEntry({
          id: uuidv4(),
          bookId: paramBookId!,
          title: editTitle.trim() || null,
          content: editContent,
          date: new Date().toISOString(),
          tags: finalTags,
          imageUrls: images
            .filter((img) => !img.loading && img.url)
            .map((img) => img.url),
          audioUrl: uploadedAudio?.url ?? audio.audioUrl,
          audioName: audio.name.trim() || null,
          audioDurationSec: audio.durationSec,
          audioMimeType: uploadedAudio?.mimeType ?? audio.mimeType,
        });
        console.log("newEntry", newEntry);

        toast.success("Sealed in starlight.");
        router.replace(`/diary/${newEntry?.id}?open=1`);
      } else if (entry) {
        await updateEntry(entry.id, {
          title: editTitle.trim() || null,
          content: editContent,
          images: images
            .filter((img) => !img.loading && img.url)
            .map((img) => img.url),
          tags: finalTags,
          audioUrl: uploadedAudio?.url ?? audio.audioUrl ?? null,
          audioName: audio.name.trim() || null,
          audioDurationSec: audio.durationSec ?? null,
          audioMimeType: uploadedAudio?.mimeType ?? audio.mimeType ?? null,
        });
        toast.success("The page has been amended.");
      }
      setIsEditing(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "The page could not be sealed.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBook = () => {
    setShowDeleteConfirm(true);
  };

  /** 添加日记：切换到 edit 状态并 focus 正文，或跳转到 new 页面 */
  const handleAddEntry = () => {
    if (isNewEntry) {
      setIsOpen(true);
      setIsEditing(true);
      // 等待书本打开动画完成后再 focus
      setTimeout(() => contentTextareaRef.current?.focus(), 500);
    } else if (currentBookId) {
      router.push(`/diary/new?bookId=${currentBookId}&open=1&focus=1`);
    } else {
      router.push("/");
    }
  };

  /** 删除单条日记：撕页动画后从数据库删除，保持书本翻开并展示前/后一条 */
  const handleDeleteEntry = async () => {
    if (!entry || isNewEntry) return;
    const targetEntry = prevEntry ?? nextEntry;
    setIsTearingEntry(true);
    // 动画约 800ms，结束后删除并跳转
    await new Promise((r) => setTimeout(r, 800));
    try {
      await deleteEntry(entry.id);
      toast.success("The memory has been lifted from the page.");
      if (targetEntry) {
        // 保持书本翻开，展示前一条或下一条日记
        router.replace(`/diary/${targetEntry.id}?open=1`);
      } else {
        router.replace("/");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "The tearing spell failed.",
      );
      setIsTearingEntry(false);
    }
  };

  const confirmDelete = async () => {
    if (!currentBookId) {
      router.push("/");
      return;
    }
    setIsDeletingBook(true);
    try {
      await deleteBook(currentBookId);
      toast.success("The diary has been banished.");
      setShowDeleteConfirm(false);
      router.push("/");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "The banishing spell failed.",
      );
    } finally {
      setIsDeletingBook(false);
    }
  };

  // Determine the current book
  const currentBookId = isNewEntry ? paramBookId : entry?.bookId;
  const currentBook = books.find((b) => b.id === currentBookId);

  // Compute prev/next entries: 当前日记本内，按关键词模糊筛选
  const bookEntries = entries
    .filter((e) => e.bookId === currentBookId)
    .filter((e) => {
      if (!searchKeyword.trim()) return true;
      const kw = searchKeyword.trim().toLowerCase();
      return (
        (e.title ?? "").toLowerCase().includes(kw) ||
        e.content.toLowerCase().includes(kw)
      );
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const currentIndex = isNewEntry
    ? -1
    : bookEntries.findIndex((e) => e.id === entry?.id);
  const prevEntry = currentIndex > 0 ? bookEntries[currentIndex - 1] : null;
  const nextEntry =
    currentIndex >= 0 && currentIndex < bookEntries.length - 1
      ? bookEntries[currentIndex + 1]
      : null;

  // 关键词防抖 1000ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchKeyword(searchKeyword), 1000);
    return () => clearTimeout(t);
  }, [searchKeyword]);

  useEffect(() => {
    if (isSearchOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (debouncedSearchKeyword) {
      handleSearchEnter();
    }
  }, [debouncedSearchKeyword]);

  const handleSearchEnter = async () => {
    if (!searchKeyword.trim() || !currentBookId) return;

    setIsSearching(true);
    try {
      const { searchBookEntries } = await import("../actions/diary");
      const { exactMatches, semanticMatches } = await searchBookEntries(
        currentBookId,
        searchKeyword.trim(),
      );

      if (exactMatches.length === 0 && semanticMatches.length === 0) {
        toast.info("No matching memory answered the call.");
        return;
      }

      setSearchResultModalExactEntries(exactMatches as DiaryEntry[]);
      setSearchResultModalSemanticEntries(semanticMatches as DiaryEntry[]);
      setIsSearchOpen(false);
      setShowSearchResultModal(true);
    } catch (err) {
      console.error(err);
      toast.error("The seeking spell failed. Try again in a moment.");
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    // If not creating a new entry and no entry found, or if new but no bookId provided
    if ((!isNewEntry && !entry) || (isNewEntry && !paramBookId)) {
      router.push("/");
    }
  }, [entry, isNewEntry, paramBookId, router]);

  // 清除 URL 中的 open=1、focus=1 参数（删除/添加后跳转时添加的）
  const hasCleanedOpenParam = useRef(false);
  useEffect(() => {
    if (
      initialOpen &&
      !hasCleanedOpenParam.current &&
      typeof window !== "undefined" &&
      window.location.search.includes("open=1")
    ) {
      hasCleanedOpenParam.current = true;
      const q = new URLSearchParams(window.location.search);
      q.delete("open");
      q.delete("focus");
      const query = q.toString() ? `?${q.toString()}` : "";
      router.replace(`/diary/${id}${query}`, { scroll: false });
    }
  }, [id, initialOpen, router]);

  // 添加日记时自动 focus 到正文输入框
  useEffect(() => {
    if (initialFocusContent && isOpen && isEditing) {
      const t = setTimeout(() => contentTextareaRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [initialFocusContent, isOpen, isEditing]);

  // Handle clicking outside to close calendar
  // Note: the actual click outside logic is handled inside MagicCalendar component
  // to avoid conflicts with state updates when clicking internal elements like prev/next month

  // Keyboard left/right navigation for page turning（保持书本翻开）
  useEffect(() => {
    if (!isOpen || isEditing) return;
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if focus is inside an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft" && prevEntry) {
        e.preventDefault();
        router.push(`/diary/${prevEntry.id}?open=1`);
      } else if (e.key === "ArrowRight" && nextEntry) {
        e.preventDefault();
        router.push(`/diary/${nextEntry.id}?open=1`);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isEditing, prevEntry, nextEntry, router]);

  if (!isNewEntry && !entry) return null;

  const currentDateToDisplay = isNewEntry
    ? new Date().toISOString()
    : entry!.date;

  return (
    <>
      <AuthModal
        open={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        initialMode="login"
        onClose={() => {}}
      />
      <div className="h-screen w-screen bg-[#2c2420] text-parchment-white flex flex-col font-sans overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518118237096-3c22df574888?ixlib=rb-4.1.0&q=80')] bg-cover opacity-10 mix-blend-overlay pointer-events-none" />

        {/* Top Navigation */}
        <header className="flex justify-between items-center z-50 sticky top-0 bg-[#2c2420]/80 backdrop-blur-md border-b border-faded-gold/20 px-[24px] py-[16px] mx-[0px] mt-[0px] gap-4 flex-wrap">
          <button
            onClick={() => {
              loadData();
              router.push("/");
            }}
            className="flex items-center gap-2 text-faded-gold hover:text-white transition-colors font-['Cinzel'] font-bold text-lg group">
            <div className="p-1 rounded-full border border-faded-gold/30 group-hover:bg-faded-gold/20 transition-all">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <span>Return</span>
          </button>

          {isOpen && (
            <div className="relative">
              <button
                ref={calendarRef}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCalendarOpen(!isCalendarOpen);
                }}
                className={cn(
                  "flex items-center gap-3 px-5 py-2.5 rounded-full border transition-all shadow-lg font-['Cinzel'] font-bold",
                  isCalendarOpen
                    ? "bg-faded-gold text-[#2c2420] border-faded-gold shadow-[0_0_15px_rgba(201,184,150,0.4)]"
                    : "bg-white/10 border-faded-gold/50 text-faded-gold hover:bg-white/20 hover:border-faded-gold",
                )}>
                <CalendarDays className="w-5 h-5" />
                <span>
                  {format(new Date(currentDateToDisplay), "MMMM do, yyyy")}
                </span>
                <ChevronLeft
                  className={cn(
                    "w-4 h-4 ml-1 transition-transform",
                    isCalendarOpen ? "rotate-90" : "-rotate-90",
                  )}
                />
              </button>

              <div className="relative right-16">
                <AnimatePresence>
                  {isCalendarOpen && (
                    <MagicCalendar
                      currentDate={currentDateToDisplay}
                      entries={bookEntries}
                      onSelectDate={(dateStr, entryId) => {
                        if (entryId) {
                          setIsCalendarOpen(false);
                          router.push(`/diary/${entryId}?open=1`);
                        }
                      }}
                      onClose={() => setIsCalendarOpen(false)}
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </header>

        {/* Center 3D Book Area */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-8 relative perspective-1000 z-10 overflow-hidden mx-[24px] my-[20px] min-h-0">
          <div className="relative w-full max-w-5xl h-full flex justify-center items-center perspective-[2000px]">
            <AnimatePresence mode="wait">
              {!isOpen ? (
                // STATE A: Closed Book
                <motion.div
                  key="closed-book"
                  initial={{ opacity: 0, scale: 0.8, rotateY: -10 }}
                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                  exit={{ opacity: 0, scale: 0.9, rotateY: 20 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  data-testid="diary-cover"
                  className="w-full max-w-[420px] h-[620px] bg-leather rounded-r-3xl rounded-l-md shadow-[30px_20px_50px_rgba(0,0,0,0.9)] border-[6px] border-[#1a1412] relative cursor-pointer group flex items-center justify-center overflow-hidden"
                  onClick={() => setIsOpen(true)}
                  onMouseEnter={() => setIsHoveringCover(true)}
                  onMouseLeave={() => setIsHoveringCover(false)}>
                  {/* Magical Book Texture Overlay */}
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1635070041078-e363dbe005cb?ixlib=rb-4.1.0&q=80')] bg-cover opacity-30 mix-blend-multiply" />

                  {/* Book Spine Details */}
                  <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-black/80 via-black/40 to-transparent border-r border-white/5 z-10" />
                  <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-transparent to-white/10 z-10" />

                  {/* Spine Ribs */}
                  {[15, 30, 50, 70, 85].map((top) => (
                    <div
                      key={top}
                      className="absolute left-0 w-10 h-3 bg-gradient-to-b from-[#1a1412] to-[#3a2c28] shadow-[0_2px_4px_rgba(0,0,0,0.8)] border-y border-white/5 z-20"
                      style={{ top: `${top}%` }}
                    />
                  ))}

                  {/* Magical Ornaments (SVG Border) */}
                  <svg
                    className="absolute inset-0 w-full h-full p-6 text-faded-gold/40 pointer-events-none z-10"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none">
                    <rect
                      x="8"
                      y="6"
                      width="84"
                      height="88"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="0.5"
                    />
                    <rect
                      x="10"
                      y="8"
                      width="80"
                      height="84"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeDasharray="2 1"
                    />
                    {/* Corner Accents */}
                    <path
                      d="M 8 16 L 16 8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                    <path
                      d="M 92 16 L 84 8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                    <path
                      d="M 8 84 L 16 92"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                    <path
                      d="M 92 84 L 84 92"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                  </svg>

                  {/* Metal Corners */}
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-faded-gold via-[#b39e75] to-[#5c4a2a] border-b-2 border-l-2 border-[#2a2214] rounded-bl-[40px] shadow-lg z-20" />
                  <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-faded-gold via-[#b39e75] to-[#5c4a2a] border-t-2 border-l-2 border-[#2a2214] rounded-tl-[40px] shadow-lg z-20" />
                  <div className="absolute top-0 left-0 w-10 h-16 bg-gradient-to-br from-faded-gold to-[#5c4a2a] border-b-2 border-r-2 border-[#2a2214] rounded-br-[20px] shadow-lg z-20" />
                  <div className="absolute bottom-0 left-0 w-10 h-16 bg-gradient-to-tr from-faded-gold to-[#5c4a2a] border-t-2 border-r-2 border-[#2a2214] rounded-tr-[20px] shadow-lg z-20" />

                  {/* Center Magic Emblem */}
                  <motion.div
                    animate={{
                      boxShadow: isHoveringCover
                        ? "0 0 40px rgba(201,184,150,0.6), inset 0 0 20px rgba(201,184,150,0.3)"
                        : "0 0 10px rgba(0,0,0,0.8), inset 0 0 10px rgba(0,0,0,0.5)",
                      scale: isHoveringCover ? 1.02 : 1,
                    }}
                    className="relative z-30 w-56 h-72 border-4 border-faded-gold/80 rounded-[100%] flex flex-col items-center justify-center p-6 text-center gap-4 bg-[#2a1f1a]/80 backdrop-blur-sm transition-all duration-500 overflow-hidden">
                    <div className="absolute inset-2 border-2 border-dashed border-faded-gold/40 rounded-[100%]" />
                    <Wand2 className="w-12 h-12 text-faded-gold opacity-90 drop-shadow-[0_0_8px_#C9B896]" />
                    <h2 className="font-['Cinzel'] text-faded-gold text-2xl font-bold uppercase tracking-widest line-clamp-3 drop-shadow-md z-10">
                      {currentBook?.name || "Magical Diary"}
                    </h2>
                    <div className="w-12 h-0.5 bg-faded-gold/50 my-2" />
                    <p className="font-['Caveat'] text-faded-gold/80 text-2xl mt-2 flex items-center gap-2">
                      Open <Book className="w-4 h-4 inline" />
                    </p>
                  </motion.div>

                  {/* Floating particles on hover */}
                  {isHoveringCover && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 pointer-events-none overflow-hidden rounded-r-3xl z-40">
                      {[...Array(8)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{
                            y: "100%",
                            x: Math.random() * 100 + "%",
                            opacity: 0,
                          }}
                          animate={{ y: "-20%", opacity: [0, 1, 0] }}
                          transition={{
                            duration: 1.5 + Math.random() * 2,
                            repeat: Infinity,
                            delay: Math.random() * 2,
                          }}
                          className="absolute bottom-0 w-1.5 h-1.5 bg-faded-gold rounded-full shadow-[0_0_12px_#C9B896]"
                        />
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                // STATE B: Open Book（撕页时应用动画）
                <motion.div
                  key="open-book"
                  initial={{ opacity: 0, scale: 0.9, rotateX: 10 }}
                  animate={
                    isTearingEntry
                      ? {
                          opacity: 0,
                          scale: 0.2,
                          rotateY: -120,
                          rotateX: -45,
                          x: -280,
                          y: 80,
                          filter: "blur(12px)",
                        }
                      : {
                          opacity: 1,
                          scale: 1,
                          rotateX: 0,
                          rotateY: 0,
                          x: 0,
                          y: 0,
                          filter: "blur(0px)",
                        }
                  }
                  transition={
                    isTearingEntry
                      ? { duration: 0.75, ease: [0.25, 0, 0.5, 1] }
                      : { duration: 0.8, type: "spring", bounce: 0.3 }
                  }
                  style={{ transformStyle: "preserve-3d" }}
                  className="w-full max-w-7xl h-full flex flex-col md:flex-row relative shadow-[0_40px_80px_rgba(0,0,0,0.9)] origin-center">
                  {/* Book Background (Leather Cover extended) */}
                  <div className="absolute -inset-4 bg-leather rounded-lg -z-30 border-[6px] border-[#1a1412] shadow-2xl hidden md:block p-[0px]">
                    <div className="absolute inset-0 bg-black/40 rounded-lg pointer-events-none" />
                  </div>

                  {/* Paper Stack Thickness Shadows (Left) */}
                  <div className="hidden md:block absolute top-2 bottom-2 -left-2 w-4 bg-parchment rounded-l-md border-y border-l border-black/30 shadow-[-2px_0_5px_rgba(0,0,0,0.3)] -z-20" />
                  <div className="hidden md:block absolute top-1 bottom-1 -left-1 w-4 bg-parchment rounded-l-md border-y border-l border-black/20 shadow-[-1px_0_3px_rgba(0,0,0,0.2)] -z-10" />

                  {/* Paper Stack Thickness Shadows (Right) */}
                  <div className="hidden md:block absolute top-2 bottom-2 -right-2 w-4 bg-parchment rounded-r-md border-y border-r border-black/30 shadow-[2px_0_5px_rgba(0,0,0,0.3)] -z-20" />
                  <div className="hidden md:block absolute top-1 bottom-1 -right-1 w-4 bg-parchment rounded-r-md border-y border-r border-black/20 shadow-[1px_0_3px_rgba(0,0,0,0.2)] -z-10" />

                  {/* Left Page (Details & Tags) */}
                  <div className="flex-1 bg-parchment relative rounded-l-md md:border-r border-black/20 overflow-hidden shadow-[inset_-15px_0_30px_rgba(0,0,0,0.15)] group/left">
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black/5 via-transparent to-black/10" />

                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      className="h-full flex flex-col relative z-10 p-8 md:p-14 mr-4">
                      <div className="flex items-center gap-2 text-rusty-copper/60 font-['Cinzel'] mb-4 font-bold text-sm tracking-widest uppercase">
                        <span>Memory Date:</span>
                        <span>
                          {format(
                            new Date(currentDateToDisplay),
                            "MMMM do, yyyy",
                          )}
                        </span>
                      </div>

                      {isEditing ? (
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Name this memory..."
                          className="font-['Cinzel'] text-3xl lg:text-4xl text-vintage-burgundy font-bold mb-4 border-b-2 border-vintage-burgundy/20 pb-1 leading-tight drop-shadow-sm bg-transparent outline-none w-full placeholder-vintage-burgundy/30"
                        />
                      ) : (
                        <h1 className="font-['Cinzel'] text-3xl lg:text-4xl text-vintage-burgundy font-bold mb-4 border-b-2 border-vintage-burgundy/20 pb-1 leading-tight drop-shadow-sm">
                          {isNewEntry
                            ? "A New Memory"
                            : (entry?.title ?? "Untitled")}
                        </h1>
                      )}

                      <div className="w-full flex-1 min-h-[200px] border-2 border-dashed border-vintage-burgundy/20 rounded-xl mb-4 flex flex-col items-center justify-center bg-black/5 opacity-80 mix-blend-multiply relative overflow-hidden">
                        <ImagePreviewGallery
                          images={images}
                          setImages={setImages}
                          isEditing={isEditing}
                          maxImages={6}
                          previewIndex={previewIndex}
                          setPreviewIndex={setPreviewIndex}
                          layoutStyle="grid"
                          showUploadButton={true}
                          onImageUpload={handleImageUpload}
                          emptyState={
                            <p className="font-['Caveat'] text-2xl text-vintage-burgundy/50 z-10 rotate-[-5deg]">
                              ~ A memory captured in time ~
                            </p>
                          }
                        />
                      </div>

                      {(isEditing ||
                        audio.audioUrl ||
                        audio.previewUrl ||
                        isRecordingAudio) && (
                        <div className="mb-3">
                          {isEditing ? (
                            <AudioRecorderField
                              value={audio}
                              onChange={setAudio}
                              onRecordingChange={setIsRecordingAudio}
                              variant="diary-view"
                              hideUntilActive={true}
                              disabled={isSaving}
                            />
                          ) : (
                            <div className="flex flex-col gap-3 rounded-lg border border-faded-gold/15 bg-black/5 px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="font-['Cinzel'] text-sm text-rusty-copper">
                                  {audio.name ||
                                    entry?.audioName ||
                                    "Untitled Voice Memory"}
                                </div>
                                <span className="font-['Cinzel'] text-xs text-rusty-copper/70">
                                  {entry?.audioDurationSec
                                    ? `${String(Math.floor(entry.audioDurationSec / 60)).padStart(2, "0")}:${String(entry.audioDurationSec % 60).padStart(2, "0")}`
                                    : "00:00"}
                                </span>
                              </div>
                              {entry?.audioUrl && (
                                <audio
                                  controls
                                  src={entry.audioUrl}
                                  className="w-full"
                                  preload="metadata"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tags (Left Page Bottom) */}
                      {isEditing ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-auto pt-3 border-t border-vintage-burgundy/10">
                          <div className="flex flex-wrap items-center gap-2">
                            <AnimatePresence>
                              {editTags.map((tag) => (
                                <motion.span
                                  key={tag}
                                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.8, y: -10 }}
                                  whileHover={{
                                    scale: 1.05,
                                    boxShadow:
                                      "0 0 12px rgba(184,93,25,0.4), inset 0 0 8px rgba(184,93,25,0.2)",
                                    textShadow: "0 0 8px rgba(184,93,25,0.5)",
                                  }}
                                  className="flex items-center gap-1 bg-gradient-to-br from-rusty-copper/10 to-rusty-copper/5 text-rusty-copper px-3 py-1 rounded-sm font-['Cinzel'] text-sm font-bold border border-rusty-copper/30 transition-colors cursor-default">
                                  #{tag}
                                  <button
                                    onClick={() =>
                                      setEditTags((tags) =>
                                        tags.filter((t) => t !== tag),
                                      )
                                    }
                                    className="hover:text-[#2c2420] hover:bg-rusty-copper/20 rounded-full p-0.5 transition-colors outline-none">
                                    <X className="w-3 h-3" />
                                  </button>
                                </motion.span>
                              ))}
                            </AnimatePresence>
                            <div className="relative group/tag-input flex-1 min-w-[200px]">
                              <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && tagInput.trim()) {
                                    e.preventDefault();
                                    const newTag = tagInput.trim();
                                    if (!editTags.includes(newTag)) {
                                      setEditTags([...editTags, newTag]);
                                    }
                                    setTagInput("");
                                  }
                                }}
                                placeholder="Summon new tags... (Press Enter)"
                                className="w-full bg-transparent border-b-2 border-vintage-burgundy/20 pb-1 pt-1 font-['Cinzel'] text-vintage-burgundy placeholder-vintage-burgundy/40 outline-none transition-all z-10 relative focus:border-transparent"
                              />
                              {/* Magical Glowing Line */}
                              <div className="absolute bottom-0 left-0 h-[2px] w-full bg-transparent group-focus-within/tag-input:bg-rusty-copper transition-colors duration-300" />
                              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-0 bg-rusty-copper group-focus-within/tag-input:w-full group-focus-within/tag-input:shadow-[0_0_15px_2px_rgba(184,93,25,0.6)] transition-all duration-500 opacity-0 group-focus-within/tag-input:opacity-100" />
                              <Wand2 className="absolute right-2 top-0 w-4 h-4 text-vintage-burgundy/30 group-focus-within/tag-input:text-rusty-copper transition-colors duration-500 group-focus-within/tag-input:drop-shadow-[0_0_5px_rgba(184,93,25,0.8)] opacity-0 group-focus-within/tag-input:opacity-100 -rotate-12" />
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        !isNewEntry &&
                        entry?.tags &&
                        entry.tags.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-auto pt-6 border-t border-vintage-burgundy/10">
                            <div className="flex flex-wrap gap-2">
                              {entry.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="bg-rusty-copper/10 text-rusty-copper px-3 py-1 rounded-sm font-['Cinzel'] text-sm font-bold border border-rusty-copper/20 hover:bg-rusty-copper/20 transition-colors">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </motion.div>
                        )
                      )}
                    </motion.div>

                    {/* Decorative Corner */}
                    <div className="absolute bottom-6 left-6 w-20 h-20 border-l-[3px] border-b-[3px] border-vintage-burgundy/20 rounded-bl-2xl pointer-events-none" />
                    <div className="absolute top-6 left-6 w-20 h-20 border-l-[3px] border-t-[3px] border-vintage-burgundy/20 rounded-tl-2xl pointer-events-none" />
                  </div>

                  {/* Center fold shadow */}
                  <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-16 -translate-x-1/2 bg-gradient-to-r from-black/10 via-black/40 to-black/10 z-20 pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]" />
                  {/* Stitching binding in the middle */}
                  <div className="hidden md:flex absolute left-1/2 top-10 bottom-10 -translate-x-1/2 w-2 flex-col justify-between py-8 z-30 pointer-events-none opacity-60">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className="w-full h-1 bg-parchment-white shadow-sm rotate-[-10deg]"
                      />
                    ))}
                  </div>

                  {/* Right Page (Content) */}
                  <div className="flex-1 bg-parchment relative rounded-r-md overflow-hidden shadow-[inset_15px_0_30px_rgba(0,0,0,0.15)] group/right flex flex-col">
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-l from-black/5 via-transparent to-black/10 z-0" />

                    <div className="flex-1 overflow-y-auto magic-scrollbar p-8 md:p-14 ml-4 flex flex-col relative z-10">
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        className="flex-1 flex flex-col">
                        {isEditing ? (
                          <textarea
                            ref={contentTextareaRef}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onPaste={(e) =>
                              handleImagePasteHelper(e, images, setImages, 6)
                            }
                            placeholder="Let your magic flow through the quill..."
                            className="w-full flex-1 min-h-[400px] font-['Caveat'] text-2xl leading-[1.8] text-[#2c2420] whitespace-pre-wrap tracking-wide bg-transparent outline-none resize-none placeholder-[#2c2420]/30"
                            autoFocus={isNewEntry}
                          />
                        ) : (
                          <p className="font-['Caveat'] flex-1 text-2xl leading-[1.8] text-[#2c2420] whitespace-pre-wrap tracking-wide pb-12">
                            {isNewEntry
                              ? "Click the edit button below to write your first entry in this magical diary..."
                              : entry?.content}
                          </p>
                        )}
                      </motion.div>
                    </div>

                    {/* Decorative Corner */}
                    <div className="absolute bottom-6 right-6 w-20 h-20 border-r-[3px] border-b-[3px] border-vintage-burgundy/20 rounded-br-2xl pointer-events-none z-20" />
                    <div className="absolute top-6 right-6 w-20 h-20 border-r-[3px] border-t-[3px] border-vintage-burgundy/20 rounded-tr-2xl pointer-events-none z-20" />
                  </div>

                  {/* Close Button overlay */}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="absolute top-4 right-4 md:-right-6 md:-top-6 z-50 p-3 bg-[#2c2420] text-faded-gold rounded-full hover:bg-rusty-copper transition-colors shadow-xl border-2 border-faded-gold group z-100">
                    <span className="sr-only">Close Book</span>
                    <Book className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </button>

                  {/* Page turn zones：固定位置，仅透明度过渡，避免抖动 */}
                  {prevEntry && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/diary/${prevEntry.id}?open=1`);
                      }}
                      className="absolute top-1/2 -translate-y-1/2 left-0 z-[3] w-12 h-12 -translate-x-1/2 hidden md:flex items-center justify-center rounded-r-full bg-[#2c2420]/80 text-faded-gold shadow-[2px_0_10px_rgba(0,0,0,0.3)] border-y border-r border-faded-gold/30 cursor-pointer opacity-50 hover:opacity-100 transition-opacity duration-200 hover:bg-[#2c2420]"
                      title="Previous Entry">
                      <ChevronLeft className="w-7 h-7 ml-1" />
                    </button>
                  )}

                  {nextEntry && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/diary/${nextEntry.id}?open=1`);
                      }}
                      className="absolute top-1/2 -translate-y-1/2 right-0 z-[3] w-12 h-12 translate-x-1/2 hidden md:flex items-center justify-center rounded-l-full bg-[#2c2420]/80 text-faded-gold shadow-[-2px_0_10px_rgba(0,0,0,0.3)] border-y border-l border-faded-gold/30 cursor-pointer opacity-50 hover:opacity-100 transition-opacity duration-200 hover:bg-[#2c2420]"
                      title="Next Entry">
                      <ChevronRight className="w-7 h-7 mr-1" />
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Bottom Actions */}
        <footer className="pt-2 pb-4 bg-gradient-to-t from-[#1a1412] via-[#1a1412]/80 to-transparent z-20 sticky bottom-0 ">
          <div className="flex items-center justify-center gap-2 mt-2">
            {/* 隐藏式删除单条日记：最左侧，低透明度，hover 时显现 */}
            {isOpen && !isNewEntry && entry && (
              <button
                onClick={handleDeleteEntry}
                disabled={isTearingEntry}
                aria-label="Tear this page"
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-full border-2 transition-all backdrop-blur-sm font-['Cinzel'] font-bold",
                  "opacity-25 hover:opacity-100 hover:bg-red-900/40 hover:text-red-300 hover:border-red-500/50",
                  "border-[#C9B896]/30 text-[#C9B896]/70",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
                )}>
                <Trash2 className="w-5 h-5" />
                <span className="hidden sm:inline text-sm">Tear</span>
              </button>
            )}
            {!isOpen && (
              <ActionButton
                icon={<User className="w-5 h-5" />}
                label="CHUM"
                onClick={() => {
                  if (!session?.user) {
                    toast.error("Sign in before continuing.");
                    setIsAuthModalOpen(true);
                    return;
                  }
                  setIsOldFriendOpen(true);
                }}
              />
            )}
            <ActionButton
              icon={<Search className="w-5 h-5" />}
              label="Search"
              onClick={() => {
                if (isSearchOpen && searchKeyword.trim()) {
                  handleSearchEnter();
                } else {
                  setIsSearchOpen((prev) => !prev);
                }
              }}
              className={
                isSearchOpen ? "bg-faded-gold/20 border-faded-gold" : undefined
              }
            />
            {isEditing && isOpen && (
              <ActionButton
                icon={
                  isSaving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Edit3 className="w-5 h-5" />
                  )
                }
                label={isSaving ? "Sealing..." : "Save"}
                onClick={handleSave}
                disabled={
                  isSaving ||
                  isRecordingAudio ||
                  images.some((img) => img.loading)
                }
                className="bg-faded-gold text-[#2c2420] border-faded-gold hover:bg-yellow hover:border-white shadow-[0_0_15px_rgba(201,184,150,0.6)] disabled:opacity-70 disabled:cursor-not-allowed"
              />
            )}
            {!isEditing && isOpen && (
              <ActionButton
                icon={<Edit3 className="w-5 h-5" />}
                label="Edit"
                onClick={() => setIsEditing(true)}
              />
            )}
            {!isOpen && (
              <ActionButton
                icon={<Trash2 className="w-5 h-5" />}
                label="Obliviate"
                onClick={handleDeleteBook}
                className="hover:bg-red-900/40 hover:text-red-300 hover:border-red-500/50"
              />
            )}
            {/* 隐藏式添加日记：最右侧，低透明度，hover 时显现 */}
            {isOpen && currentBookId && !isEditing && (
              <button
                onClick={handleAddEntry}
                aria-label="Add a new page"
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-full border-2 transition-all backdrop-blur-sm font-['Cinzel'] font-bold",
                  "opacity-25 hover:opacity-100 hover:bg-faded-gold/20 hover:text-faded-gold hover:border-faded-gold/50",
                  "border-[#C9B896]/30 text-[#C9B896]/70",
                )}>
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline text-sm">Add</span>
              </button>
            )}
          </div>
        </footer>

        {/* Search Modal Overlay */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => {
                setIsSearchOpen(false);
                setSearchKeyword("");
              }}>
              <motion.div
                initial={{ scale: 0.95, y: -20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: -20 }}
                className="w-full max-w-lg bg-[#2c2420] border-2 border-faded-gold/40 rounded-xl shadow-2xl p-6"
                onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3">
                  {isSearching ? (
                    <Loader2 className="w-6 h-6 text-faded-gold/70 animate-spin" />
                  ) : (
                    <Search className="w-6 h-6 text-faded-gold/70" />
                  )}
                  <input
                    type="text"
                    placeholder="Search in this book..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isSearching) {
                        e.preventDefault();
                        setDebouncedSearchKeyword(searchKeyword);
                      }
                    }}
                    disabled={isSearching}
                    className="flex-1 bg-transparent border-none outline-none text-faded-gold placeholder:text-faded-gold/40 font-['Cinzel'] text-xl disabled:opacity-50"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSearchKeyword("");
                      setIsSearchOpen(false);
                    }}
                    disabled={isSearching}
                    className="p-2 text-faded-gold/70 hover:text-faded-gold transition-colors rounded-full hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Close search">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Result Modal - 多条匹配时展示列表供选择 */}
        <SearchResultModal
          isOpen={showSearchResultModal}
          onClose={() => setShowSearchResultModal(false)}
          entries={searchResultModalExactEntries}
          semanticEntries={searchResultModalSemanticEntries}
          onSelectEntry={(e) => {
            router.push(`/diary/${e.id}?open=1`);
            setShowSearchResultModal(false);
            setSearchKeyword("");
            setIsSearchOpen(false);
          }}
        />

        <OldFriendChatDrawer
          open={isOldFriendOpen}
          onClose={() => setIsOldFriendOpen(false)}
          context={
            {
              filters: {
                bookId: currentBookId,
                bookName: currentBook?.name,
                keyword: searchKeyword.trim() || undefined,
              },
              entries: bookEntries.map((e) => ({
                id: e.id,
                title: e.title,
                content: e.content,
                date: e.date,
                tags: e.tags,
              })),
              source: "diary-book",
              currentBookId,
            } satisfies OldFriendContext
          }
        />

        {/* Magical Delete Confirmation Modal */}
        <ConfirmActionModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={confirmDelete}
          isSubmitting={isDeletingBook}
          title="Obliviate Diary?"
          description="Are you sure you want to banish this entire diary to the void? This spell cannot be undone, and all memories within will be lost forever."
          confirmText="Yes"
          cancelText="Cancel"
        />
      </div>
    </>
  );
}
