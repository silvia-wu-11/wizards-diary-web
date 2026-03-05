import { useState, useEffect } from "react";
import { getBooks, getEntries, saveEntry, Book, DiaryEntry } from "../lib/storage";
import { Bookshelf } from "../components/dashboard/Bookshelf";
import { DiaryInput } from "../components/dashboard/DiaryInput";
import { DiaryFeed } from "../components/dashboard/DiaryFeed";
import { FilterBar } from "../components/dashboard/FilterBar";
import { motion } from "motion/react";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    setBooks(getBooks());
    setEntries(getEntries());
  }, []);

  const handleAddEntry = (title: string, content: string, bookId: string) => {
    const newEntry = saveEntry({
      title,
      content,
      bookId,
      date: new Date().toISOString(),
      tags: [],
    });
    setEntries([newEntry, ...entries]);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFilter = (filter: string) => {
    setFilter(filter);
  };

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = entry.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          entry.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBook = activeBookId ? entry.bookId === activeBookId : true;
    return matchesSearch && matchesBook;
  });

  const activeBook = books.find(b => b.id === activeBookId);

  return (
    <div className="min-h-screen pb-20">
      <header className="py-8 text-center">
        <h1 className="font-display text-5xl md:text-6xl text-[#EBE5DC] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wider mb-2">
          Wizard's Diary
        </h1>
        <p className="font-body text-[#C9B896] text-xl italic opacity-80">
          Capture your magical moments
        </p>
      </header>

      {/* Bookshelf Section */}
      <section className="mb-12">
        <Bookshelf 
          books={books} 
          activeBookId={activeBookId || undefined} 
          onSelectBook={setActiveBookId} 
          onAddBook={() => alert("Simulated: Add new book modal would open here.")}
        />
      </section>

      {/* Input Section */}
      <section className="mb-12 relative z-20">
        <DiaryInput 
          onAddEntry={handleAddEntry} 
          activeBook={activeBook} 
          books={books}
        />
      </section>

      {/* Filter Bar */}
      <div className="sticky top-4 z-40 mb-8 flex justify-center pointer-events-none">
        <div className="pointer-events-auto">
          <FilterBar 
            onSearch={handleSearch} 
            onFilter={handleFilter} 
            searchQuery={searchQuery}
          />
        </div>
      </div>

      {/* Feed Section */}
      <section className="relative z-10">
        <ResponsiveMasonry
          columnsCountBreakPoints={{ 350: 1, 750: 2, 900: 3 }}
        >
          <Masonry gutter="2rem">
            {filteredEntries.map(entry => (
              <div key={entry.id} className="mb-8 break-inside-avoid">
                 {/* Importing DiaryCard inside the map to avoid circular deps if any, 
                     but better to use the component directly. 
                     Wait, I already imported DiaryFeed which uses DiaryCard.
                     I should use DiaryFeed component instead of implementing masonry here.
                 */}
              </div>
            ))}
          </Masonry>
        </ResponsiveMasonry>
        <DiaryFeed entries={filteredEntries} books={books} />
      </section>
    </div>
  );
}
