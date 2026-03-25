"use client";

/**
 * Dashboard 页面：日记创建、筛选与浏览的主入口
 */
import { format } from "date-fns";
import {
  BookOpen,
  Calendar,
  Filter,
  Image as ImageIcon,
  Loader2,
  LogIn,
  Search,
  Star,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { deleteEntries, getEntriesPaginated, getTags } from "../actions/diary";
import {
  DiaryImage,
  ImagePreviewGallery,
} from "../components/ImagePreviewGallery";
import { MagicCalendar } from "../components/MagicCalendar";
import { MagicCalendarRange } from "../components/MagicCalendarRange";
import { OldFriendButton } from "../components/OldFriendChat/OldFriendButton";
import { OldFriendChatDrawer } from "../components/OldFriendChat/OldFriendChatDrawer";
import { cn, LeatherBox, MagicButton, ParchmentBox } from "../components/UI";
import { AuthModal } from "../components/auth/AuthModal";
import { useOnboardingContext } from "../components/onboarding/OnboardingContext";
import { useDiaryStore } from "../store";
import { CreateBookModal, type BookData } from "../components/CreateBookModal";
import { ViewEntryModal } from "../components/ViewEntryModal";
import type { OldFriendContext } from "../types/ai-chat";

import { handleImageUploadHelper, handleImagePasteHelper } from "../../lib/image";


/**
 * Dashboard 主组件
 */
export function Dashboard() {
  // 路由与会话
  const router = useRouter();
  const { data: session } = useSession();
  const { entries, books, saveEntry, addBook } = useDiaryStore();
  const [isSaving, setIsSaving] = useState(false);

  // 新建日记表单状态
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [selectedBook, setSelectedBook] = useState(books[0]?.id ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [images, setImages] = useState<DiaryImage[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [viewingPreviewIndex, setViewingPreviewIndex] = useState<number | null>(
    null,
  );
  const [isNewBookModalOpen, setIsNewBookModalOpen] = useState(false);
  const [viewingEntryId, setViewingEntryId] = useState<string | null>(null);
  const [selectedFilterDateRange, setSelectedFilterDateRange] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isEntryDatePickerOpen, setIsEntryDatePickerOpen] = useState(false);

  // New state for the creation date
  const [entryDate, setEntryDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  // Tag filter state
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [isBookDropdownOpen, setIsBookDropdownOpen] = useState(false);
  const [selectedFilterBook, setSelectedFilterBook] = useState<string | null>(
    null,
  );
  const [isBookFilterDropdownOpen, setIsBookFilterDropdownOpen] =
    useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialMode, setAuthModalInitialMode] = useState<
    "login" | "register"
  >("login");
  const [isCreatingBook, setIsCreatingBook] = useState(false);
  const [pendingBookData, setPendingBookData] = useState<{
    name: string;
    color: string;
    type: string;
  } | null>(null);
  const onboardingCtx = useOnboardingContext();
  const [isOldFriendOpen, setIsOldFriendOpen] = useState(false);
  const bookDropdownRef = useRef<HTMLDivElement>(null);
  const authSuccessRef = useRef(false);

  // 注册新手引导 actions
  useEffect(() => {
    if (!onboardingCtx) return;
    onboardingCtx.registerActions({
      openAuthModal: (mode = "login") => {
        setAuthModalInitialMode(mode);
        setIsAuthModalOpen(true);
      },
      openCreateBookModal: () => setIsNewBookModalOpen(true),
      scrollToBookshelf: () => {
        document
          .getElementById("bookshelf")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      },
    });
  }, [onboardingCtx]);

  // 分页列表状态
  const [listEntries, setListEntries] = useState<typeof entries>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingMoreRef = useRef(false);

  // 删除功能状态
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(
    new Set(),
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // 关键词防抖 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // 默认选中第一个日记本
  useEffect(() => {
    if (
      books.length > 0 &&
      (!selectedBook || !books.some((b) => b.id === selectedBook))
    ) {
      setSelectedBook(books[0].id);
    }
  }, [books, selectedBook]);

  // Close book dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        bookDropdownRef.current &&
        !bookDropdownRef.current.contains(e.target as Node)
      ) {
        setIsBookDropdownOpen(false);
      }
    };
    if (isBookDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isBookDropdownOpen]);

  // 加载 tags 用于筛选下拉
  useEffect(() => {
    if (session?.user) {
      getTags()
        .then(setAvailableTags)
        .catch(() => {});
    }
  }, [session?.user]);

  // 加载分页日记：筛选条件变化时重置并加载第一页
  useEffect(() => {
    if (!session?.user) return;
    setListEntries([]);
    setNextCursor(null);
    setHasMore(true);
    setIsLoadingEntries(true);
    getEntriesPaginated({
      dateFrom: selectedFilterDateRange?.from,
      dateTo: selectedFilterDateRange?.to,
      tag: selectedTag ?? undefined,
      bookId: selectedFilterBook ?? undefined,
      keyword: debouncedSearchQuery.trim() || undefined,
      limit: 30,
    })
      .then((res) => {
        setListEntries(res.entries);
        setNextCursor(res.nextCursor);
        setHasMore(res.hasMore);
      })
      .catch(() => {
        setListEntries([]);
        setNextCursor(null);
        setHasMore(false);
      })
      .finally(() => setIsLoadingEntries(false));
  }, [
    session?.user,
    selectedFilterDateRange?.from,
    selectedFilterDateRange?.to,
    selectedTag,
    selectedFilterBook,
    debouncedSearchQuery,
  ]);

  // 无限滚动：距离底部 30vh 时加载下一页
  useEffect(() => {
    if (!session?.user || !hasMore || isLoadingEntries || !nextCursor) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || isLoadingMoreRef.current) return;
        isLoadingMoreRef.current = true;
        setIsLoadingEntries(true);
        getEntriesPaginated({
          dateFrom: selectedFilterDateRange?.from,
          dateTo: selectedFilterDateRange?.to,
          tag: selectedTag ?? undefined,
          bookId: selectedFilterBook ?? undefined,
          keyword: debouncedSearchQuery.trim() || undefined,
          cursor: nextCursor,
          limit: 30,
        })
          .then((res) => {
            setListEntries((prev) => [...prev, ...res.entries]);
            setNextCursor(res.nextCursor);
            setHasMore(res.hasMore);
          })
          .catch(() => setHasMore(false))
          .finally(() => {
            isLoadingMoreRef.current = false;
            setIsLoadingEntries(false);
          });
      },
      { rootMargin: "0px 0px 30vh 0px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [
    session?.user,
    hasMore,
    isLoadingEntries,
    nextCursor,
    selectedFilterDateRange?.from,
    selectedFilterDateRange?.to,
    selectedTag,
    selectedFilterBook,
    debouncedSearchQuery,
  ]);

  // 图片上传与压缩
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await handleImageUploadHelper(e, images, setImages, 5);
  };

  // 标签输入的回车分隔
  const handleTagsKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const cleaned = tagsStr
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (!cleaned.length) return;
    setTagsStr(`${cleaned.join(", ")}, `);
  };

  const handleDeleteEntries = async () => {
    if (selectedForDeletion.size === 0) {
      setIsDeleteMode(false);
      return;
    }

    setIsDeleting(true);
    try {
      const ids = Array.from(selectedForDeletion);
      const res = await deleteEntries(ids);
      if (res.count > 0) {
        toast.success(`成功遗忘 ${res.count} 篇记忆`);
        setListEntries((prev) =>
          prev.filter((entry) => !selectedForDeletion.has(entry.id)),
        );
        setSelectedForDeletion(new Set());
        setIsDeleteMode(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    } finally {
      setIsDeleting(false);
    }
  };

  // 日记保存逻辑
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    if (images.some((img) => img.loading)) {
      toast.error("请等待图片加载完成");
      return;
    }

    // 检查登录状态
    if (!session?.user) {
      toast.error("请先登录账号");
      setAuthModalInitialMode("login");
      setIsAuthModalOpen(true);
      return;
    }

    setIsSaving(true);
    try {
      const created = await saveEntry({
        title: title.trim() || null,
        content,
        bookId: selectedBook || undefined,
        date: new Date(entryDate).toISOString(),
        tags: tagsStr
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        images:
          images.length > 0
            ? images
                .filter((img) => !img.loading && img.url)
                .map((img) => img.url)
            : undefined,
      });
      const keyword = debouncedSearchQuery.trim().toLowerCase();
      const createdDate = new Date(created.date).getTime();
      const filterFrom = selectedFilterDateRange?.from
        ? new Date(selectedFilterDateRange.from).getTime()
        : null;
      const filterTo = selectedFilterDateRange?.to
        ? new Date(selectedFilterDateRange.to).getTime()
        : null;
      const tagSet = new Set((created.tags ?? []).map((t) => t.toLowerCase()));
      const matchesTag = selectedTag
        ? tagSet.has(selectedTag.toLowerCase())
        : true;
      const matchesBook = selectedFilterBook
        ? created.bookId === selectedFilterBook
        : true;
      const matchesDateFrom = filterFrom ? createdDate >= filterFrom : true;
      const matchesDateTo = filterTo ? createdDate <= filterTo : true;
      const matchesKeyword = keyword
        ? `${created.title ?? ""} ${created.content} ${(created.tags ?? []).join(" ")}`
            .toLowerCase()
            .includes(keyword)
        : true;
      if (
        matchesTag &&
        matchesBook &&
        matchesDateFrom &&
        matchesDateTo &&
        matchesKeyword
      ) {
        setListEntries((prev) => {
          const next = [
            created,
            ...prev.filter((entry) => entry.id !== created.id),
          ];
          return next.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          );
        });
      }
      toast.success("日记已保存");
      setTitle("");
      setContent("");
      setTagsStr("");
      setImages([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  // 创建日记本逻辑
  const handleCreateBook = async (data: BookData) => {
    if (!data.name.trim()) return;

    if (!session?.user) {
      setPendingBookData(data);
      setAuthModalInitialMode("register");
      setIsAuthModalOpen(true);
      return;
    }

    setIsCreatingBook(true);
    try {
      const created = await addBook(data);
      toast.success("日记本已创建");
      setSelectedBook(created.id);
      onboardingCtx?.emitBookCreated();
      setIsNewBookModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "创建失败";
      if (msg === "Unauthorized" || msg.includes("未登录")) {
        setPendingBookData(data);
        setAuthModalInitialMode("register");
        setIsAuthModalOpen(true);
      } else {
        toast.error(msg);
      }
    } finally {
      setIsCreatingBook(false);
    }
  };

  // 页面结构：头部、输入区、书架、筛选工具条、列表与弹层
  return (
    <div className="min-h-screen bg-gradient-to-br from-castle-stone via-[#2c2438] to-[#1a1420] text-parchment-white p-6 pb-20 font-sans relative overflow-hidden">
      <AuthModal
        open={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        initialMode={authModalInitialMode}
        onSuccess={async () => {
          authSuccessRef.current = true;
          onboardingCtx?.emitAuthComplete();

          // 如果有待创建的日记本数据，自动创建
          if (pendingBookData && authModalInitialMode === "register") {
            setIsCreatingBook(true);
            try {
              const created = await addBook(pendingBookData);
              toast.success("日记本已创建");
              setSelectedBook(created.id);
              onboardingCtx?.emitBookCreated();
              setIsNewBookModalOpen(false);
            } catch (err) {
              const msg = err instanceof Error ? err.message : "创建失败";
              toast.error(msg);
            } finally {
              setIsCreatingBook(false);
              setPendingBookData(null);
            }
          }
        }}
        onClose={() => {
          if (!authSuccessRef.current) {
            onboardingCtx?.emitAuthModalClosedWithoutSuccess?.();
            // 如果注册失败或取消创建，清除待创建数据
            if (authModalInitialMode === "register") {
              setPendingBookData(null);
            }
          }
          authSuccessRef.current = false;
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1518118237096-3c22df574888?ixlib=rb-4.1.0&auto=format&fit=crop&q=80')",
          backgroundSize: "cover",
          mixBlendMode: "overlay",
          filter: "hue-rotate(20deg) saturate(150%)",
        }}
      />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#6b4c7a] rounded-full blur-[150px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#8b6b45] rounded-full blur-[150px] opacity-20 pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-12 relative z-10">
        {/* Header */}
        <header className="relative text-center py-8 m-[0px]">
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            data-onboarding-target="step1-login"
            className="absolute top-0 right-0 flex items-center gap-2 rounded-lg bg-rusty-copper/80 px-4 py-2 text-faded-gold hover:bg-rusty-copper transition-colors"
            aria-label={session ? "账户" : "登录或创建账号"}>
            <LogIn className="size-4" />
            {session ? session?.user?.email : "login"}
          </button>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}>
            <h1 className="text-5xl md:text-6xl text-faded-gold flex items-center justify-center gap-4 mb-2 drop-shadow-[0_0_10px_rgba(201,184,150,0.5)]">
              <Star className="w-8 h-8 text-faded-gold animate-pulse" />
              Wizard&apos;s Diary
              <Wand2 className="w-8 h-8 text-faded-gold animate-bounce" />
            </h1>
            <p className="text-faded-gold/80 italic font-['Caveat'] text-[40px]">
              Record your magical journey...
            </p>
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
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <div className="relative flex items-center gap-2 text-rusty-copper font-['Cinzel'] text-lg whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setIsEntryDatePickerOpen(true)}
                      className="flex items-center gap-2 bg-transparent border-none outline-none text-rusty-copper font-['Cinzel'] cursor-pointer hover:bg-rusty-copper/10 px-2 py-1 rounded transition-colors">
                      <Calendar className="w-5 h-5" />
                      <span>
                        {entryDate
                          ? format(new Date(entryDate), "MMM d, yyyy")
                          : "Select Date"}
                      </span>
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
                      onChange={(e) => setContent(e.target.value)}
                      onPaste={(e) => handleImagePasteHelper(e, images, setImages, 5)}
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
                      onChange={(e) => setTagsStr(e.target.value)}
                      onKeyDown={handleTagsKeyDown}
                    />
                    {/* Custom Magical Book Dropdown */}
                    <div ref={bookDropdownRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setIsBookDropdownOpen((prev) => !prev)}
                        className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#C9B896]/60 outline-none cursor-pointer font-['Cinzel'] text-xl text-rusty-copper transition-all">
                        <BookOpen className="w-5 h-5 text-faded-gold flex-shrink-0" />
                        <span className="max-w-[120px] truncate">
                          {books.find((b) => b.id === selectedBook)?.name ??
                            "Select Book"}
                        </span>
                        <motion.span
                          animate={{ rotate: isBookDropdownOpen ? 180 : 0 }}
                          transition={{ duration: 0.25 }}
                          className="ml-1 text-faded-gold text-xs">
                          ▼
                        </motion.span>
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
                              background: "#eae5dd",
                              border: "1px solid rgba(201,184,150,0.6)",
                              boxShadow:
                                "inset 0 0 18px rgba(201,184,150,0.7), 0 0 20px rgba(201,184,150,0.4), 0 8px 24px rgba(0,0,0,0.35)",
                            }}>
                            {/* Decorative top shimmer */}
                            <div
                              className="h-[2px] w-full"
                              style={{
                                background:
                                  "linear-gradient(90deg, transparent, #C9B896, #FFE08A, #C9B896, transparent)",
                              }}
                            />
                            <div className="py-2 px-1">
                              <div className="text-xs font-['Cinzel'] text-rusty-copper/60 px-3 pb-1 border-b border-rusty-copper/20 mb-1 tracking-widest uppercase">
                                ✦ Diary Books ✦
                              </div>
                              {books.map((b) => (
                                <button
                                  key={b.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedBook(b.id);
                                    setIsBookDropdownOpen(false);
                                  }}
                                  className="w-full text-left px-3 py-2 flex items-center gap-2 font-['Cinzel'] text-base transition-all rounded-lg"
                                  style={{
                                    color:
                                      selectedBook === b.id
                                        ? "#5c2a2a"
                                        : "#7a4f2a",
                                    background:
                                      selectedBook === b.id
                                        ? "rgba(201,184,150,0.5)"
                                        : "transparent",
                                    textShadow:
                                      selectedBook === b.id
                                        ? "0 0 8px rgba(201,184,150,0.8)"
                                        : "none",
                                  }}
                                  onMouseEnter={(e) => {
                                    if (selectedBook !== b.id)
                                      (
                                        e.currentTarget as HTMLButtonElement
                                      ).style.background =
                                        "rgba(201,184,150,0.3)";
                                  }}
                                  onMouseLeave={(e) => {
                                    if (selectedBook !== b.id)
                                      (
                                        e.currentTarget as HTMLButtonElement
                                      ).style.background = "transparent";
                                  }}>
                                  <span
                                    className="w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-white/40"
                                    style={{
                                      backgroundColor: b.color || "#5c2a2a",
                                    }}
                                  />
                                  <span className="truncate">{b.name}</span>
                                  {selectedBook === b.id && (
                                    <Wand2 className="w-3.5 h-3.5 ml-auto text-faded-gold flex-shrink-0" />
                                  )}
                                </button>
                              ))}
                            </div>
                            {/* Decorative bottom shimmer */}
                            <div
                              className="h-[2px] w-full"
                              style={{
                                background:
                                  "linear-gradient(90deg, transparent, #C9B896, #FFE08A, #C9B896, transparent)",
                              }}
                            />
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
                      <label
                        className="p-2 text-rusty-copper hover:text-vintage-burgundy transition-colors hover:scale-110 cursor-pointer"
                        title="Upload Image (Max 5)">
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                        />
                        <ImageIcon className="w-7 h-7" />
                      </label>
                    )}
                    <MagicButton type="submit" disabled={isSaving}>
                      {isSaving ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          保存中...
                        </span>
                      ) : (
                        "save"
                      )}
                    </MagicButton>
                  </div>
                </div>
              </form>
            </ParchmentBox>
          </LeatherBox>
        </section>

        {/* Section 2: Bookshelf */}
        <section id="bookshelf" data-onboarding-target="bookshelf">
          <div className="relative bg-gradient-to-b from-[#15100e] via-[#2a201b] to-[#1a1412] rounded-xl border-y-[16px] border-[#3b2f2f] border-x-8 shadow-[inset_0_20px_40px_rgba(0,0,0,0.9),inset_0_-10px_20px_rgba(0,0,0,0.5),0_15px_30px_rgba(0,0,0,0.6)] flex items-end gap-6 overflow-x-auto magic-scrollbar h-[260px] px-8 pb-3 pt-12">
            {/* Shelf highlight and inner shadow */}
            <div className="absolute inset-0 pointer-events-none border-b border-white/5 rounded-sm" />

            {books.map((book, idx) => (
              <motion.div
                key={book.id}
                onClick={() => router.push(`/book/${book.id}`)}
                data-onboarding-target={
                  idx === books.length - 1 ? "step3-first-book" : undefined
                }
                whileHover={{ y: -10, rotate: -2, scale: 1.05 }}
                className={cn(
                  "relative w-32 h-44 rounded-r-lg shadow-2xl cursor-pointer flex-shrink-0 flex items-center justify-center text-center p-2 border-l-8 border-[#1a1412] transition-colors group",
                )}
                style={{
                  backgroundColor:
                    book.color || (idx % 2 === 0 ? "#5c2a2a" : "#2c3e50"),
                }}>
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-r-lg shadow-[0_0_20px_#C9B896_inset] z-20 p-[0px]" />
                <div className="absolute left-2 top-0 bottom-0 w-1 bg-white/10" />
                <h3 className="font-['Cinzel'] text-faded-gold font-bold text-lg leading-tight z-10 drop-shadow-md relative pointer-events-none">
                  {book.name}
                </h3>
              </motion.div>
            ))}

            <motion.div
              whileHover={{ scale: 1.05 }}
              onClick={() => setIsNewBookModalOpen(true)}
              data-onboarding-target="step2-add-book"
              className="w-32 h-44 rounded-r-lg border-2 border-dashed border-faded-gold/50 flex-shrink-0 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
              <span className="text-4xl text-faded-gold/50">+</span>
            </motion.div>
          </div>
        </section>

        {/* Section 3: Sticky Toolbar */}
        <section className="sticky top-4 z-50">
          <div className="bg-[#EBE5DC] text-[#4A4540] p-4 rounded-lg shadow-[4px_4px_0_0_rgba(139,90,90,0.15)] border border-[#8B5A5A]/30 flex flex-col md:flex-row gap-4 items-center justify-between relative overflow-visible">
            <div
              className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(#4A4540 1px, transparent 1px)",
                backgroundSize: "16px 16px",
                overflow: "visible",
              }}></div>

            <div className="flex items-center gap-4 w-full md:w-auto relative z-10">
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsBookFilterDropdownOpen(false);
                    setIsTagDropdownOpen(false);
                    setIsDatePickerOpen(!isDatePickerOpen);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-md border border-[#4A4540]/30 hover:bg-white/80 transition-colors focus:ring-2 focus:ring-[#8B5A5A] outline-none">
                  <Calendar className="w-5 h-5 text-[#4A4540]" />
                  <span className="font-['Cinzel'] font-bold text-[#4A4540]">
                    {selectedFilterDateRange
                      ? `${format(new Date(selectedFilterDateRange.from), "MMM dd")} - ${format(new Date(selectedFilterDateRange.to), "MMM dd, yyyy")}`
                      : "All Dates"}
                  </span>
                  {selectedFilterDateRange && (
                    <X
                      className="w-4 h-4 ml-1 text-[#4A4540]/60 hover:text-[#4A4540]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFilterDateRange(null);
                        setIsDatePickerOpen(false);
                      }}
                    />
                  )}
                </button>

                <AnimatePresence>
                  {isDatePickerOpen && (
                    <MagicCalendarRange
                      range={selectedFilterDateRange ?? undefined}
                      onSelectRange={(from, to) => {
                        setSelectedFilterDateRange({ from, to });
                        setIsDatePickerOpen(false);
                      }}
                      onClear={() => setSelectedFilterDateRange(null)}
                      onClose={() => setIsDatePickerOpen(false)}
                      title="Select date range"
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Book Filter */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsDatePickerOpen(false);
                    setIsTagDropdownOpen(false);
                    setIsBookFilterDropdownOpen(!isBookFilterDropdownOpen);
                  }}
                  className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-md border border-[#4A4540]/30 hover:bg-white/80 transition-colors focus:ring-2 focus:ring-[#8B5A5A] outline-none">
                  <BookOpen className="w-5 h-5 text-[#4A4540]" />
                  <span className="font-['Cinzel'] font-bold text-[#4A4540]">
                    {selectedFilterBook
                      ? (books.find((b) => b.id === selectedFilterBook)?.name ??
                        "All Books")
                      : "All Books"}
                  </span>
                  {selectedFilterBook && (
                    <X
                      className="w-4 h-4 ml-1 text-[#4A4540]/60 hover:text-[#4A4540]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFilterBook(null);
                        setIsBookFilterDropdownOpen(false);
                      }}
                    />
                  )}
                </button>

                <AnimatePresence>
                  {isBookFilterDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full mt-2 left-0 bg-[#EBE5DC] border border-[#8B5A5A]/30 rounded-lg shadow-xl p-3 z-[100] min-w-[200px] max-h-[300px] overflow-y-auto magic-scrollbar">
                      <div className="text-sm font-['Cinzel'] text-[#4A4540]/70 mb-2 px-2 border-b border-[#8B5A5A]/20 pb-1">
                        Diary Books
                      </div>
                      {books.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {books.map((book) => (
                            <button
                              key={book.id}
                              onClick={() => {
                                setSelectedFilterBook(book.id);
                                setIsBookFilterDropdownOpen(false);
                              }}
                              className={cn(
                                "text-left px-3 py-2 rounded-md transition-colors flex items-center justify-between gap-2",
                                selectedFilterBook === book.id
                                  ? "bg-[#8B5A5A] text-[#EBE5DC]"
                                  : "hover:bg-white/50 text-[#4A4540]",
                              )}>
                              <span className="flex items-center gap-2">
                                <span
                                  className="w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-black/20"
                                  style={{
                                    backgroundColor: book.color || "#5c2a2a",
                                  }}
                                />
                                <span className="font-['Cinzel'] text-base">
                                  {book.name}
                                </span>
                              </span>
                              {selectedFilterBook === book.id && (
                                <Wand2 className="w-4 h-4 flex-shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-[#4A4540]/60 text-sm font-['Cinzel']">
                          No books available
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative">
                <button
                  onClick={() => {
                    setIsDatePickerOpen(false);
                    setIsBookFilterDropdownOpen(false);
                    setIsTagDropdownOpen(!isTagDropdownOpen);
                  }}
                  className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-md border border-[#4A4540]/30 hover:bg-white/80 transition-colors focus:ring-2 focus:ring-[#8B5A5A] outline-none">
                  <Filter className="w-5 h-5 text-[#4A4540]" />
                  <span className="font-['Cinzel'] font-bold text-[#4A4540]">
                    {selectedTag ? `#${selectedTag}` : "All Tags"}
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
                      className="absolute top-full mt-2 left-0 bg-[#EBE5DC] border border-[#8B5A5A]/30 rounded-lg shadow-xl p-3 z-[100] min-w-[200px] max-h-[300px] overflow-y-auto magic-scrollbar">
                      <div className="text-sm font-['Cinzel'] text-[#4A4540]/70 mb-2 px-2 border-b border-[#8B5A5A]/20 pb-1">
                        Magical Tags
                      </div>
                      {availableTags.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {availableTags.map((tag) => (
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
                                  : "hover:bg-white/50 text-[#4A4540]",
                              )}>
                              <span className="font-['Caveat'] text-xl">
                                #{tag}
                              </span>
                              {selectedTag === tag && (
                                <Wand2 className="w-4 h-4" />
                              )}
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

            <div className="relative flex items-center gap-3 flex-1 min-w-0">
              <div className="relative w-full md:max-w-[280px] z-10">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4A4540]/60" />
                <input
                  type="text"
                  placeholder="Search the archives..."
                  className="w-full bg-white/50 border border-[#4A4540]/30 rounded-full py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-[#8B5A5A] text-xl font-['Caveat'] placeholder:text-[#4A4540]/50 transition-colors hover:bg-white/80"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                onClick={() => {
                  if (!session?.user) {
                    toast.error("请先登录账号");
                    setAuthModalInitialMode("login");
                    setIsAuthModalOpen(true);
                    return;
                  }
                  if (isDeleteMode) {
                    if (selectedForDeletion.size > 0) {
                      handleDeleteEntries();
                    } else {
                      setIsDeleteMode(false);
                    }
                  } else {
                    setIsDeleteMode(true);
                    setSelectedForDeletion(new Set());
                  }
                }}
                disabled={isDeleting}
                className={cn(
                  "relative flex items-center justify-center gap-2 px-3 py-2 rounded-md border transition-all flex-shrink-0 outline-none",
                  isDeleteMode
                    ? "bg-[#8B5A5A] text-[#EBE5DC] border-[#8B5A5A] hover:bg-[#7A4A4A]"
                    : "bg-white/50 text-[#4A4540]/60 border-[#4A4540]/30 hover:bg-white/80 hover:text-[#4A4540]",
                )}
                title={isDeleteMode ? "执行遗忘" : "批量遗忘"}>
                {isDeleting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    {isDeleteMode && (
                      <span className="font-['Cinzel'] font-bold text-sm">
                        遗忘
                      </span>
                    )}
                  </>
                )}
                {isDeleteMode && selectedForDeletion.size > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#4A4540] text-[#EBE5DC] text-xs font-bold flex items-center justify-center rounded-full shadow-sm">
                    {selectedForDeletion.size}
                  </span>
                )}
              </button>
            </div>
            <OldFriendButton
              onClick={() => {
                if (!session?.user) {
                  toast.error("请先登录账号");
                  setAuthModalInitialMode("login");
                  setIsAuthModalOpen(true);
                  return;
                }
                setIsOldFriendOpen(true);
              }}
            />
          </div>
        </section>

        <OldFriendChatDrawer
          open={isOldFriendOpen}
          onClose={() => setIsOldFriendOpen(false)}
          context={
            {
              filters: {
                dateFrom: selectedFilterDateRange?.from,
                dateTo: selectedFilterDateRange?.to,
                bookId: selectedFilterBook ?? undefined,
                bookName: selectedFilterBook
                  ? books.find((b) => b.id === selectedFilterBook)?.name
                  : undefined,
                tag: selectedTag ?? undefined,
                keyword: debouncedSearchQuery.trim() || undefined,
              },
              entries: listEntries.slice(0, 30).map((e) => ({
                id: e.id,
                title: e.title,
                content: e.content,
                date: e.date,
                tags: e.tags,
              })),
              source: "dashboard",
            } satisfies OldFriendContext
          }
        />

        {/* Section 4: Feed */}
        <section className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6 mb-30">
          {isLoadingEntries && listEntries.length === 0 && (
            <div className="col-span-full flex justify-center py-20">
              <Loader2 className="w-12 h-12 text-faded-gold animate-spin" />
            </div>
          )}
          <AnimatePresence>
            {listEntries.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                layout
                layoutId={entry.id}
                className="break-inside-avoid relative">
                <ParchmentBox
                  isInteractive
                  className={cn(
                    "transition-all duration-300",
                    isDeleteMode &&
                      selectedForDeletion.has(entry.id) &&
                      "brightness-50 scale-95",
                  )}>
                  <div
                    onClick={() => {
                      if (isDeleteMode) {
                        setSelectedForDeletion((prev) => {
                          const next = new Set(prev);
                          if (next.has(entry.id)) {
                            next.delete(entry.id);
                          } else {
                            next.add(entry.id);
                          }
                          return next;
                        });
                      } else {
                        setViewingEntryId(entry.id);
                      }
                    }}
                    className="flex flex-col gap-3 relative z-0 h-full w-full cursor-pointer">
                    <div className="flex justify-between items-start">
                      <h3 className="font-['Cinzel'] font-bold text-2xl text-vintage-burgundy leading-tight mb-1">
                        {entry.title ?? "Untitled"}
                      </h3>
                      <span className="text-sm font-['Cinzel'] text-rusty-copper/70 flex-shrink-0 ml-2">
                        {format(new Date(entry.date), "MMM dd")}
                      </span>
                    </div>

                    <p className="text-xl text-castle-stone/90 line-clamp-4 leading-relaxed">
                      {entry.content}
                    </p>

                    {entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {entry.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-sm bg-rusty-copper/10 text-rusty-copper px-2 py-0.5 rounded-full border border-rusty-copper/20 font-[Caveat]">
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

          {!isLoadingEntries && listEntries.length === 0 && (
            <div className="col-span-full text-center py-20">
              <Wand2 className="w-16 h-16 text-faded-gold/50 mx-auto mb-4 block" />
              <p className="text-2xl text-faded-gold/70 font-['Caveat'] pt-10 block">
                No magical records found...
              </p>
            </div>
          )}

          <div
            ref={sentinelRef}
            className="h-px w-full col-span-full"
            aria-hidden
          />

          {!hasMore && listEntries.length > 0 && (
            <div className="col-span-full text-center py-8">
              <p className="text-[#C9B896]/70 font-['STSong'] text-xl italic">
                记忆提取完毕
              </p>
            </div>
          )}
        </section>
      </div>

      <ViewEntryModal
        entryId={viewingEntryId}
        onClose={() => setViewingEntryId(null)}
        entries={listEntries}
        books={books}
        viewingPreviewIndex={viewingPreviewIndex}
        setViewingPreviewIndex={setViewingPreviewIndex}
      />

      <CreateBookModal
        isOpen={isNewBookModalOpen && !isAuthModalOpen}
        onClose={() => setIsNewBookModalOpen(false)}
        onCreate={handleCreateBook}
        isCreating={isCreatingBook}
      />
    </div>
  );
}
