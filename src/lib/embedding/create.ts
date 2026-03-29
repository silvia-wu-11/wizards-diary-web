/**
 * Doubao Embedding 服务封装与日记向量化存取
 *
 * 负责两件事：
 * 1. createEmbedding / createEmbeddings — 调用火山方舟 Embedding API，将文本转为1024 维向量
 * 2. vectorizeDiaryEntry               — 将日记分块、向量化并存入 pgvector
 *
 * @see spec  openspec/specs/memory-engine/spec.md
 * @see design openspec/changes/memory-engine/design.md §3 / §4
 */

import { prisma } from "@/lib/db";

const EMBEDDING_API_URL =
  "https://ark.cn-beijing.volces.com/api/v3/embeddings/multimodal";
const HUOSHAN_EMBEDDING_MODEL = "doubao-embedding-vision-251215";

interface DoubaoEmbeddingResponse {
  id: string;
  model: string;
  created: number;
  object: string;
  data: {
    index: number;
    embedding: number[];
  };
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface EmbeddingResult {
  embedding: number[];
  tokenUsage: number;
}

// ─── Doubao Embedding API ───────────────────────────────────────────────────

/**
 * 将单段文本转为向量。
 *
 * @param text    待向量化文本
 * @param options 可选 AbortSignal，用于取消请求
 * @returns 向量结果（1024 维浮点数组 + token 用量）
 */
export async function createEmbedding(
  text: string,
  options?: { signal?: AbortSignal },
): Promise<EmbeddingResult> {
  const apiKey = process.env.HUOSHAN_MODEL_API_KEY;
  if (!apiKey) {
    throw new Error("HUOSHAN_MODEL_API_KEY is not configured");
  }

  const res = await withRetry(async () => {
    const r = await fetch(EMBEDDING_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: HUOSHAN_EMBEDDING_MODEL,
        input: [
          {
            text: text,
            type: "text",
          },
        ],
        encoding_format: "float",
        dimensions: 1024,
      }),
      signal: options?.signal,
    });

    if (!r.ok) {
      const err = await r.text();
      throw new Error(`Doubao Embedding API error: ${r.status} ${err}`);
    }
    return r;
  });

  const json: DoubaoEmbeddingResponse = await res.json();
  const item = json.data;

  if (!item || !item.embedding) {
    throw new Error("No embedding returned from Doubao API");
  }

  return {
    embedding: item.embedding,
    tokenUsage: json.usage.total_tokens,
  };
}

/**
 * 批量将多段文本转为向量。（供 vectorizeDiaryEntry 内部调用）
 *
 * @param texts   待向量化文本数组
 * @param options 可选 AbortSignal
 * @returns 各文本对应的向量结果列表
 */
export async function createEmbeddings(
  texts: string[],
  options?: { signal?: AbortSignal },
): Promise<EmbeddingResult[]> {
  const apiKey = process.env.HUOSHAN_MODEL_API_KEY;
  if (!apiKey) {
    throw new Error("HUOSHAN_MODEL_API_KEY is not configured");
  }

  const results: EmbeddingResult[] = [];
  for (const text of texts) {
    const res = await withRetry(async () => {
      const r = await fetch(EMBEDDING_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: HUOSHAN_EMBEDDING_MODEL,
          input: [{ text, type: "text" }],
          encoding_format: "float",
          dimensions: 1024,
        }),
        signal: options?.signal,
      });

      if (!r.ok) {
        const err = await r.text();
        throw new Error(`Doubao Embedding API error: ${r.status} ${err}`);
      }
      return r;
    });

    const json: DoubaoEmbeddingResponse = await res.json();
    results.push({
      embedding: json.data.embedding,
      tokenUsage: json.usage.total_tokens,
    });
  }
  return results;
}

// ─── 日记向量化 ──────────────────────────────────────────────────────────────

const MAX_CHUNK_CHARS = 1000;

/**
 * 按段落边界将文本分块，单块不超过 MAX_CHUNK_CHARS（1000 字符）。
 * 超长段落强制硬切。
 */
export function chunkText(text: string): string[] {
  if (text.length <= MAX_CHUNK_CHARS) {
    return [text];
  }

  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);

  let currentChunk = "";
  for (let i = 0; i < paragraphs.length; i++) {
    let para = paragraphs[i];

    while (para.length > MAX_CHUNK_CHARS) {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = "";
      }
      chunks.push(para.slice(0, MAX_CHUNK_CHARS));
      para = para.slice(MAX_CHUNK_CHARS);
    }

    if (currentChunk.length + para.length + 2 <= MAX_CHUNK_CHARS) {
      currentChunk += (currentChunk ? "\n\n" : "") + para;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = para;
    }
  }

  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

import { randomUUID } from "node:crypto";

/**
 * 带有指数退避的重试机制
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      console.warn(`[withRetry] Attempt ${attempt + 1} failed:`, err);
      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/**
 * 将日记内容分块、向量化，存入独立的 DiaryChunk 表中。
 *
 * 分块策略：超过 1000 字符按段落边界拆分；每块单独存储。
 *
 * @param entryId  DiaryEntry 的 ID
 * @param content 日记原文
 */
export async function vectorizeDiaryEntry(
  entryId: string,
  content: string,
): Promise<void> {
  const chunks = chunkText(content);
  const results = await createEmbeddings(chunks);

  // 删除旧的 Chunk，支持更新逻辑
  await prisma.$executeRaw`DELETE FROM "DiaryChunk" WHERE "entryId" = ${entryId}`;

  // 插入新的 Chunk 及其向量
  for (let i = 0; i < chunks.length; i++) {
    const chunkId = randomUUID();
    const text = chunks[i];
    const vectorString = `[${results[i].embedding.join(",")}]`;

    await prisma.$executeRaw`
      INSERT INTO "DiaryChunk" ("id", "entryId", "chunkIndex", "content", "embedding")
      VALUES (${chunkId}, ${entryId}, ${i}, ${text}, ${vectorString}::vector)
    `;
  }

  // 成功落库后，更新 vectorized 标记
  await prisma.diaryEntry.update({
    where: { id: entryId },
    data: { vectorized: true },
  });
}
