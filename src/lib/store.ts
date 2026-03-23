import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  date: string; // ISO String
  tags: string[];
  mood?: 'happy' | 'neutral' | 'sad' | 'magical';
  preview?: string;
}

const STORAGE_KEY = 'wizard_diary_entries';

export function useDiaryStore() {
  const [entries, setEntries] = useState<DiaryEntry[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      const initialData: DiaryEntry[] = [
        {
          id: uuidv4(),
          title: 'First Day at the Academy',
          content: "Today was absolutely magical! I was sorted into the Tower House, just as I hoped. The welcome feast was incredible - I've never seen so much food in my life. I think I'm going to like it here.",
          date: new Date(Date.now() - 86400000 * 2).toISOString(),
          tags: ['Academy', 'Tower House', 'First Day'],
          mood: 'magical',
          preview: "Today was absolutely magical! I was sorted into the Tower House..."
        },
        {
          id: uuidv4(),
          title: 'Alchemy Class Mishap',
          content: "The alchemy master is quite strict. I accidentally added the porcupine quills before taking the cauldron off the fire. A classmate's cauldron melted into a twisted blob. At least another student helped me clean up.",
          date: new Date(Date.now() - 86400000).toISOString(),
          tags: ['Alchemy', 'Mishap', 'Disaster'],
          mood: 'sad',
          preview: "The alchemy master is quite strict. I accidentally added the porcupine quills..."
        }
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
      return initialData;
    } catch (error) {
      console.error("Failed to load diary entries", error);
      return [];
    }
  });

  // Save to local storage whenever entries change
  useEffect(() => {
    if (entries.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }
  }, [entries]);

  const addEntry = useCallback((entry: Omit<DiaryEntry, 'id' | 'preview'>) => {
    const newEntry: DiaryEntry = {
      ...entry,
      id: uuidv4(),
      preview: entry.content.slice(0, 100) + (entry.content.length > 100 ? '...' : '')
    };
    setEntries(prev => [newEntry, ...prev]);
  }, []);

  const updateEntry = useCallback((id: string, updates: Partial<DiaryEntry>) => {
    setEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, ...updates, preview: updates.content ? updates.content.slice(0, 100) + '...' : entry.preview } : entry
    ));
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
  }, []);

  const getEntry = useCallback((id: string) => {
    return entries.find(e => e.id === id);
  }, [entries]);

  return {
    entries,
    addEntry,
    updateEntry,
    deleteEntry,
    getEntry
  };
}
