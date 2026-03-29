import { auth } from "@/auth";
import { searchRelatedChunks } from "@/lib/embedding/search";
import { formatCoreMemoryForPrompt } from "@/lib/memory/format";
import { getCoreMemory } from "@/lib/memory/store";

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
    const { input, previous_response_id } = body as {
      input: string;
      previous_response_id?: string;
    };

    if (!input || typeof input !== "string") {
      return Response.json({ error: "input 不能为空" }, { status: 400 });
    }

    const isFirstRequest = !previous_response_id;

    let requestInput: unknown = input;

    if (isFirstRequest) {
      let systemPrompt = "你是一位温暖的魔法日记伴侣「CHUM」，正在与用户聊天。";
      const coreMemory = await getCoreMemory(session.user.id);
      const memoryPrompt = formatCoreMemoryForPrompt(coreMemory);
      if (memoryPrompt) {
        systemPrompt = `你是一位温暖的魔法日记伴侣「CHUM」，正在与用户聊天。\n\n ${memoryPrompt}`;
      }
      requestInput = [
        {
          role: "system",
          content: systemPrompt,
        },
      ];
    } else {
      const relatedChunks = await searchRelatedChunks(
        session.user.id,
        input,
        2,
      );
      const diaryContextText = formatDiaryContextForPrompt(relatedChunks);
      if (diaryContextText) {
        requestInput = `【相关日记片段】\n${diaryContextText}\n\n用户输入：\n${input}`;
      } else {
        requestInput = input;
      }
    }

    const requestBody: Record<string, unknown> = {
      model: MODEL_IDS["Doubao-Seed-1.6-lite"],
      input: requestInput,
      stream: true,
      max_output_tokens: 500,
      thinking: {
        type: "disabled",
      },
      caching: {
        type: "enabled",
      },
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
    const stream = new ReadableStream({
      async start(controller) {
        const encode = (chunk: string) => new TextEncoder().encode(chunk);
        while (true) {
          const { done, value } = await reader2.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6);
              if (dataStr && dataStr !== "[DONE]") {
                try {
                  const parsed = JSON.parse(dataStr);
                  if (!responseId && parsed.id) {
                    responseId = parsed.id;
                    controller.enqueue(
                      encode(
                        `data: ${JSON.stringify({ type: "response_id", id: responseId })}\n\n`,
                      ),
                    );
                  }
                  controller.enqueue(encode(line + "\n"));
                } catch {
                  controller.enqueue(encode(line + "\n"));
                }
              } else if (dataStr === "[DONE]") {
                controller.enqueue(encode(line + "\n"));
              }
            } else if (line) {
              controller.enqueue(encode(line + "\n"));
            }
          }
        }
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

function formatDiaryContextForPrompt(
  chunks: Array<{
    entryId: string;
    chunkIndex: number;
    content: string;
    date: Date;
    title: string | null;
  }>,
): string {
  if (chunks.length === 0) return "";

  const lines: string[] = [];
  chunks.forEach((c, i) => {
    const title = c.title ? `「${c.title}」` : `片段${i + 1}`;
    const dateStr =
      c.date instanceof Date
        ? c.date.toISOString().split("T")[0]
        : new Date(c.date).toISOString().split("T")[0];
    lines.push(`- ${dateStr} ${title}:\n${c.content}`);
  });
  return lines.join("\n\n");
}
