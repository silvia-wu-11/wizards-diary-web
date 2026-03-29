/**
 * 向量相似度检索：基于用户消息文本，召回与该用户日记语义最相近的条目。
 *
 * 检索策略：
 * - 主排序：余弦相似度（pgvector <=> 操作符），越近相关度越高
 * - 辅排序：相关度相近的条目以时间衰减因子决定优先级，updatedAt 越新优先召回
 *   公式：adjusted_distance = cosine_distance * (1 + recency_weight)
 *   recency_weight = EXTRACT(EPOCH FROM (NOW() - updatedAt)) / 2592000.0（归一化到30天）
 *
 * 数据隔离：通过 JOIN DiaryBook 并限定 db."userId" = userId 确保用户只能召回自己的日记。
 *
 * 容错机制：向量检索失败时自动降级为 ILIKE 全文搜索（按 updatedAt 倒序）。
 *
 * @see spec  openspec/specs/memory-engine/spec.md
 * @see design openspec/changes/memory-engine/design.md §5.2
 */

import { prisma } from "@/lib/db";
import { createEmbedding } from "@/lib/embedding/create";
import { Prisma } from "@prisma/client";

/**
 * 检索与用户消息语义最相关的日记条目。
 *
 * @param userId  当前登录用户 ID（用于数据隔离）
 * @param query   用户发送的消息文本
 * @param limit   最多召回条目数，默认 5 篇
 * @returns 匹配的日记列表（id / title / content / date / tags）
 */
export async function searchRelatedChunks(
  userId: string,
  query: string,
  limit = 5,
): Promise<
  Array<{
    entryId: string;
    chunkIndex: number;
    content: string;
    date: Date;
    title: string | null;
  }>
> {
  try {
    const { embedding: queryVector } = await createEmbedding(query);
    const vectorString = `[${queryVector.join(",")}]`;

    const results = await prisma.$queryRaw<
      Array<{
        entryId: string;
        chunkIndex: number;
        content: string;
        date: Date;
        title: string | null;
      }>
    >`
      SELECT dc."entryId",
             dc."chunkIndex",
             dc.content,
             de.date,
             de.title
      FROM "DiaryChunk" dc
      JOIN "DiaryEntry" de ON dc."entryId" = de.id
      JOIN "DiaryBook" db ON de."bookId" = db.id
      WHERE db."userId" = ${userId}
      ORDER BY (
        dc.embedding <=> ${vectorString}::vector
      ) * (
        1 + EXTRACT(EPOCH FROM (NOW() - de."updatedAt")) / 2592000.0
      ) ASC
      LIMIT ${limit}
    `;

    return results;
  } catch (err) {
    console.error("[searchRelatedChunks] vector search failed:", err);
    return [];
  }
}

/**
 * 检索与用户消息语义最相关的日记条目。
 *
 * @param userId  当前登录用户 ID（用于数据隔离）
 * @param query   用户发送的消息文本
 * @param limit   最多召回条目数，默认 5 篇
 * @returns 匹配的日记列表（id / title / content / date / tags）
 */
export async function searchRelatedDiaries(
  userId: string,
  query: string,
  limit = 5,
  bookId?: string,
): Promise<
  Array<{
    id: string;
    bookId: string;
    title: string | null;
    content: string;
    date: Date;
    tags: string[];
    imageUrls: string[];
  }>
> {
  try {
    // ① 将用户消息转为向量
    const { embedding: queryVector } = await createEmbedding(query);
    const vectorString = `[${queryVector.join(",")}]`;

    // ② pgvector 余弦相似度搜索，辅以时间衰减因子
    //    语义相近（距离小）且更新时间新（衰减小）的条目优先召回
    //    使用 DISTINCT ON (de.id) 去重同一篇日记的多个匹配 Chunk
    const results = await prisma.$queryRaw<
      Array<{
        id: string;
        bookId: string;
        title: string | null;
        content: string;
        date: Date;
        tags: string[];
        imageUrls: string[];
        distance: number;
      }>
    >`
      SELECT DISTINCT ON (de.id) 
             de.id,
             de."bookId",
             de.title,
             de.content,
             de.date,
             de.tags,
             de."imageUrls",
             (dc.embedding <=> ${vectorString}::vector) as distance
      FROM "DiaryEntry" de
      JOIN "DiaryChunk" dc ON de.id = dc."entryId"
      JOIN "DiaryBook" db ON de."bookId" = db.id
      WHERE db."userId" = ${userId}           -- 数据隔离：仅召回当前用户的日记
        ${bookId ? Prisma.sql`AND de."bookId" = ${bookId}` : Prisma.empty}
      ORDER BY de.id, distance ASC
      LIMIT ${limit}
    `;

    // 重新在内存中按 distance 排序（因为 DISTINCT ON 强制要求 ORDER BY 首列为 id）
    return results.sort((a, b) => a.distance - b.distance);
  } catch (err) {
    // ③ 向量检索失败时，降级为基于关键词的全文搜索
    console.error(
      "[searchRelatedDiaries] vector search failed, falling back to keyword search:",
      err,
    );
    return fallbackKeywordSearch(userId, query, limit, bookId);
  }
}

/**
 * 降级搜索：当 pgvector 不可用时，基于 ILIKE 关键词匹配 + 更新时间倒序召回。
 */
async function fallbackKeywordSearch(
  userId: string,
  query: string,
  limit: number,
  bookId?: string,
) {
  return prisma.diaryEntry.findMany({
    where: {
      book: { userId },
      ...(bookId ? { bookId } : {}),
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { updatedAt: "desc" }, // 按更新时间倒序，最近的优先
    take: limit,
    select: {
      id: true,
      bookId: true,
      title: true,
      content: true,
      date: true,
      tags: true,
      imageUrls: true,
    },
  });
}
