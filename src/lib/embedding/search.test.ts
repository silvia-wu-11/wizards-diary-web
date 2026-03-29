import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockQueryRaw = vi.fn().mockResolvedValue([]);
  const mockFindMany = vi.fn().mockResolvedValue([]);
  const mockCreateEmbedding = vi.fn().mockResolvedValue({
    embedding: new Array(1024).fill(0.1),
    tokenUsage: 10,
  });
  return { mockQueryRaw, mockFindMany, mockCreateEmbedding };
});

vi.mock('@/lib/db', () => ({
  prisma: {
    $queryRaw: mocks.mockQueryRaw,
    diaryEntry: { findMany: mocks.mockFindMany },
  },
}));

vi.mock('@/lib/embedding/create', () => ({
  createEmbedding: mocks.mockCreateEmbedding,
}));

import { searchRelatedDiaries } from '@/lib/embedding/search';

describe('searchRelatedDiaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockCreateEmbedding.mockResolvedValue({
      embedding: new Array(1024).fill(0.1),
      tokenUsage: 10,
    });
    mocks.mockQueryRaw.mockResolvedValue([]);
    mocks.mockFindMany.mockResolvedValue([]);
  });

  it('调用 createEmbedding 将用户消息转为向量', async () => {
    await searchRelatedDiaries('user-123', '我最近压力很大', 5);
    expect(mocks.mockCreateEmbedding).toHaveBeenCalledWith('我最近压力很大');
  });

  it('SQL 查询包含用户隔离条件（JOIN DiaryBook + userId 过滤）', async () => {
    await searchRelatedDiaries('user-abc', '测试消息', 5);
    expect(mocks.mockQueryRaw).toHaveBeenCalled();
    const [taggedArgs] = mocks.mockQueryRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]];
    const fullSql = taggedArgs.join('???');
    expect(fullSql).toContain('DiaryEntry');
    expect(fullSql).toContain('DiaryBook');
    expect(fullSql).toContain('userId');
  });

  it('SQL 包含余弦相似度操作符 <=> 且带有 DISTINCT ON 去重', async () => {
    await searchRelatedDiaries('user-123', '测试', 5);
    const tpl = (mocks.mockQueryRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]])[0];
    const fullSql = tpl.join('???');
    expect(fullSql).toContain('<=>');
    expect(fullSql).toContain('DISTINCT ON');
  });

  it('SQL 包含 LIMIT 子句', async () => {
    await searchRelatedDiaries('user-123', '测试', 3);
    const tpl = (mocks.mockQueryRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]])[0];
    const fullSql = tpl.join('???');
    expect(fullSql).toContain('LIMIT');
  });

  it('向量检索失败时降级为关键词搜索', async () => {
    mocks.mockQueryRaw.mockRejectedValueOnce(new Error('pgvector unavailable'));
    const result = await searchRelatedDiaries('user-123', '测试', 5);
    expect(result).toEqual([]);
    expect(mocks.mockFindMany).toHaveBeenCalled();
  });

  it('成功时返回包含 id/title/content/date/tags 的日记列表', async () => {
    const mockRows = [
      {
        id: 'entry-1',
        title: '旅行日记',
        content: '今天去了巴黎',
        date: new Date('2026-01-01'),
        tags: ['旅行'],
        distance: 0.1,
      },
    ];
    mocks.mockQueryRaw.mockResolvedValue(mockRows);
    const result = await searchRelatedDiaries('user-123', '旅行', 5);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('entry-1');
    expect(result[0].title).toBe('旅行日记');
  });
});
