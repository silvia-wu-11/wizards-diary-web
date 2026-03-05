import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface DiaryEntry {
  id: string;
  bookId: string;
  date: string; // ISO string
  title: string;
  content: string;
  tags: string[];
  imageUrl?: string;
  createdAt: number;
}

export interface DiaryBook {
  id: string;
  name: string;
  coverColor: string; 
}

const DEFAULT_BOOKS: DiaryBook[] = [
  { id: 'book-1', name: 'Year 1: The Beginning', coverColor: '#8B5A5A' },
  { id: 'book-2', name: 'Potions Notes', coverColor: '#2F4F4F' },
  { id: 'book-3', name: 'Spells & Charms', coverColor: '#483D8B' },
];

const MOCK_ENTRIES: DiaryEntry[] = [
  {
    id: 'entry-1',
    bookId: 'book-1',
    date: new Date().toISOString(),
    title: 'Arrival at the Castle',
    content: "The boat ride across the black lake was mesmerizing. The giant squid waved a tentacle at us! I've been sorted into... wait for it...",
    tags: ['Hogwarts', 'First Day'],
    createdAt: Date.now(),
  },
  {
    id: 'entry-2',
    bookId: 'book-1',
    date: new Date(Date.now() - 86400000).toISOString(),
    title: 'Transfiguration Trouble',
    content: "Today we tried to turn a matchstick into a needle. Mine just got pointy and silver at one end. Professor McGonagall gave me a stern look.",
    tags: ['Class', 'Magic'],
    createdAt: Date.now() - 86400000,
  }
];

export function useDiaryStore() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [books, setBooks] = useState<DiaryBook[]>(DEFAULT_BOOKS);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

  useEffect(() => {
    const storedEntries = localStorage.getItem('wizard-diary-entries');
    if (storedEntries) {
      setEntries(JSON.parse(storedEntries));
    } else {
      setEntries(MOCK_ENTRIES);
      localStorage.setItem('wizard-diary-entries', JSON.stringify(MOCK_ENTRIES));
    }
  }, []);

  const addEntry = (entry: Omit<DiaryEntry, 'id' | 'createdAt'>) => {
    const newEntry: DiaryEntry = {
      ...entry,
      id: uuidv4(),
      createdAt: Date.now(),
    };
    const updatedEntries = [newEntry, ...entries];
    setEntries(updatedEntries);
    localStorage.setItem('wizard-diary-entries', JSON.stringify(updatedEntries));
  };

  const updateEntry = (updatedEntry: DiaryEntry) => {
    const updatedEntries = entries.map(e => e.id === updatedEntry.id ? updatedEntry : e);
    setEntries(updatedEntries);
    localStorage.setItem('wizard-diary-entries', JSON.stringify(updatedEntries));
  };

  const deleteEntry = (id: string) => {
    const updatedEntries = entries.filter(e => e.id !== id);
    setEntries(updatedEntries);
    localStorage.setItem('wizard-diary-entries', JSON.stringify(updatedEntries));
  };

  const getEntryById = (id: string) => entries.find(e => e.id === id);

  return {
    entries,
    books,
    selectedBookId,
    setSelectedBookId,
    addEntry,
    updateEntry,
    deleteEntry,
    getEntryById
  };
}
