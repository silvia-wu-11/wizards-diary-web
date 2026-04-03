import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('createEntry coreMemory 集成', () => {
  const originalApiKey = process.env.HUOSHAN_MODEL_API_KEY;

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.HUOSHAN_MODEL_API_KEY = 'test-key';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalApiKey === undefined) {
      delete process.env.HUOSHAN_MODEL_API_KEY;
      return;
    }
    process.env.HUOSHAN_MODEL_API_KEY = originalApiKey;
  });

  it('保存日记后会写入非空 coreMemory', async () => {
    const userId = 'user-123';
    const bookId = 'book-456';
    const entryId = 'entry-789';
    let persistedCoreMemory: Record<string, unknown> | null = null;
    let afterTask: Promise<void> | undefined;

    const authMock = vi.fn().mockResolvedValue({
      user: { id: userId, username: 'testuser', name: 'Test User' },
      expires: '9999-12-31T23:59:59.999Z',
    });
    const diaryBookFindFirstMock = vi.fn().mockResolvedValue({
      id: bookId,
      userId,
      name: 'Magic Book',
      color: null,
      type: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const diaryEntryCreateMock = vi.fn().mockResolvedValue({
      id: entryId,
      bookId,
      title: null,
      content: '今天我开始认真写魔法日记，希望长期记录生活。',
      date: new Date('2026-04-04T10:00:00.000Z'),
      tags: [],
      imageUrls: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const userFindUniqueMock = vi.fn().mockImplementation(async () => ({
      coreMemory: persistedCoreMemory,
    }));
    const userUpdateMock = vi.fn().mockImplementation(async ({ data }) => {
      persistedCoreMemory = data.coreMemory as Record<string, unknown>;
      return {
        id: userId,
        accountId: 'testuser',
        passwordHash: 'hashed',
        nickname: 'Test User',
        coreMemory: persistedCoreMemory,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                life_facts: ['开始持续写日记'],
                memory_anchors: ['第一篇魔法日记'],
              }),
            },
          },
        ],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    vi.doMock('@/auth', () => ({
      auth: authMock,
    }));
    vi.doMock('next/server', () => ({
      after: vi.fn((cb: () => Promise<void> | void) => {
        afterTask = Promise.resolve(cb());
      }),
    }));
    vi.doMock('@/lib/db', () => ({
      prisma: {
        diaryBook: {
          findFirst: diaryBookFindFirstMock,
        },
        diaryEntry: {
          create: diaryEntryCreateMock,
        },
        user: {
          findUnique: userFindUniqueMock,
          update: userUpdateMock,
        },
      },
    }));
    vi.doMock('@/lib/supabase/storage', () => ({
      uploadImages: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock('@/lib/embedding/create', () => ({
      vectorizeDiaryEntry: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('@/lib/embedding/search', () => ({
      searchRelatedDiaries: vi.fn().mockResolvedValue([]),
    }));

    const { createEntry } = await import('./diary');

    const result = await createEntry({
      bookId,
      content: '今天我开始认真写魔法日记，希望长期记录生活。',
    });

    await afterTask;

    expect(result.id).toBe(entryId);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: userId },
      data: { coreMemory: expect.any(Object) },
    });
    expect(persistedCoreMemory).not.toBeNull();
    expect(persistedCoreMemory).toEqual(
      expect.objectContaining({
        version: '1.0',
        life_facts: expect.arrayContaining(['开始持续写日记']),
        memory_anchors: expect.arrayContaining(['第一篇魔法日记']),
      }),
    );
  });
});
