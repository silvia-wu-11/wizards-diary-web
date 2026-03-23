import { v4 as uuidv4 } from 'uuid';

export interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  date: string; // ISO string
  tags: string[];
  imageUrl?: string;
  bookId: string;
}

export interface Book {
  id: string;
  title: string;
  coverStyle: 'leather-red' | 'leather-brown' | 'leather-blue';
}

const STORAGE_KEY_DIARIES = 'wizard_diaries_entries';
const STORAGE_KEY_BOOKS = 'wizard_diaries_books';

// Initial Mock Data
const INITIAL_BOOKS: Book[] = [
  { id: 'book-1', title: 'Alchemy Notes', coverStyle: 'leather-brown' },
  { id: 'book-2', title: 'Daily Spells', coverStyle: 'leather-red' },
];

const INITIAL_ENTRIES: DiaryEntry[] = [
  {
    id: 'entry-1',
    title: 'First Day at the Academy',
    content: 'Today I learned how to cast a simple levitation charm. It was harder than I thought, but a classmate helped me get the wrist movement right.',
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    tags: ['Academy', 'Spells'],
    bookId: 'book-1',
  },
  {
    id: 'entry-2',
    title: 'Visit to the Market Square',
    content: 'Had the best warm spiced cider at the old tavern. The snow made everything look magical.',
    date: new Date(Date.now() - 86400000).toISOString(),
    tags: ['Town', 'Tavern'],
    bookId: 'book-2',
  },
];

export const getBooks = (): Book[] => {
  const stored = localStorage.getItem(STORAGE_KEY_BOOKS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY_BOOKS, JSON.stringify(INITIAL_BOOKS));
    return INITIAL_BOOKS;
  }
  return JSON.parse(stored);
};

export const getEntries = (): DiaryEntry[] => {
  const stored = localStorage.getItem(STORAGE_KEY_DIARIES);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY_DIARIES, JSON.stringify(INITIAL_ENTRIES));
    return INITIAL_ENTRIES;
  }
  return JSON.parse(stored).map((e: DiaryEntry) => ({
    ...e,
    // Ensure dates are strings or Date objects as needed, keeping as ISO strings for storage
  }));
};

export const saveEntry = (entry: Omit<DiaryEntry, 'id'>) => {
  const entries = getEntries();
  const newEntry = { ...entry, id: uuidv4() };
  const updated = [newEntry, ...entries];
  localStorage.setItem(STORAGE_KEY_DIARIES, JSON.stringify(updated));
  return newEntry;
};

export const updateEntry = (updatedEntry: DiaryEntry) => {
  const entries = getEntries();
  const updated = entries.map((e) => (e.id === updatedEntry.id ? updatedEntry : e));
  localStorage.setItem(STORAGE_KEY_DIARIES, JSON.stringify(updated));
};

export const deleteEntry = (id: string) => {
  const entries = getEntries();
  const updated = entries.filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY_DIARIES, JSON.stringify(updated));
};
