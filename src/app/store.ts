import { create } from 'zustand';
import {
  getDiaryData,
  createEntry as createEntryAction,
  updateEntry as updateEntryAction,
  deleteEntry as deleteEntryAction,
  createBook as createBookAction,
  deleteBook as deleteBookAction,
  type CreateEntryInput,
  type CreateBookInput,
  DiaryEntryDto,
} from './actions/diary';

// ─────────────────────────────────────────────
// Types（与后端 DTO 对齐，title 可为 null，imageUrls 存 Supabase URL）
// ─────────────────────────────────────────────
export interface DiaryEntry {
  id: string;
  bookId: string;
  title: string | null;
  content: string;
  date: string;
  tags: string[];
  imageUrls: string[];
  /** @deprecated 使用 imageUrls，保留用于兼容 */
  images?: string[];
}

export interface DiaryBook {
  id: string;
  name: string;
  color?: string;
  type?: string;
}

// ─────────────────────────────────────────────
// Zustand store definition
// ─────────────────────────────────────────────
interface DiaryState {
  books: DiaryBook[];
  entries: DiaryEntry[];
  isLoaded: boolean;
  loadError: string | null;
  loadData: () => Promise<void>;
  saveEntry: (entry: {
    title?: string | null;
    content: string;
    bookId?: string;
    date?: string;
    tags?: string[];
    imageUrls?: string[];
    images?: string[];
  }) => Promise<DiaryEntry>;
  addEntry: (entry: DiaryEntry) => Promise<DiaryEntryDto>;
  updateEntry: (id: string, updates: Partial<DiaryEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  addBook: (book: Omit<DiaryBook, "id">) => Promise<DiaryBook>;
  deleteBook: (bookId: string) => Promise<void>;
}

export const useDiaryStore = create<DiaryState>((setState, getState) => ({
  books: [],
  entries: [],
  isLoaded: false,
  loadError: null,

  loadData: async () => {
    try {
      setState({ loadError: null });
      const data = await getDiaryData();
      setState({
        books: data.books,
        entries: data.entries,
        isLoaded: true,
        loadError: null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加载失败';
      setState({
        books: [],
        entries: [],
        isLoaded: true,
        loadError: msg,
      });
    }
  },

  saveEntry: async (entry: {
    title?: string | null;
    content: string;
    bookId?: string;
    date?: string;
    tags?: string[];
    imageUrls?: string[];
    images?: string[];
  }) => {
    const urls = entry.imageUrls ?? (entry as { images?: string[] }).images;
    const input: CreateEntryInput = {
      bookId: entry.bookId || undefined,
      title: entry.title ?? undefined,
      content: entry.content,
      date: entry.date || undefined,
      tags: entry.tags ?? undefined,
      imageUrls: urls?.length ? urls : undefined,
    };
    const created = await createEntryAction(input);
    setState({
      entries: [created, ...getState().entries],
    });
    return created;
  },

  addEntry: async (entry) => {
    const urls = entry.imageUrls ?? (entry as { images?: string[] }).images;
    const input: CreateEntryInput = {
      bookId: entry.bookId || undefined,
      title: entry.title ?? undefined,
      content: entry.content,
      date: entry.date || undefined,
      tags: entry.tags ?? undefined,
      imageUrls: urls?.length ? urls : undefined,
    };
    const created = await createEntryAction(input);
    setState({
      entries: [created, ...getState().entries],
    });
    return created;
  },

  updateEntry: async (id, updates) => {
    const urls = updates.imageUrls ?? (updates as { images?: string[] }).images;
    const updated = await updateEntryAction(id, {
      title: updates.title,
      content: updates.content,
      date: updates.date,
      tags: updates.tags,
      imageUrls: urls,
    });
    setState({
      entries: getState().entries.map((e) => (e.id === id ? updated : e)),
    });
  },

  deleteEntry: async (id) => {
    await deleteEntryAction(id);
    setState({
      entries: getState().entries.filter((e) => e.id !== id),
    });
  },

  addBook: async (book) => {
    const input: CreateBookInput = {
      name: book.name,
      color: book.color,
      type: book.type,
    };
    const created = await createBookAction(input);
    setState({
      books: [...getState().books, created],
    });
    return created;
  },

  deleteBook: async (bookId) => {
    await deleteBookAction(bookId);
    setState({
      books: getState().books.filter((b) => b.id !== bookId),
      entries: getState().entries.filter((e) => e.bookId !== bookId),
    });
  },
}));
