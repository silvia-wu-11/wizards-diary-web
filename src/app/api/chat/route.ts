import { auth } from '@/auth';
import { formatContextForPrompt } from '@/app/lib/ai-chat/formatContext';
import type { OldFriendContext } from '@/app/types/ai-chat';

const ARK_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.HUOSHAN_MODEL_API_KEY;
  const modelId = process.env.HUOSHAN_MODEL_ID;

  if (!apiKey || !modelId) {
    return Response.json(
      { error: 'AI 服务未配置，请设置 HUOSHAN_MODEL_API_KEY 和 HUOSHAN_MODEL_ID' },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { messages, context } = body as {
      messages: Array<{ role: string; content: string }>;
      context: OldFriendContext;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'messages 不能为空' }, { status: 400 });
    }

    const contextText = context ? formatContextForPrompt(context) : '';
    const systemPrompt = contextText || '你是一位温暖的「老朋友」，正在与用户聊天。';

    const allMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m) => ({
        role: (m.role === 'user' || m.role === 'assistant' ? m.role : 'user') as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const arkRes = await fetch(ARK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: allMessages,
        stream: true,
        max_tokens: 1024,
      }),
    });

    if (!arkRes.ok) {
      const errText = await arkRes.text();
      console.error('[api/chat] 火山方舟 API 错误:', arkRes.status, errText);
      return Response.json(
        { error: `AI 服务调用失败: ${arkRes.status}` },
        { status: 502 }
      );
    }

    const reader = arkRes.body;
    if (!reader) {
      return Response.json({ error: '流式响应不可用' }, { status: 502 });
    }

    return new Response(reader, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('[api/chat]', err);
    const msg = err instanceof Error ? err.message : 'AI 服务调用失败';
    return Response.json({ error: msg }, { status: 500 });
  }
}
