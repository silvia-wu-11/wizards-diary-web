import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getDiaryData,
  createEntry,
  createBook,
  updateEntry,
  deleteEntry,
  deleteBook,
} from './diary';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    diaryBook: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    diaryEntry: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/lib/supabase/storage', () => ({
  uploadImages: vi.fn().mockResolvedValue([]),
}));

import { auth } from '@/auth';
import { prisma } from '@/lib/db';

const mockUserId = 'user-123';
const mockBookId = 'book-456';
const mockEntryId = 'entry-789';

describe('diary Server Actions', () => {
  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId, email: 'test@example.com', name: 'Test' },
      expires: '',
    });
  });

  describe('getDiaryData', () => {
    it('未登录时抛出 Unauthorized', async () => {
      vi.mocked(auth).mockResolvedValue(null);
      await expect(getDiaryData()).rejects.toThrow('Unauthorized');
    });

    it('已登录时返回当前用户的 books 与 entries', async () => {
      const mockBooks = [{ id: mockBookId, name: 'Test Book', color: null, type: null }];
      const mockEntries = [
        {
          id: mockEntryId,
          bookId: mockBookId,
          title: 'Test',
          content: 'Content',
          date: new Date(),
          tags: [],
          imageUrls: [],
        },
      ];
      vi.mocked(prisma.diaryBook.findMany).mockResolvedValue(mockBooks as never);
      vi.mocked(prisma.diaryEntry.findMany).mockResolvedValue(mockEntries as never);

      const result = await getDiaryData();
      expect(result.books).toHaveLength(1);
      expect(result.books[0].name).toBe('Test Book');
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].title).toBe('Test');
      expect(prisma.diaryBook.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('createEntry', () => {
    it('content 为空时抛出错误', async () => {
      await expect(
        createEntry({ content: '' })
      ).rejects.toThrow('内容不能为空');
    });

    it('无日记本时抛出错误', async () => {
      vi.mocked(prisma.diaryBook.findFirst).mockResolvedValue(null);
      await expect(
        createEntry({ content: 'Hello' })
      ).rejects.toThrow('请先创建日记本');
    });

    it('创建成功并返回新日记', async () => {
      vi.mocked(prisma.diaryBook.findFirst).mockResolvedValue({
        id: mockBookId,
        userId: mockUserId,
        name: 'Book',
        color: null,
        type: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);
      vi.mocked(prisma.diaryBook.findFirst).mockResolvedValueOnce({
        id: mockBookId,
        userId: mockUserId,
        name: 'Book',
        color: null,
        type: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);
      const created = {
        id: mockEntryId,
        bookId: mockBookId,
        title: null,
        content: 'Hello',
        date: new Date(),
        tags: [],
        imageUrls: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(prisma.diaryEntry.create).mockResolvedValue(created as never);

      const result = await createEntry({ content: 'Hello' });
      expect(result.content).toBe('Hello');
      expect(result.id).toBe(mockEntryId);
      expect(prisma.diaryEntry.create).toHaveBeenCalled();
    });
  });

  describe('createBook', () => {
    it('name 为空时抛出错误', async () => {
      await expect(
        createBook({ name: '' })
      ).rejects.toThrow('名称不能为空');
    });

    it('同名日记本已存在时抛出错误', async () => {
      vi.mocked(prisma.diaryBook.findFirst).mockResolvedValue({
        id: mockBookId,
        userId: mockUserId,
        name: 'New Book',
        color: null,
        type: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);
      await expect(
        createBook({ name: 'New Book' })
      ).rejects.toThrow('已存在同名日记本，请使用其他名称');
    });

    it('创建成功并返回新日记本', async () => {
      vi.mocked(prisma.diaryBook.findFirst).mockResolvedValue(null);
      const created = {
        id: mockBookId,
        userId: mockUserId,
        name: 'New Book',
        color: '#5c2a2a',
        type: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(prisma.diaryBook.create).mockResolvedValue(created as never);

      const result = await createBook({ name: 'New Book', color: '#5c2a2a' });
      expect(result.name).toBe('New Book');
      expect(result.id).toBe(mockBookId);
    });
  });

  describe('updateEntry', () => {
    it('日记不存在或无权访问时抛出错误', async () => {
      vi.mocked(prisma.diaryEntry.findFirst).mockResolvedValue(null);
      await expect(
        updateEntry(mockEntryId, { content: 'Updated' })
      ).rejects.toThrow('日记不存在或无权访问');
    });
  });

  describe('deleteEntry', () => {
    it('日记不存在或无权访问时抛出错误', async () => {
      vi.mocked(prisma.diaryEntry.findFirst).mockResolvedValue(null);
      await expect(deleteEntry(mockEntryId)).rejects.toThrow('日记不存在或无权访问');
    });
  });

  describe('deleteBook', () => {
    it('日记本不存在或无权访问时抛出错误', async () => {
      vi.mocked(prisma.diaryBook.findFirst).mockResolvedValue(null);
      await expect(deleteBook(mockBookId)).rejects.toThrow('日记本不存在或无权访问');
    });
  });
});
