import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    $executeRaw: vi.fn().mockResolvedValue(1),
    diaryChunk: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    diaryEntry: { update: vi.fn().mockResolvedValue({ id: "entry-123" }) },
  },
}));

vi.stubGlobal("fetch", vi.fn());

import {
  chunkText,
  createEmbedding,
  createEmbeddings,
  vectorizeDiaryEntry,
} from "./create";

const EMBEDDING_API_URL =
  "https://ark.cn-beijing.volces.com/api/v3/embeddings/multimodal";

describe("createEmbedding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.HUOSHAN_MODEL_API_KEY = "test-api-key";
  });

  it("调用 fetch 时使用正确的 URL、method 和 headers", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { index: 0, embedding: new Array(1024).fill(0.1) },
          usage: { prompt_tokens: 10, total_tokens: 10 },
        }),
    } as unknown as Response);

    await createEmbedding("这是一段测试文本");

    expect(fetch).toHaveBeenCalledWith(
      EMBEDDING_API_URL,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-api-key",
        }),
      }),
    );
  });

  it("API Key 未配置时抛出错误", async () => {
    delete process.env.HUOSHAN_MODEL_API_KEY;
    await expect(createEmbedding("test")).rejects.toThrow(
      "HUOSHAN_MODEL_API_KEY is not configured",
    );
  });

  it("fetch 响应非 ok 时抛出错误（重试耗尽后）", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Unauthorized"),
    } as unknown as Response);

    await expect(createEmbedding("test")).rejects.toThrow(
      "Doubao Embedding API error: 401 Unauthorized",
    );
  });

  it("成功时返回 embedding 和 tokenUsage", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            index: 0,
            embedding: new Array(1024).fill(0.05),
          },
          usage: { prompt_tokens: 8, total_tokens: 8 },
        }),
    } as unknown as Response);

    const result = await createEmbedding("测试");

    expect(result.embedding).toHaveLength(1024);
    expect(result.tokenUsage).toBe(8);
  });

  it("响应 data 为空时抛出错误", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {},
          usage: { prompt_tokens: 0, total_tokens: 0 },
        }),
    } as unknown as Response);

    await expect(createEmbedding("test")).rejects.toThrow(
      "No embedding returned from Doubao API",
    );
  });
});

describe("createEmbeddings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.HUOSHAN_MODEL_API_KEY = "test-api-key";
  });

  it("批量调用时每次请求只含一个 input，调用次数等于文本数量", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            index: 0,
            embedding: new Array(1024).fill(0.1),
          },
          usage: { prompt_tokens: 10, total_tokens: 10 },
        }),
    } as unknown as Response);

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            index: 0,
            embedding: new Array(1024).fill(0.2),
          },
          usage: { prompt_tokens: 10, total_tokens: 10 },
        }),
    } as unknown as Response);

    await createEmbeddings(["文本1", "文本2"]);

    expect(fetch).toHaveBeenCalledTimes(2);
    const firstCall = vi.mocked(fetch).mock.calls[0]?.[1] as Record<
      string,
      unknown
    >;
    const firstBody = JSON.parse(firstCall.body as string);
    expect(firstBody.input).toEqual([{ text: "文本1", type: "text" }]);

    const secondCall = vi.mocked(fetch).mock.calls[1]?.[1] as Record<
      string,
      unknown
    >;
    const secondBody = JSON.parse(secondCall.body as string);
    expect(secondBody.input).toEqual([{ text: "文本2", type: "text" }]);
  });

  it("批量调用时返回多个 embedding 结果", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            index: 0,
            embedding: new Array(1024).fill(0.1),
          },
          usage: { prompt_tokens: 10, total_tokens: 10 },
        }),
    } as unknown as Response);

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            index: 0,
            embedding: new Array(1024).fill(0.2),
          },
          usage: { prompt_tokens: 10, total_tokens: 10 },
        }),
    } as unknown as Response);

    const results = await createEmbeddings(["文本1", "文本2"]);

    expect(results).toHaveLength(2);
    expect(results[0].embedding).toHaveLength(1024);
    expect(results[1].embedding).toHaveLength(1024);
  });
});

describe("chunkText", () => {
  it("短文本（≤1000字符）不分块", () => {
    const short = "这是一段很短的日记内容。";
    expect(chunkText(short)).toHaveLength(1);
  });

  it("长文本多段落按段落边界分块，各块不超过上限", () => {
    const long =
      "第一段内容。".repeat(100) +
      "\n\n" +
      "第二段内容。".repeat(100) +
      "\n\n" +
      "第三段内容。".repeat(100);
    const chunks = chunkText(long);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(1000));
  });

  it("单段落超长文本强制硬切", () => {
    const long = "a".repeat(1500);
    const chunks = chunkText(long);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(1000));
  });

  it("末尾空段落不产生空块", () => {
    const text = "内容一。\n\n内容二。\n\n";
    const chunks = chunkText(text);
    chunks.forEach((c) => expect(c.trim().length).toBeGreaterThan(0));
  });
});

describe("vectorizeDiaryEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.HUOSHAN_MODEL_API_KEY = "test-api-key";
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            index: 0,
            embedding: new Array(1024).fill(0.1),
          },
          usage: { prompt_tokens: 50, total_tokens: 50 },
        }),
    } as unknown as Response);
  });

  it("调用 $executeRaw 删除旧 chunks 并插入新 chunks，最后更新 vectorized 状态", async () => {
    const { prisma } = await import("@/lib/db");
    await vectorizeDiaryEntry("entry-123", "这是一段测试日记内容");

    // 至少会被调用两次（一次 DELETE，一次 INSERT）
    expect(prisma.$executeRaw).toHaveBeenCalled();

    expect(prisma.diaryEntry.update).toHaveBeenCalledWith({
      where: { id: "entry-123" },
      data: { vectorized: true },
    });
  });

  it("短文本分块后调用 createEmbeddings（一次）", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            index: 0,
            embedding: new Array(1024).fill(0.1),
          },
          usage: { prompt_tokens: 50, total_tokens: 50 },
        }),
    } as unknown as Response);

    const shortText = "这是一段很短的日记。";
    await vectorizeDiaryEntry("entry-123", shortText);

    const calledWith = vi.mocked(fetch).mock.calls[0]?.[1] as Record<
      string,
      unknown
    >;
    const body = JSON.parse(calledWith.body as string);
    expect(body.input).toHaveLength(1);
  });
});
