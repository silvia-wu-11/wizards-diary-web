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
import type { CoreMemory } from '@/app/types/core-memory';

function createMockStreamResponse(chunks: string[]): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });

  return new Response(stream, { status: 200 });
}

function getJsonBodyFromFetchCall(call: Parameters<typeof fetch>[1] | undefined) {
  const body = call?.body;
  if (typeof body !== 'string') {
    throw new Error('Expected fetch body to be a JSON string.');
  }

  return JSON.parse(body) as {
    input: string | Array<{ role: string; content: string }>;
  };
}

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.HUOSHAN_MODEL_API_KEY = 'test-key';
    
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-123', username: 'testuser', name: 'Test' },
      expires: '9999-12-31T23:59:59.999Z',
    } as never);

    global.fetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(createMockStreamResponse(['data: [DONE]\n\n']));
  });

  it('isFirstRequest = true: 注入 Core Memory', async () => {
    const mockCoreMemory: CoreMemory = {
      version: '1.0',
      identity: {
        name: '',
        nickname: '',
        occupation: '',
        location: '',
      },
      relationships: [],
      life_facts: [],
      preferences: {
        likes: [],
        dislikes: [],
        hobbies: [],
        dietary: [],
        communication_style: '',
      },
      goals: {
        short_term: [],
        long_term: [],
      },
      emotional_context: {
        recent_mood_trend: '',
        significant_events: [],
      },
      memory_anchors: [],
    };
    vi.mocked(getCoreMemory).mockResolvedValue(mockCoreMemory);
    vi.mocked(formatCoreMemoryForPrompt).mockReturnValue('这里是你的核心记忆');

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ input: '你好' }),
    });

    await POST(req);

    expect(getCoreMemory).toHaveBeenCalledWith('user-123');
    expect(formatCoreMemoryForPrompt).toHaveBeenCalled();

    const fetchCall = vi.mocked(global.fetch).mock.calls[0];
    const fetchBody = getJsonBodyFromFetchCall(fetchCall[1]);
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
    const fetchBody = getJsonBodyFromFetchCall(fetchCall[1]);
    expect(fetchBody.input).toContain('我是日记片段');
    expect(fetchBody.input).toContain('最近怎么样');
  });
});
