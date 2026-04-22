"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { vectorizeDiaryEntry } from "@/lib/embedding/create";
import { searchRelatedDiaries } from "@/lib/embedding/search";
import { updateCoreMemoryFromDiary } from "@/lib/memory/update";
import { uploadImages } from "@/lib/supabase/storage";
import { after } from "next/server";

const toast = {
  error(message: string) {
    console.warn(`[diary.actions] ${message}`);
  },
};

// ─────────────────────────────────────────────
// 类型：与前端 store 对齐，date 为 ISO string
// ─────────────────────────────────────────────
export interface DiaryBookDto {
  id: string;
  name: string;
  color?: string;
  type?: string;
}

export interface DiaryEntryDto {
  id: string;
  bookId: string;
  title: string | null;
  content: string;
  date: string;
  tags: string[];
  imageUrls: string[];
  audioUrl?: string | null;
  audioName?: string | null;
  audioDurationSec?: number | null;
  audioMimeType?: string | null;
}

export interface CreateEntryInput {
  bookId?: string;
  title?: string | null;
  content: string;
  date?: string;
  tags?: string[];
  /** Supabase URL 或 base64（data:image/...），base64 会先上传至 Storage */
  imageUrls?: string[];
  audioUrl?: string | null;
  audioName?: string | null;
  audioDurationSec?: number | null;
  audioMimeType?: string | null;
}

export interface CreateBookInput {
  name: string;
  color?: string;
  type?: string;
}

function entryFromPrisma(e: {
  id: string;
  bookId: string;
  title: string | null;
  content: string;
  date: Date;
  tags: string[];
  imageUrls: string[];
  audioUrl?: string | null;
  audioName?: string | null;
  audioDurationSec?: number | null;
  audioMimeType?: string | null;
}): DiaryEntryDto {
  return {
    id: e.id,
    bookId: e.bookId,
    title: e.title,
    content: e.content,
    date: e.date.toISOString(),
    tags: e.tags,
    imageUrls: e.imageUrls ?? [],
    audioUrl: e.audioUrl ?? null,
    audioName: e.audioName ?? null,
    audioDurationSec: e.audioDurationSec ?? null,
    audioMimeType: e.audioMimeType ?? null,
  };
}

function bookFromPrisma(b: {
  id: string;
  name: string;
  color: string | null;
  type: string | null;
}): DiaryBookDto {
  return {
    id: b.id,
    name: b.name,
    color: b.color ?? undefined,
    type: b.type ?? undefined,
  };
}

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    // throw new Error('Unauthorized');
    toast.error("请先登录账号，才能查看日记");
    return null;
  }
  return session.user.id;
}

/** 获取当前用户全部日记本与日记 */
export async function getDiaryData(): Promise<{
  books: DiaryBookDto[];
  entries: DiaryEntryDto[];
}> {
  const userId = await requireAuth();
  if (!userId) {
    return {
      books: [],
      entries: [],
    };
  }

  const [books, entries] = await Promise.all([
    prisma.diaryBook.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.diaryEntry.findMany({
      where: { book: { userId } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    books: books.map(bookFromPrisma),
    entries: entries.map(entryFromPrisma),
  };
}

/** 创建日记：content 必填；bookId 缺省取第一个；date 缺省为当日 */
export async function createEntry(
  input: CreateEntryInput,
): Promise<DiaryEntryDto> {
  const userId = await requireAuth();
  if (!userId) {
    toast.error("请先登录");
    throw new Error("Unauthorized");
  }

  const content = (input.content ?? "").trim();
  if (!content) {
    toast.error("内容不能为空");
    throw new Error("内容不能为空");
  }

  let bookId = input.bookId;
  if (!bookId) {
    const first = await prisma.diaryBook.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    if (!first) {
      toast.error("请先创建日记本");
      throw new Error("请先创建日记本");
    }
    bookId = first.id;
  }

  // 校验 book 归属
  const book = await prisma.diaryBook.findFirst({
    where: { id: bookId, userId },
  });
  if (!book) {
    toast.error("日记本不存在或无权访问");
    throw new Error("日记本不存在或无权访问");
  }

  const date = input.date ? new Date(input.date) : new Date();
  const tags = input.tags ?? [];
  const audioName = input.audioName?.trim() || null;
  const audioUrl = input.audioUrl ?? null;
  const audioDurationSec = input.audioDurationSec ?? null;
  const audioMimeType = input.audioMimeType ?? null;

  // base64 图片先上传至 Supabase，获得 URL
  let imageUrls: string[] = input.imageUrls ?? [];
  const base64List = imageUrls.filter((u) => u.startsWith("data:image"));
  if (base64List.length > 0) {
    const urls = await uploadImages(base64List, userId);
    imageUrls = [
      ...imageUrls.filter((u) => !u.startsWith("data:image")),
      ...urls,
    ];
  }

  const created = await prisma.diaryEntry.create({
    data: {
      bookId,
      title: (input.title ?? "").trim() || null,
      content,
      date,
      tags,
      imageUrls,
      audioUrl,
      audioName,
      audioDurationSec,
      audioMimeType,
    },
  });

  // after() 是 Next.js 15 新增的 后台任务 API ，用于在响应返回客户端后继续执行清理或异步工作。
  after(async () => {
    try {
      await vectorizeDiaryEntry(created.id, content);
    } catch (err) {
      console.error("[async] vectorizeDiaryEntry failed:", err);
    }
    try {
      await updateCoreMemoryFromDiary(userId, content);
    } catch (err) {
      console.error("[async] updateCoreMemoryFromDiary failed:", err);
    }
  });

  return entryFromPrisma(created);
}

/** 批量删除日记 */
export async function deleteEntries(ids: string[]): Promise<{ count: number }> {
  const userId = await requireAuth();
  if (!userId) {
    toast.error("请先登录");
    throw new Error("Unauthorized");
  }

  if (!ids || ids.length === 0) {
    return { count: 0 };
  }

  // 校验归属权并删除
  const result = await prisma.diaryEntry.deleteMany({
    where: {
      id: { in: ids },
      book: { userId }, // 只能删除属于当前用户的日记
    },
  });

  return { count: result.count };
}

/** 更新日记 */
export async function updateEntry(
  id: string,
  updates: Partial<
    Pick<
      CreateEntryInput,
      | "title"
      | "content"
      | "date"
      | "tags"
      | "imageUrls"
      | "audioUrl"
      | "audioName"
      | "audioDurationSec"
      | "audioMimeType"
    >
  >,
): Promise<DiaryEntryDto> {
  const userId = await requireAuth();
  if (!userId) {
    toast.error("请先登录");
    throw new Error("Unauthorized");
  }

  const existing = await prisma.diaryEntry.findFirst({
    where: { id, book: { userId } },
  });
  if (!existing) {
    toast.error("日记不存在或无权访问");
    throw new Error("日记不存在或无权访问");
  }

  let imageUrls = updates.imageUrls;
  if (imageUrls !== undefined) {
    const base64List = imageUrls.filter((u) => u.startsWith("data:image"));
    if (base64List.length > 0) {
      const urls = await uploadImages(base64List, userId, id);
      imageUrls = [
        ...imageUrls.filter((u) => !u.startsWith("data:image")),
        ...urls,
      ];
    }
  }

  const data: {
    title?: string | null;
    content?: string;
    date?: Date;
    tags?: string[];
    imageUrls?: string[];
    audioUrl?: string | null;
    audioName?: string | null;
    audioDurationSec?: number | null;
    audioMimeType?: string | null;
    vectorized?: boolean;
  } = {};
  if (updates.title !== undefined) data.title = updates.title?.trim() || null;

  const newContent =
    updates.content !== undefined ? updates.content.trim() : undefined;
  let contentChanged = false;
  if (newContent !== undefined && newContent !== existing.content) {
    data.content = newContent;
    data.vectorized = false; // 内容有变更，重置向量化状态
    contentChanged = true;
  }

  if (updates.date !== undefined) data.date = new Date(updates.date);
  if (updates.tags !== undefined) data.tags = updates.tags;
  if (imageUrls !== undefined) data.imageUrls = imageUrls;
  if (updates.audioUrl !== undefined) data.audioUrl = updates.audioUrl ?? null;
  if (updates.audioName !== undefined)
    data.audioName = updates.audioName?.trim() || null;
  if (updates.audioDurationSec !== undefined)
    data.audioDurationSec = updates.audioDurationSec ?? null;
  if (updates.audioMimeType !== undefined)
    data.audioMimeType = updates.audioMimeType ?? null;

  if (newContent === "") {
    toast.error("内容不能为空");
    throw new Error("内容不能为空");
  }

  const updated = await prisma.diaryEntry.update({
    where: { id },
    data,
  });

  if (contentChanged && data.content) {
    // 异步触发重新向量化
    after(async () => {
      try {
        await vectorizeDiaryEntry(updated.id, data.content!);
      } catch (err) {
        console.error("[async] vectorizeDiaryEntry failed on update:", err);
      }
      try {
        await updateCoreMemoryFromDiary(userId, data.content!);
      } catch (err) {
        console.error(
          "[async] updateCoreMemoryFromDiary failed on update:",
          err,
        );
      }
    });
  }

  return entryFromPrisma(updated);
}

/** 删除日记 */
export async function deleteEntry(id: string): Promise<void> {
  const userId = await requireAuth();
  if (!userId) {
    toast.error("请先登录");
    throw new Error("Unauthorized");
  }

  const existing = await prisma.diaryEntry.findFirst({
    where: { id, book: { userId } },
  });
  if (!existing) {
    toast.error("日记不存在或无权访问");
    throw new Error("日记不存在或无权访问");
  }

  await prisma.diaryEntry.delete({ where: { id } });
}

/** 创建日记本 */
export async function createBook(
  input: CreateBookInput,
): Promise<DiaryBookDto> {
  const userId = await requireAuth();
  if (!userId) {
    toast.error("请先登录");
    throw new Error("Unauthorized");
  }

  const name = (input.name ?? "").trim();
  if (!name) {
    toast.error("名称不能为空");
    throw new Error("名称不能为空");
  }

  const existing = await prisma.diaryBook.findFirst({
    where: { userId, name },
  });
  if (existing) {
    toast.error("已存在同名日记本，请使用其他名称");
    throw new Error("已存在同名日记本，请使用其他名称");
  }

  const created = await prisma.diaryBook.create({
    data: {
      userId,
      name,
      color: input.color ?? null,
      type: input.type ?? null,
    },
  });

  return bookFromPrisma(created);
}

/** 删除日记本（级联删除其下日记） */
export async function deleteBook(bookId: string): Promise<void> {
  const userId = await requireAuth();
  if (!userId) {
    toast.error("请先登录");
    throw new Error("Unauthorized");
  }

  const book = await prisma.diaryBook.findFirst({
    where: { id: bookId, userId },
  });
  if (!book) {
    toast.error("日记本不存在或无权访问");
    throw new Error("日记本不存在或无权访问");
  }

  await prisma.diaryBook.delete({ where: { id: bookId } });
}

// ─────────────────────────────────────────────
// 分页与筛选
// ─────────────────────────────────────────────

export interface GetEntriesPaginatedParams {
  dateFrom?: string;
  dateTo?: string;
  tag?: string;
  bookId?: string;
  keyword?: string;
  cursor?: string;
  limit?: number;
}

/** 分页获取日记，支持日期范围、tag、日记本、关键词筛选 */
export async function getEntriesPaginated(
  params: GetEntriesPaginatedParams,
): Promise<{
  entries: DiaryEntryDto[];
  semanticEntries?: DiaryEntryDto[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const userId = await requireAuth();
  if (!userId) {
    toast.error("请先登录");
    throw new Error("Unauthorized");
  }

  const limit = params.limit ?? 30;

  const dateCond: { gte?: Date; lte?: Date } = {};
  if (params.dateFrom)
    dateCond.gte = new Date(params.dateFrom + "T00:00:00.000Z");
  if (params.dateTo) dateCond.lte = new Date(params.dateTo + "T23:59:59.999Z");

  const where = {
    book: { userId },
    ...(Object.keys(dateCond).length > 0 && { date: dateCond }),
    ...(params.bookId && { bookId: params.bookId }),
    ...(params.tag && { tags: { has: params.tag } }),
    ...(params.keyword?.trim() && {
      OR: [
        {
          title: {
            contains: params.keyword.trim(),
            mode: "insensitive" as const,
          },
        },
        {
          content: {
            contains: params.keyword.trim(),
            mode: "insensitive" as const,
          },
        },
      ],
    }),
  };

  const take = limit + 1;
  const items = await prisma.diaryEntry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
    take,
  });

  const hasMore = items.length > limit;
  const entries = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? entries[entries.length - 1]!.id : null;

  let semanticEntries: DiaryEntryDto[] | undefined;

  // 如果提供了 keyword，并且是请求第一页（cursor 为空），则并发获取语义搜索结果
  if (params.keyword?.trim() && !params.cursor) {
    try {
      const keyword = params.keyword.trim();
      const semanticResults = await searchRelatedDiaries(
        userId,
        keyword,
        10,
        params.bookId,
      );

      type SemanticResultType = {
        id: string;
        bookId: string;
        title: string | null;
        content: string;
        date: Date;
        tags: string[];
        imageUrls: string[];
        audioUrl?: string | null;
        audioName?: string | null;
        audioDurationSec?: number | null;
        audioMimeType?: string | null;
      };

      // 添加日志输出到服务端控制台，让用户能够看到向量检索结果
      console.log(`\n[混合搜索] 关键词: "${keyword}"`);
      console.log(`[混合搜索] 向量检索召回结果数量: ${semanticResults.length}`);
      semanticResults.forEach((res: SemanticResultType, index: number) => {
        console.log(
          `   ${index + 1}. [${res.id}] 标题: ${res.title || "无"} | 标签: ${res.tags.join(",")} | 内容片段: ${res.content.substring(0, 30).replace(/\n/g, " ")}...`,
        );
      });

      // 去重：排除已经在精确匹配 (entries) 中出现的日记
      const exactIds = new Set(entries.map((e: { id: string }) => e.id));
      const deduplicated = semanticResults.filter(
        (e: SemanticResultType) => !exactIds.has(e.id),
      );

      console.log(
        `[混合搜索] 去除精确匹配重复后，剩余语义补充结果数量: ${deduplicated.length}\n`,
      );

      semanticEntries = deduplicated.map((e: SemanticResultType) => ({
        id: e.id,
        bookId: e.bookId,
        title: e.title,
        content: e.content,
        date: e.date.toISOString(),
        tags: e.tags,
        imageUrls: e.imageUrls ?? [],
        audioUrl: e.audioUrl ?? null,
        audioName: e.audioName ?? null,
        audioDurationSec: e.audioDurationSec ?? null,
        audioMimeType: e.audioMimeType ?? null,
      }));
    } catch (err) {
      console.error("[getEntriesPaginated] semantic search failed:", err);
    }
  }

  return {
    entries: entries.map(entryFromPrisma),
    semanticEntries,
    nextCursor,
    hasMore,
  };
}

/**
 * 内页混合搜索：在指定日记本内进行精确搜索和语义搜索
 */
export async function searchBookEntries(
  bookId: string,
  keyword: string,
): Promise<{
  exactMatches: DiaryEntryDto[];
  semanticMatches: DiaryEntryDto[];
}> {
  const userId = await requireAuth();
  if (!userId) {
    toast.error("请先登录");
    throw new Error("Unauthorized");
  }

  // 1. 精确匹配
  const exactItems = await prisma.diaryEntry.findMany({
    where: {
      bookId,
      book: { userId },
      OR: [
        { title: { contains: keyword, mode: "insensitive" } },
        { content: { contains: keyword, mode: "insensitive" } },
      ],
    },
    orderBy: { updatedAt: "desc" },
  });

  const exactMatches = exactItems.map(entryFromPrisma);

  // 2. 语义匹配
  let semanticMatches: DiaryEntryDto[] = [];
  try {
    const semanticResults = await searchRelatedDiaries(
      userId,
      keyword,
      5,
      bookId,
    );

    // 去重
    const exactIds = new Set(exactMatches.map((e) => e.id));
    const deduplicated = semanticResults.filter((e) => !exactIds.has(e.id));

    semanticMatches = deduplicated.map((e) => ({
      id: e.id,
      bookId: e.bookId,
      title: e.title,
      content: e.content,
      date: e.date.toISOString(),
      tags: e.tags,
      imageUrls: e.imageUrls ?? [],
      audioUrl: e.audioUrl ?? null,
      audioName: e.audioName ?? null,
      audioDurationSec: e.audioDurationSec ?? null,
      audioMimeType: e.audioMimeType ?? null,
    }));
  } catch (err) {
    console.error("[searchBookEntries] semantic search failed:", err);
  }

  return {
    exactMatches,
    semanticMatches,
  };
}
export async function getTags(): Promise<string[]> {
  const userId = await requireAuth();
  if (!userId) {
    toast.error("请先登录");
    throw new Error("Unauthorized");
  }

  const entries = await prisma.diaryEntry.findMany({
    where: { book: { userId } },
    select: { tags: true },
  });

  const tags = Array.from(
    new Set(entries.flatMap((e: { tags: string[] }) => e.tags)),
  ).sort((a: string, b: string) => a.localeCompare(b));
  return tags;
}
