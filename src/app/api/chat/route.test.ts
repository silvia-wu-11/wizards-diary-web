import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/embedding/search', () => ({
  searchRelatedChunks: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/memory/store', () => ({
  getCoreMemory: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/memory/format', () => ({
  formatCoreMemoryForPrompt: vi.fn().mockReturnValue(''),
}));

import { auth } from '@/auth';
import { searchRelatedChunks } from '@/lib/embedding/search';
import { getCoreMemory } from '@/lib/memory/store';
import { formatCoreMemoryForPrompt } from '@/lib/memory/format';

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.HUOSHAN_MODEL_API_KEY = 'test-key';
    
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-123', username: 'testuser', name: 'Test' },
      expires: '9999-12-31T23:59:59.999Z',
    } as never);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: [DONE]\n\n') })
            .mockResolvedValueOnce({ done: true }),
          releaseLock: vi.fn(),
        }),
      },
    } as any);
  });

  it('isFirstRequest = true: 注入 Core Memory', async () => {
    vi.mocked(getCoreMemory).mockResolvedValue({ identity: 'test identity', relationships: [] } as any);
    vi.mocked(formatCoreMemoryForPrompt).mockReturnValue('这里是你的核心记忆');

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ input: '你好' }),
    });

    await POST(req);

    expect(getCoreMemory).toHaveBeenCalledWith('user-123');
    expect(formatCoreMemoryForPrompt).toHaveBeenCalled();

    const fetchCall = vi.mocked(global.fetch).mock.calls[0];
    const fetchBody = JSON.parse((fetchCall[1] as any).body);
    expect(fetchBody.input[0].content).toContain('这里是你的核心记忆');
  });

  it('isFirstRequest = false: 注入 searchRelatedChunks 结果', async () => {
    const mockChunks = [
      { entryId: '1', chunkIndex: 0, content: '我是日记片段', date: new Date('2026-01-01'), title: '日记1' }
    ];
    vi.mocked(searchRelatedChunks).mockResolvedValue(mockChunks);

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ input: '最近怎么样', previous_response_id: 'resp-1' }),
    });

    await POST(req);

    expect(searchRelatedChunks).toHaveBeenCalledWith('user-123', '最近怎么样', 2);

    const fetchCall = vi.mocked(global.fetch).mock.calls[0];
    const fetchBody = JSON.parse((fetchCall[1] as any).body);
    expect(fetchBody.input).toContain('我是日记片段');
    expect(fetchBody.input).toContain('最近怎么样');
  });
});
