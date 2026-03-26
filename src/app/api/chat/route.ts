import { formatContextForPrompt } from "@/app/lib/ai-chat/formatContext";
import type { OldFriendContext } from "@/app/types/ai-chat";
import { auth } from "@/auth";

// 火山方舟 response api
const RESPONSE_API_URL = "https://ark.cn-beijing.volces.com/api/v3/responses";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.HUOSHAN_MODEL_API_KEY;
  const MODEL_IDS = {
    "Doubao-Seed-1.6-lite": "ep-20260325172108-n42bd",
    "glm-4-7": "glm-4-7-251222",
  };

  if (!apiKey) {
    return Response.json(
      {
        error: "AI 服务未配置，请设置 HUOSHAN_MODEL_API_KEY",
      },
      { status: 503 },
    );
  }

  try {
    const body = await req.json();
    const { input, previous_response_id, context } = body as {
      input: string;
      previous_response_id?: string;
      context?: OldFriendContext;
    };

    if (!input || typeof input !== "string") {
      return Response.json({ error: "input 不能为空" }, { status: 400 });
    }

    const isFirstRequest = !previous_response_id;
    const systemPrompt = context
      ? formatContextForPrompt(context)
      : "你是一位温暖的魔法日记伴侣「CHUM」，正在与用户聊天。";

    const requestBody: Record<string, unknown> = {
      model: MODEL_IDS["Doubao-Seed-1.6-lite"],
      input: isFirstRequest
        ? [
            {
              role: "system",
              content: systemPrompt,
            },
          ]
        : input,
      stream: true,
      max_output_tokens: 500,
      thinking: {
        type: "disabled",
      },
      caching: {
        type: "enabled",
      },
      // 设置缓存1天后过期，传入 UTC Unix 时间戳，单位为秒，转换为整数
      expire_at: Math.floor(new Date().getTime() / 1000) + 86400,
    };

    if (!isFirstRequest) {
      requestBody.previous_response_id = previous_response_id;
    }

    console.log("[api/chat] 请求:", requestBody);

    const arkRes = await fetch(RESPONSE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!arkRes.ok) {
      const errText = await arkRes.text();
      console.error("[api/chat] 火山方舟 API 错误:", arkRes.status, errText);
      let errorDetail = errText;
      try {
        const errJson = JSON.parse(errText);
        errorDetail = errJson.error?.message || errJson.message || errText;
      } catch {
        // keep raw text
      }
      return Response.json(
        {
          error: `AI 服务调用失败: ${arkRes.status}`,
          detail: errorDetail,
        },
        { status: 502 },
      );
    }

    const reader = arkRes.body;
    if (!reader) {
      return Response.json({ error: "流式响应不可用" }, { status: 502 });
    }

    const reader2 = reader.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let responseId = "";
    /**
     * 实现流式代理与拦截器：
     * 1. 解决「半截数据」问题的 Buffer 机制：网络传输中，流式数据是一块一块（chunk）到达的，
     *    通过 buffer 暂存不完整行，确保 JSON 解析正确。
     * 2. 提取并注入 response_id：多轮对话需要 previous_response_id 串联上下文，
     *    从流式响应中拦截第一个包含 id 的分片，并向前端注入自定义的 response_id 事件。
     * 3. 原样透传：完成 ID 注入后，将所有原始数据行（包括文字增量和 [DONE]）原样转发给前端。
     */
    const stream = new ReadableStream({
      async start(controller) {
        const encode = (chunk: string) => new TextEncoder().encode(chunk);
        while (true) {
          const { done, value } = await reader2.read();
          if (done) break;

          // 解码并存入缓冲区
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          // 弹出最后一行（可能不完整），存回缓冲区
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6);
              if (dataStr && dataStr !== "[DONE]") {
                try {
                  const parsed = JSON.parse(dataStr);
                  // 拦截并提取第一个响应 ID
                  if (!responseId && parsed.id) {
                    responseId = parsed.id;
                    // 向前端注入自定义事件
                    controller.enqueue(
                      encode(
                        `data: ${JSON.stringify({ type: "response_id", id: responseId })}\n\n`,
                      ),
                    );
                  }
                  // 转发原始数据行
                  controller.enqueue(encode(line + "\n"));
                } catch {
                  // 解析失败则原样透传
                  controller.enqueue(encode(line + "\n"));
                }
              } else if (dataStr === "[DONE]") {
                // 转发结束标识
                controller.enqueue(encode(line + "\n"));
              }
            } else if (line) {
              // 转发心跳或注释行
              controller.enqueue(encode(line + "\n"));
            }
          }
        }
        // 处理缓冲区剩余内容
        if (buffer) {
          controller.enqueue(encode(buffer + "\n"));
        }
        controller.close();
        reader2.releaseLock();
      },
    });

    const headers: Record<string, string> = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    };
    if (responseId) {
      headers["X-Response-Id"] = responseId;
    }
    return new Response(stream, { headers });
  } catch (err) {
    console.error("[api/chat]", err);
    const msg = err instanceof Error ? err.message : "AI 服务调用失败";
    return Response.json({ error: msg }, { status: 500 });
  }
}
