import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { DiaryEntry, Book } from "../../lib/storage";
import { DiaryCard } from "./DiaryCard";

interface DiaryFeedProps {
  entries: DiaryEntry[];
  books: Book[];
}

export function DiaryFeed({ entries, books }: DiaryFeedProps) {
  const getBook = (id: string) => books.find(b => b.id === id);

  return (
    <div className="py-8 px-4 max-w-7xl mx-auto">
      <ResponsiveMasonry
        columnsCountBreakPoints={{ 350: 1, 750: 2, 900: 3 }}
      >
        <Masonry gutter="2rem">
          {entries.map(entry => (
            <DiaryCard key={entry.id} entry={entry} book={getBook(entry.bookId)} />
          ))}
        </Masonry>
      </ResponsiveMasonry>
    </div>
  );
}
