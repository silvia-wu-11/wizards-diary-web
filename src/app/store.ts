import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { get, set } from 'idb-keyval';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface DiaryEntry {
  id: string;
  bookId: string;
  title: string;
  content: string;
  date: string;
  tags: string[];
  images?: string[];
}

export interface DiaryBook {
  id: string;
  name: string;
  color?: string;
  type?: string;
}

// ─────────────────────────────────────────────
// Storage Keys
// ─────────────────────────────────────────────
// localStorage（同步写入，文本元数据主备份，关标签页前100%完成）
const LS_BOOKS   = 'wiz_ls_books';   // DiaryBook[]
const LS_ENTRIES = 'wiz_ls_entries'; // EntryMeta[] (no images field)

// IDB（异步，存完整数据含 base64 图片）
const IDB_BOOKS   = 'wizard_books';
const IDB_ENTRIES = 'wizard_entries';

// ─────────────────────────────────────────────
// Default seed data
// ─────────────────────────────────────────────
const DEFAULT_BOOKS: DiaryBook[] = [
  { id: 'book-1', name: 'Gryffindor Notes', color: '#5c2a2a' },
  { id: 'book-2', name: 'Potions Journal',  color: '#2c3e50' },
];

const DEFAULT_ENTRIES: DiaryEntry[] = [
  {
    id: 'entry-default-1',
    bookId: 'book-1',
    title: 'First Day at Hogwarts',
    content: 'The Great Hall was magnificent. The ceiling looked just like the night sky! I was sorted into Gryffindor, just like my father...',
    date: new Date().toISOString(),
    tags: ['Hogwarts', 'Gryffindor'],
  },
];

// ─────────────────────────────────────────────
// localStorage helpers（同步，极可靠）
// ─────────────────────────────────────────────
type EntryMeta = Omit<DiaryEntry, 'images'>;

function lsRead<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function lsWrite(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage 配额超限时忽略（图片太大时可能发生）
  }
}

/** 从 DiaryEntry[] 提取不含 images 的元数据写入 localStorage */
function lsWriteEntryMeta(entries: DiaryEntry[]): void {
  const meta: EntryMeta[] = entries.map(({ images: _images, ...rest }) => rest);
  lsWrite(LS_ENTRIES, meta);
}

function lsWriteBooks(books: DiaryBook[]): void {
  lsWrite(LS_BOOKS, books);
}

// ─────────────────────────────────────────────
// IDB helpers（异步，存图片；失败不影响文本数据）
// ─────────────────────────────────────────────
async function idbRead<T>(key: string): Promise<T | undefined> {
  try {
    return await get<T>(key);
  } catch (err) {
    console.warn(`[IDB] read "${key}" failed:`, err);
    return undefined;
  }
}

async function idbWrite<T>(key: string, value: T): Promise<void> {
  try {
    await set(key, value);
  } catch (err) {
    console.warn(`[IDB] write "${key}" failed:`, err);
    // 不 re-throw：IDB 失败不中断流程，localStorage 已经作为备份
  }
}

// ─────────────────────────────────────────────
// 数据合并逻辑
// ─────────────────────────────────────────────
/**
 * 合并策略：
 * - localStorage 是元数据（条目存在性、文本内容）的权威源
 *   原因：lsWrite 是同步的，关标签页前必然完成；IDB 异步写可能来不及
 * - IDB 是图片数据的补充来源
 * - 最终条目 = LS 元数据 + IDB 中同 ID 条目的 images 字段
 */
function mergeEntries(
  lsMeta: EntryMeta[] | null,
  idbFull: DiaryEntry[] | undefined,
): DiaryEntry[] | null {
  if (!lsMeta) return null;

  const idbMap = new Map<string, DiaryEntry>(
    (idbFull ?? []).map(e => [e.id, e])
  );

  return lsMeta.map(meta => {
    const idbEntry = idbMap.get(meta.id);
    return {
      ...meta,
      // 只从 IDB 取图片，其余字段信任 LS（更新更及时）
      images: idbEntry?.images,
    };
  });
}

/**
 * 迁移：尝试读取旧 idb-keyval 存储的 localStorage 条目
 * （历史版本曾经直接把 JSON 写在 localStorage 的 wizard_books / wizard_entries 里）
 */
function tryMigrateLegacyLS(): { books: DiaryBook[] | null; entries: EntryMeta[] | null } {
  const rawBooks   = localStorage.getItem(IDB_BOOKS);
  const rawEntries = localStorage.getItem(IDB_ENTRIES);
  try {
    const books   = rawBooks   ? (JSON.parse(rawBooks)   as DiaryBook[])  : null;
    const entries = rawEntries
      ? (JSON.parse(rawEntries) as DiaryEntry[]).map(({ images: _img, ...m }) => m)
      : null;
    return { books, entries };
  } catch {
    return { books: null, entries: null };
  }
}

// ─────────────────────────────────────────────
// Zustand store definition
// ─────────────────────────────────────────────
interface DiaryState {
  books: DiaryBook[];
  entries: DiaryEntry[];
  isLoaded: boolean;
  loadData: () => Promise<void>;
  saveEntry: (entry: Omit<DiaryEntry, 'id'>) => DiaryEntry;
  addEntry: (entry: DiaryEntry) => void;
  updateEntry: (id: string, updates: Partial<DiaryEntry>) => void;
  deleteEntry: (id: string) => void;
  addBook: (book: DiaryBook) => void;
  deleteBook: (bookId: string) => void;
}

export const useDiaryStore = create<DiaryState>((setState, getState) => ({
  books: [],
  entries: [],
  isLoaded: false,

  // ───────────────────────────────────────────
  // loadData
  // ───────────────────────────────────────────
  loadData: async () => {
    // 并行读取所有来源
    const [idbBooks, idbEntries] = await Promise.all([
      idbRead<DiaryBook[]>(IDB_BOOKS),
      idbRead<DiaryEntry[]>(IDB_ENTRIES),
    ]);

    const lsBooks   = lsRead<DiaryBook[]>(LS_BOOKS);
    const lsEntries = lsRead<EntryMeta[]>(LS_ENTRIES);

    // ---------- Books ----------
    let booksToSet: DiaryBook[];

    if (lsBooks != null) {
      // localStorage 有数据 → 权威源
      booksToSet = lsBooks;
      // 如果 IDB 没有数据，写入 IDB 做完整备份
      if (idbBooks == null) {
        await idbWrite(IDB_BOOKS, booksToSet);
      }
    } else if (idbBooks != null) {
      // LS 没有但 IDB 有 → 从 IDB 恢复
      booksToSet = idbBooks;
      lsWriteBooks(booksToSet);
    } else {
      // 尝试旧版 localStorage 迁移
      const { books: legacyBooks } = tryMigrateLegacyLS();
      booksToSet = legacyBooks ?? DEFAULT_BOOKS;
      lsWriteBooks(booksToSet);
      await idbWrite(IDB_BOOKS, booksToSet);
    }

    // ---------- Entries ----------
    let entriesToSet: DiaryEntry[];

    if (lsEntries != null) {
      // localStorage 有元数据 → 合并 IDB 图片
      const merged = mergeEntries(lsEntries, idbEntries);
      entriesToSet = merged!;
      // 如果 IDB 比 LS 数量少（IDB 写没完成），用最新数据回写 IDB
      if (!idbEntries || idbEntries.length < lsEntries.length) {
        await idbWrite(IDB_ENTRIES, entriesToSet);
      }
    } else if (idbEntries != null) {
      // LS 没有但 IDB 有 → 从 IDB 恢复并同步 LS
      entriesToSet = idbEntries;
      lsWriteEntryMeta(entriesToSet);
    } else {
      // 尝试旧版 localStorage 迁移
      const { entries: legacyEntries } = tryMigrateLegacyLS();
      if (legacyEntries) {
        entriesToSet = legacyEntries as DiaryEntry[];
      } else {
        entriesToSet = DEFAULT_ENTRIES;
      }
      lsWriteEntryMeta(entriesToSet);
      await idbWrite(IDB_ENTRIES, entriesToSet);
    }

    setState({ books: booksToSet, entries: entriesToSet, isLoaded: true });
  },

  // ───────────────────────────────────────────
  // 写操作：先同步写 localStorage（文本元数据），再异步写 IDB（完整数据含图片）
  // 这样即使 IDB 写没完成就关标签页，文本数据也不会丢失
  // ───────────────────────────────────────────
  saveEntry: (entry) => {
    const newEntry: DiaryEntry = { ...entry, id: uuidv4() };
    const updated = [newEntry, ...getState().entries];
    setState({ entries: updated });
    lsWriteEntryMeta(updated);   // 同步：立即持久化文本
    idbWrite(IDB_ENTRIES, updated); // 异步：持久化图片
    return newEntry;
  },

  addEntry: (entry) => {
    const updated = [entry, ...getState().entries];
    setState({ entries: updated });
    lsWriteEntryMeta(updated);
    idbWrite(IDB_ENTRIES, updated);
  },

  updateEntry: (id, updates) => {
    const updated = getState().entries.map(e => e.id === id ? { ...e, ...updates } : e);
    setState({ entries: updated });
    lsWriteEntryMeta(updated);
    idbWrite(IDB_ENTRIES, updated);
  },

  deleteEntry: (id) => {
    const updated = getState().entries.filter(e => e.id !== id);
    setState({ entries: updated });
    lsWriteEntryMeta(updated);
    idbWrite(IDB_ENTRIES, updated);
  },

  addBook: (book) => {
    const updated = [...getState().books, book];
    setState({ books: updated });
    lsWriteBooks(updated);
    idbWrite(IDB_BOOKS, updated);
  },

  deleteBook: (bookId) => {
    const updatedBooks   = getState().books.filter(b => b.id !== bookId);
    const updatedEntries = getState().entries.filter(e => e.bookId !== bookId);
    setState({ books: updatedBooks, entries: updatedEntries });
    lsWriteBooks(updatedBooks);
    lsWriteEntryMeta(updatedEntries);
    idbWrite(IDB_BOOKS, updatedBooks);
    idbWrite(IDB_ENTRIES, updatedEntries);
  },
}));

// 应用启动时立即从持久层加载数据（仅浏览器环境）
if (typeof window !== 'undefined') {
  useDiaryStore.getState().loadData();
}
