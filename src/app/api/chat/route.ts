import { formatContextForPrompt } from "@/app/lib/ai-chat/formatContext";
import type { OldFriendContext } from "@/app/types/ai-chat";
import { auth } from "@/auth";

// 火山方舟 API 地址，chat api 接口地址
const ARK_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

// 火山方舟 response api
const RESPONSE_URL =
  "https://operator.las.cn-shanghai.volces.com/api/v1/responses";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.HUOSHAN_MODEL_API_KEY;
  const modelId = process.env.HUOSHAN_MODEL_ID;

  if (!apiKey || !modelId) {
    return Response.json(
      {
        error:
          "AI 服务未配置，请设置 HUOSHAN_MODEL_API_KEY 和 HUOSHAN_MODEL_ID",
      },
      { status: 503 },
    );
  }

  try {
    const body = await req.json();
    const { messages, context } = body as {
      messages: Array<{ role: string; content: string }>;
      context: OldFriendContext;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "messages 不能为空" }, { status: 400 });
    }

    const contextText = context ? formatContextForPrompt(context) : "";
    const instructions =
      contextText || "你是一位温暖的「老朋友」，正在与用户聊天。";

    const lastUserMessage = messages.at(-1)?.content ?? "";

    const inputMessages = messages.slice(0, -1);
    const inputText = [
      ...(inputMessages.length > 0
        ? inputMessages.map(
            (m) => `${m.role === "user" ? "用户" : "助手"}: ${m.content}`,
          )
        : []),
      `用户: ${lastUserMessage}`,
    ].join("\n");

    const arkRes = await fetch(RESPONSE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        input: inputText,
        instructions,
        stream: true,
        max_output_tokens: 1024,
        reasoning: {
          effort: "low",
        },
        thinking: {
          type: "auto",
        },
      }),
    });

    if (!arkRes.ok) {
      const errText = await arkRes.text();
      console.error("[api/chat] 火山方舟 API 错误:", arkRes.status, errText);
      return Response.json(
        { error: `AI 服务调用失败: ${arkRes.status}` },
        { status: 502 },
      );
    }

    const reader = arkRes.body;
    if (!reader) {
      return Response.json({ error: "流式响应不可用" }, { status: 502 });
    }

    return new Response(reader, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[api/chat]", err);
    const msg = err instanceof Error ? err.message : "AI 服务调用失败";
    return Response.json({ error: msg }, { status: 500 });
  }
}
