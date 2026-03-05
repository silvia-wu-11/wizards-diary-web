import { createBrowserRouter, Outlet, useParams, Navigate, useNavigate } from "react-router";
import { useEffect } from "react";
import { Dashboard } from "./pages/Dashboard";
import { DiaryView } from "./pages/DiaryView";
import { useDiaryStore } from "./store";
import { toast } from "sonner";

function Root() {
  return <Outlet />;
}

function BookRedirect() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { entries, books } = useDiaryStore();
  
  useEffect(() => {
    const book = books.find(b => b.id === bookId);
    if (!book) {
      toast.error("This book seems to have vanished.");
      navigate("/", { replace: true });
      return;
    }

    const bookEntries = entries
      .filter(e => e.bookId === bookId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (bookEntries.length > 0) {
      // Navigate to the latest entry
      navigate(`/diary/${bookEntries[0].id}`, { replace: true });
    } else {
      // Navigate to an "empty" view of the book by passing a special 'new' id
      navigate(`/diary/new?bookId=${bookId}`, { replace: true });
    }
  }, [bookId, entries, books, navigate]);

  return <div className="min-h-screen bg-[#2c2420] flex items-center justify-center font-display text-faded-gold text-xl">Opening book...</div>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Dashboard },
      { path: "diary/:id", Component: DiaryView },
      { path: "book/:bookId", Component: BookRedirect },
    ],
  },
]);
