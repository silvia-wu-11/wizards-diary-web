'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { uploadImages } from '@/lib/supabase/storage';

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
}

export interface CreateEntryInput {
  bookId?: string;
  title?: string | null;
  content: string;
  date?: string;
  tags?: string[];
  /** Supabase URL 或 base64（data:image/...），base64 会先上传至 Storage */
  imageUrls?: string[];
}

export interface CreateBookInput {
  name: string;
  color?: string;
  type?: string;
}

function entryFromPrisma(
  e: { id: string; bookId: string; title: string | null; content: string; date: Date; tags: string[]; imageUrls: string[] }
): DiaryEntryDto {
  return {
    id: e.id,
    bookId: e.bookId,
    title: e.title,
    content: e.content,
    date: e.date.toISOString(),
    tags: e.tags,
    imageUrls: e.imageUrls ?? [],
  };
}

function bookFromPrisma(b: { id: string; name: string; color: string | null; type: string | null }): DiaryBookDto {
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
    throw new Error('Unauthorized');
  }
  return session.user.id;
}

/** 获取当前用户全部日记本与日记 */
export async function getDiaryData(): Promise<{
  books: DiaryBookDto[];
  entries: DiaryEntryDto[];
}> {
  const userId = await requireAuth();

  const [books, entries] = await Promise.all([
    prisma.diaryBook.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.diaryEntry.findMany({
      where: { book: { userId } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    books: books.map(bookFromPrisma),
    entries: entries.map(entryFromPrisma),
  };
}

/** 创建日记：content 必填；bookId 缺省取第一个；date 缺省为当日 */
export async function createEntry(input: CreateEntryInput): Promise<DiaryEntryDto> {
  const userId = await requireAuth();

  const content = (input.content ?? '').trim();
  if (!content) {
    throw new Error('内容不能为空');
  }

  let bookId = input.bookId;
  if (!bookId) {
    const first = await prisma.diaryBook.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    if (!first) {
      throw new Error('请先创建日记本');
    }
    bookId = first.id;
  }

  // 校验 book 归属
  const book = await prisma.diaryBook.findFirst({
    where: { id: bookId, userId },
  });
  if (!book) {
    throw new Error('日记本不存在或无权访问');
  }

  const date = input.date ? new Date(input.date) : new Date();
  const tags = input.tags ?? [];

  // base64 图片先上传至 Supabase，获得 URL
  let imageUrls: string[] = input.imageUrls ?? [];
  const base64List = imageUrls.filter((u) => u.startsWith('data:image'));
  if (base64List.length > 0) {
    const urls = await uploadImages(base64List, userId);
    imageUrls = [...imageUrls.filter((u) => !u.startsWith('data:image')), ...urls];
  }

  const created = await prisma.diaryEntry.create({
    data: {
      bookId,
      title: (input.title ?? '').trim() || null,
      content,
      date,
      tags,
      imageUrls,
    },
  });

  return entryFromPrisma(created);
}

/** 更新日记 */
export async function updateEntry(
  id: string,
  updates: Partial<Pick<CreateEntryInput, 'title' | 'content' | 'date' | 'tags' | 'imageUrls'>>
): Promise<DiaryEntryDto> {
  const userId = await requireAuth();

  const existing = await prisma.diaryEntry.findFirst({
    where: { id, book: { userId } },
  });
  if (!existing) {
    throw new Error('日记不存在或无权访问');
  }

  let imageUrls = updates.imageUrls;
  if (imageUrls !== undefined) {
    const base64List = imageUrls.filter((u) => u.startsWith('data:image'));
    if (base64List.length > 0) {
      const urls = await uploadImages(base64List, userId, id);
      imageUrls = [...imageUrls.filter((u) => !u.startsWith('data:image')), ...urls];
    }
  }

  const data: Record<string, unknown> = {};
  if (updates.title !== undefined) data.title = updates.title?.trim() || null;
  if (updates.content !== undefined) data.content = updates.content?.trim();
  if (updates.date !== undefined) data.date = new Date(updates.date);
  if (updates.tags !== undefined) data.tags = updates.tags;
  if (imageUrls !== undefined) data.imageUrls = imageUrls;

  if (data.content === '') {
    throw new Error('内容不能为空');
  }

  const updated = await prisma.diaryEntry.update({
    where: { id },
    data,
  });

  return entryFromPrisma(updated);
}

/** 删除日记 */
export async function deleteEntry(id: string): Promise<void> {
  const userId = await requireAuth();

  const existing = await prisma.diaryEntry.findFirst({
    where: { id, book: { userId } },
  });
  if (!existing) {
    throw new Error('日记不存在或无权访问');
  }

  await prisma.diaryEntry.delete({ where: { id } });
}

/** 创建日记本 */
export async function createBook(input: CreateBookInput): Promise<DiaryBookDto> {
  const userId = await requireAuth();

  const name = (input.name ?? '').trim();
  if (!name) {
    throw new Error('名称不能为空');
  }

  const existing = await prisma.diaryBook.findFirst({
    where: { userId, name },
  });
  if (existing) {
    throw new Error('已存在同名日记本，请使用其他名称');
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

  const book = await prisma.diaryBook.findFirst({
    where: { id: bookId, userId },
  });
  if (!book) {
    throw new Error('日记本不存在或无权访问');
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
export async function getEntriesPaginated(params: GetEntriesPaginatedParams): Promise<{
  entries: DiaryEntryDto[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const userId = await requireAuth();
  const limit = params.limit ?? 30;

  const dateCond: { gte?: Date; lte?: Date } = {};
  if (params.dateFrom) dateCond.gte = new Date(params.dateFrom + 'T00:00:00.000Z');
  if (params.dateTo) dateCond.lte = new Date(params.dateTo + 'T23:59:59.999Z');

  const where = {
    book: { userId },
    ...(Object.keys(dateCond).length > 0 && { date: dateCond }),
    ...(params.bookId && { bookId: params.bookId }),
    ...(params.tag && { tags: { has: params.tag } }),
    ...(params.keyword?.trim() && {
      OR: [
        { title: { contains: params.keyword.trim(), mode: 'insensitive' as const } },
        { content: { contains: params.keyword.trim(), mode: 'insensitive' as const } },
      ],
    }),
  };

  const take = limit + 1;
  const items = await prisma.diaryEntry.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
    take,
  });

  const hasMore = items.length > limit;
  const entries = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? entries[entries.length - 1]!.id : null;

  return {
    entries: entries.map(entryFromPrisma),
    nextCursor,
    hasMore,
  };
}

/** 获取当前用户所有日记的 tag 列表（用于筛选下拉） */
export async function getTags(): Promise<string[]> {
  const userId = await requireAuth();

  const entries = await prisma.diaryEntry.findMany({
    where: { book: { userId } },
    select: { tags: true },
  });

  const tags = Array.from(new Set(entries.flatMap((e: { tags: string[] }) => e.tags))).sort((a: string, b: string) => a.localeCompare(b));
  return tags;
}
