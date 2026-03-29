import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.stubGlobal('fetch', vi.fn());

import { prisma } from '@/lib/db';
import { updateCoreMemoryFromDiary } from './update';

const mockUser = {
  id: 'user-123',
  username: 'testuser',
  passwordHash: 'hashed',
  name: 'Test',
  coreMemory: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCoreMemory = {
  version: '1.0',
  identity: { name: '小明', nickname: '', occupation: '学生', location: '北京' },
  relationships: [],
  life_facts: [],
  preferences: { likes: [], dislikes: [], hobbies: [], dietary: [], communication_style: '' },
  goals: { short_term: [], long_term: [] },
  emotional_context: { recent_mood_trend: '', significant_events: [] },
  memory_anchors: [],
};

describe('updateCoreMemoryFromDiary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.HUOSHAN_MODEL_API_KEY = 'test-api-key';
  });

  it('User.coreMemory 为 null 时使用 INITIAL_CORE_MEMORY 作为 base', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, coreMemory: null } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({ ...mockUser, coreMemory: mockCoreMemory } as never);
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  identity: { name: '小明', nickname: '', occupation: '学生', location: '北京' },
                }),
              },
            },
          ],
        }),
    } as unknown as Response);

    await updateCoreMemoryFromDiary('user-123', '今天是我第一次来北京上学');

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          coreMemory: expect.objectContaining({
            identity: expect.objectContaining({ name: '小明' }),
          }),
        }),
      })
    );
  });

  it('调用火山方舟 API 时使用正确的 system prompt 和 user message', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, coreMemory: mockCoreMemory } as never);
    vi.mocked(prisma.user.update).mockResolvedValue(mockUser as never);
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: '{}' } }],
        }),
    } as unknown as Response);

    await updateCoreMemoryFromDiary('user-123', '今天和小红一起去了旅行');

    const calledWith = vi.mocked(fetch).mock.calls[0]?.[1] as Record<string, unknown>;
    const body = JSON.parse((calledWith.body as string));

    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1].role).toBe('user');
    expect((body.messages[1] as { content: string }).content).toContain('今天和小红一起去了旅行');
    expect((body.messages[0] as { content: string }).content).toContain('记忆管理助手');
    expect((body.messages[0] as { content: string }).content).toContain('小明');
  });

  it('API 返回非 JSON 时静默忽略，不抛出错误', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, coreMemory: mockCoreMemory } as never);
    vi.mocked(prisma.user.update).mockResolvedValue(mockUser as never);
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: '这不是JSON' } }],
        }),
    } as unknown as Response);

    await expect(
      updateCoreMemoryFromDiary('user-123', '测试日记')
    ).resolves.not.toThrow();

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          coreMemory: mockCoreMemory,
        }),
      })
    );
  });

  it('prisma.user.update 失败时静默记录错误，不向调用方抛出', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, coreMemory: mockCoreMemory } as never);
    vi.mocked(prisma.user.update).mockRejectedValue(new Error('DB error'));
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: '{"identity":{"name":"test"}}' } }],
        }),
    } as unknown as Response);

    await expect(
      updateCoreMemoryFromDiary('user-123', '测试日记')
    ).resolves.not.toThrow();
  });

  it('merge 时 identity 字段被正确覆盖', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, coreMemory: mockCoreMemory } as never);
    vi.mocked(prisma.user.update).mockResolvedValue(mockUser as never);
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  identity: { name: '小明', occupation: '老师' },
                }),
              },
            },
          ],
        }),
    } as unknown as Response);

    await updateCoreMemoryFromDiary('user-123', '我转行了，现在是一名老师');

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          coreMemory: expect.objectContaining({
            identity: expect.objectContaining({
              name: '小明',
              occupation: '老师',
              location: '北京',
            }),
          }),
        }),
      })
    );
  });
});
