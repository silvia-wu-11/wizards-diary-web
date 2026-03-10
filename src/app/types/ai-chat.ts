/**
 * AI 对话（老朋友）相关类型
 */

export interface OldFriendContext {
  filters: {
    dateFrom?: string;
    dateTo?: string;
    bookId?: string;
    bookName?: string;
    tag?: string;
    keyword?: string;
  };
  entries: Array<{
    id: string;
    title: string | null;
    content: string;
    date: string;
    tags: string[];
  }>;
  source: 'dashboard' | 'diary-book';
  currentBookId?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
