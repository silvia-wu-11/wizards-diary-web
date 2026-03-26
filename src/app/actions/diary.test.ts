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
      user: { id: mockUserId, username: 'testuser', name: 'Test' },
      expires: '9999-12-31T23:59:59.999Z',
    } as never);
  });

  describe('getDiaryData', () => {
    it('未登录时返回空数据', async () => {
      // @ts-expect-error - Mocking overloaded function
      vi.mocked(auth).mockResolvedValue(null);
      const result = await getDiaryData();
      expect(result).toEqual({ books: [], entries: [] });
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
      vi.mocked(prisma.diaryEntry.findFirst).mockResolvedValue(null);
      await expect(deleteBook(mockBookId)).rejects.toThrow('日记本不存在或无权访问');
    });
  });

  describe('getEntriesPaginated', () => {
    const mockEntries = Array.from({ length: 35 }, (_, i) => ({
      id: `entry-${i}`,
      bookId: mockBookId,
      title: `Title ${i}`,
      content: `Content ${i}`,
      date: new Date(),
      tags: i % 2 === 0 ? ['magic'] : ['daily'],
      imageUrls: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    it('未登录时抛出 Unauthorized', async () => {
      // @ts-expect-error - Mocking overloaded function
      vi.mocked(auth).mockResolvedValue(null);
      const { getEntriesPaginated } = await import('./diary');
      await expect(getEntriesPaginated({})).rejects.toThrow('Unauthorized');
    });

    it('无筛选条件时返回分页数据，每页默认30条', async () => {
      vi.mocked(prisma.diaryEntry.findMany).mockResolvedValue(mockEntries.slice(0, 31) as never);
      const { getEntriesPaginated } = await import('./diary');
      const result = await getEntriesPaginated({});

      expect(result.entries).toHaveLength(30);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('entry-29');
    });

    it('hasMore=false 时 nextCursor 为 null', async () => {
      vi.mocked(prisma.diaryEntry.findMany).mockResolvedValue(mockEntries.slice(0, 10) as never);
      const { getEntriesPaginated } = await import('./diary');
      const result = await getEntriesPaginated({});

      expect(result.entries).toHaveLength(10);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('按日期范围筛选', async () => {
      vi.mocked(prisma.diaryEntry.findMany).mockResolvedValue([] as never);
      const { getEntriesPaginated } = await import('./diary');
      await getEntriesPaginated({
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      });

      expect(prisma.diaryEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: {
              gte: new Date('2026-01-01T00:00:00.000Z'),
              lte: new Date('2026-01-31T23:59:59.999Z'),
            },
          }),
        })
      );
    });

    it('按 tag 精确筛选', async () => {
      vi.mocked(prisma.diaryEntry.findMany).mockResolvedValue([] as never);
      const { getEntriesPaginated } = await import('./diary');
      await getEntriesPaginated({ tag: 'magic' });

      expect(prisma.diaryEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: { has: 'magic' },
          }),
        })
      );
    });

    it('按 keyword 模糊搜索 title 和 content', async () => {
      vi.mocked(prisma.diaryEntry.findMany).mockResolvedValue([] as never);
      const { getEntriesPaginated } = await import('./diary');
      await getEntriesPaginated({ keyword: 'wizard' });

      expect(prisma.diaryEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'wizard', mode: 'insensitive' } },
              { content: { contains: 'wizard', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    it('按 bookId 筛选', async () => {
      vi.mocked(prisma.diaryEntry.findMany).mockResolvedValue([] as never);
      const { getEntriesPaginated } = await import('./diary');
      await getEntriesPaginated({ bookId: 'book-abc' });

      expect(prisma.diaryEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            bookId: 'book-abc',
          }),
        })
      );
    });

    it('支持组合筛选：日期+tag+keyword+bookId', async () => {
      vi.mocked(prisma.diaryEntry.findMany).mockResolvedValue([] as never);
      const { getEntriesPaginated } = await import('./diary');
      await getEntriesPaginated({
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
        tag: 'magic',
        keyword: 'wizard',
        bookId: 'book-abc',
      });

      expect(prisma.diaryEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            book: { userId: mockUserId },
            date: {
              gte: new Date('2026-01-01T00:00:00.000Z'),
              lte: new Date('2026-01-31T23:59:59.999Z'),
            },
            bookId: 'book-abc',
            tags: { has: 'magic' },
            OR: [
              { title: { contains: 'wizard', mode: 'insensitive' } },
              { content: { contains: 'wizard', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    it('使用自定义 limit', async () => {
      vi.mocked(prisma.diaryEntry.findMany).mockResolvedValue([] as never);
      const { getEntriesPaginated } = await import('./diary');
      await getEntriesPaginated({ limit: 10 });

      expect(prisma.diaryEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 11,
        })
      );
    });

    it('使用 cursor 分页', async () => {
      vi.mocked(prisma.diaryEntry.findMany).mockResolvedValue([] as never);
      const { getEntriesPaginated } = await import('./diary');
      await getEntriesPaginated({ cursor: 'entry-30' });

      expect(prisma.diaryEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: 'entry-30' },
          skip: 1,
        })
      );
    });

    it('返回 DTO 格式数据（不包含内部字段）', async () => {
      vi.mocked(prisma.diaryEntry.findMany).mockResolvedValue([mockEntries[0]] as never);
      const { getEntriesPaginated } = await import('./diary');
      const result = await getEntriesPaginated({});

      expect(result.entries[0]).not.toHaveProperty('createdAt');
      expect(result.entries[0]).not.toHaveProperty('updatedAt');
    });
  });
});
