# 个人记忆引擎 · 技术设计

## 1. 数据模型变更

### 1.1 Prisma Schema

```typescript
HUOSHAN_EMBEDDING_MODEL
```

修改 `prisma/schema.prisma`：

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  directUrl  = env("DIRECT_URL")
  extensions = [vector]
}

model User {
  id           String      @id @default(cuid())
  username     String      @unique
  passwordHash String
  name         String?
  coreMemory   Json?       @default(db.raw("NULL")) // V1: null，异步初始化
  createdAt    DateTime    @default(now())
  updatedAt    DateTime   @updatedAt
  books        DiaryBook[]
}

model DiaryEntry {
  id         String   @id @default(cuid())
  bookId     String
  title      String?
  content    String
  date       DateTime
  tags       String[]
  imageUrls  String[]
  vectorized Boolean  @default(false) // 是否已成功生成并存储向量
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  book   DiaryBook    @relation(fields: [bookId], references: [id], onDelete: Cascade)
  chunks DiaryChunk[]

  @@index([bookId])
}

model DiaryChunk {
  id         String   @id @default(cuid())
  entryId    String
  chunkIndex Int
  content    String
  embedding  Unsupported("vector(1024)") // Doubao embedding 1024 维，必填

  entry DiaryEntry @relation(fields: [entryId], references: [id], onDelete: Cascade)

  @@index([entryId])
}
```

> **注意**：由于引入了 `DiaryChunk` 专门存储分块及其向量，`Unsupported("vector(1024)")` 字段已移至该表。向量操作（存取、相似度搜索）需通过 `$executeRaw` / `$queryRaw` 原生 SQL 执行。

### 1.2 数据库 Migration

```bash
# 1. 启用 pgvector 扩展（Supabase 已开启，可跳过）
# 在 Supabase SQL Editor 执行：
CREATE EXTENSION IF NOT EXISTS vector;

# 2. 添加 coreMemory 列（Json，默认 null）
ALTER TABLE "User" ADD COLUMN "coreMemory" JSONB;

# 3. 添加 vectorized 列（Boolean，默认 false）
ALTER TABLE "DiaryEntry" ADD COLUMN "vectorized" BOOLEAN NOT NULL DEFAULT false;

# 4. 创建 DiaryChunk 表并包含 vector 列（通过 prisma db push 或 migrate 处理）
```

***

## 2. Core Memory 类型定义

新建 `src/app/types/core-memory.ts`：

```ts
export interface CoreMemory {
  version: string; // 当前为 "1.0"
  identity: {
    name: string;
    nickname: string;
    occupation: string;
    location: string;
  };
  relationships: Array<{
    name: string;
    relation: string;
    description: string;
  }>;
  life_facts: string[];
  preferences: {
    likes: string[];
    dislikes: string[];
    hobbies: string[];
    dietary: string[];
    communication_style: string;
  };
  goals: {
    short_term: string[];
    long_term: string[];
  };
  emotional_context: {
    recent_mood_trend: string;
    significant_events: string[];
  };
  memory_anchors: string[];
}

export const CORE_MEMORY_CAPACITY = {
  relationships: 20,
  life_facts: 50,
  'preferences.likes': 10,
  'preferences.dislikes': 10,
  'preferences.hobbies': 10,
  'preferences.dietary': 10,
  'goals.short_term': 10,
  'goals.long_term': 10,
  'emotional_context.significant_events': 20,
  memory_anchors: 30,
} as const;

export const INITIAL_CORE_MEMORY: CoreMemory = {
  version: '1.0',
  identity: { name: '', nickname: '', occupation: '', location: '' },
  relationships: [],
  life_facts: [],
  preferences: { likes: [], dislikes: [], hobbies: [], dietary: [], communication_style: '' },
  goals: { short_term: [], long_term: [] },
  emotional_context: { recent_mood_trend: '', significant_events: [] },
  memory_anchors: [],
};
```

***

## 3. Doubao Embedding API 集成

### 3.1 环境变量

```env
HUOSHAN_EMBEDDING_API_KEY=your_api_key_here
HUOSHAN_EMBEDDING_MODEL=doubao-embdding
```

### 3.2 Embedding 服务封装

新建 `src/lib/embedding/doubao.ts`：

```ts
const EMBEDDING_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/embeddings';

interface DoubaoEmbeddingInput {
  model?: string;
  input: string | string[];
  encoding_format?: 'float' | 'base64';
}

interface DoubaoEmbeddingResponse {
  id: string;
  model: string;
  created: number;
  object: string;
  data: Array<{
    index: number;
    embedding: number[];
    object: string;
  }>;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface EmbeddingResult {
  embedding: number[];
  tokenUsage: number;
}

export async function createEmbedding(
  text: string,
  options?: { signal?: AbortSignal }
): Promise<EmbeddingResult> {
  const apiKey = process.env.HUOSHAN_EMBEDDING_API_KEY;
  const model = process.env.HUOSHAN_EMBEDDING_MODEL || 'doubao-embdding';

  if (!apiKey) {
    throw new Error('HUOSHAN_EMBEDDING_API_KEY is not configured');
  }

  const body: DoubaoEmbeddingInput = {
    model,
    input: text,
    encoding_format: 'float',
  };

  const res = await fetch(EMBEDDING_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: options?.signal,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Doubao Embedding API error: ${res.status} ${err}`);
  }

  const json: DoubaoEmbeddingResponse = await res.json();
  const item = json.data[0];

  if (!item) {
    throw new Error('No embedding returned from Doubao API');
  }

  return {
    embedding: item.embedding,
    tokenUsage: json.usage.total_tokens,
  };
}

export async function createEmbeddings(
  texts: string[],
  options?: { signal?: AbortSignal }
): Promise<EmbeddingResult[]> {
  const apiKey = process.env.HUOSHAN_EMBEDDING_API_KEY;
  const model = process.env.HUOSHAN_EMBEDDING_MODEL || 'doubao-embdding';

  if (!apiKey) {
    throw new Error('HUOSHAN_EMBEDDING_API_KEY is not configured');
  }

  const body: DoubaoEmbeddingInput = {
    model,
    input: texts,
    encoding_format: 'float',
  };

  const res = await fetch(EMBEDDING_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: options?.signal,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Doubao Embedding API error: ${res.status} ${err}`);
  }

  const json: DoubaoEmbeddingResponse = await res.json();
  return json.data.map((item) => ({
    embedding: item.embedding,
    tokenUsage: json.usage.total_tokens,
  }));
}
```

***

## 4. 日记分块策略

新建 `src/lib/embedding/chunk.ts`：

```ts
const MAX_CHUNK_CHARS = 1000; // 约 500 tokens，超出则分块

export function chunkText(text: string): string[] {
  if (text.length <= MAX_CHUNK_CHARS) {
    return [text];
  }

  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);

  let currentChunk = '';
  for (const para of paragraphs) {
    if (currentChunk.length + para.length + 2 <= MAX_CHUNK_CHARS) {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      // 如果单个段落就超过限制，直接按字符数硬切
      currentChunk = para.length > MAX_CHUNK_CHARS ? para.slice(0, MAX_CHUNK_CHARS) : para;
    }
  }

  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}
```

***

## 5. 向量存取与检索

### 5.1 存入向量

```ts
import { prisma } from '@/lib/db';
import { createEmbeddings } from '@/lib/embedding/doubao';
import { chunkText } from '@/lib/embedding/chunk';

export async function vectorizeDiaryEntry(entryId: string, content: string): Promise<void> {
  const chunks = chunkText(content);

  const results = await createEmbeddings(chunks);

  // 删除旧的 Chunk，支持更新逻辑
  await prisma.diaryChunk.deleteMany({ where: { entryId } });

  // 插入新的 Chunk 及其向量
  for (let i = 0; i < chunks.length; i++) {
    const chunkId = require("crypto").randomUUID(); // 或使用 Prisma 的 cuid() 等生成机制
    await prisma.$executeRaw`
      INSERT INTO "DiaryChunk" (id, "entryId", "chunkIndex", content, embedding)
      VALUES (${chunkId}, ${entryId}, ${i}, ${chunks[i]}, ${`[${results[i].embedding.join(',')}]`}::vector)
    `;
  }

  // 成功落库后，更新 vectorized 标记
  await prisma.diaryEntry.update({
    where: { id: entryId },
    data: { vectorized: true }
  });
}
```

### 3.3 自动重试机制与数据补偿
由于 `createEmbeddings` 调用外部 API，可能会遇到偶发性网络超时。我们需要实现简单的重试逻辑（如最多 3 次，指数退避），确保大部分请求能成功。如果彻底失败，`vectorized` 仍为 `false`。

为保证系统高可用与数据最终一致性，提供补偿脚本扫描失败日记进行恢复：
- **补偿脚本路径**：`scripts/compensate-vectors.ts`
- **执行方式**：生产环境中可通过 Cron Job 定时运行（如每天凌晨执行 `pnpm db:compensate-vectors`）。
- **参数支持**：可通过 `--user_id` 或 `-u` 指定扫描的特定用户（如 `pnpm db:compensate-vectors --user_id <uuid>`）。如果不传，则默认扫描所有用户。
- **逻辑**：扫描对应用户下 `vectorized: false` 的日记记录，逐条调用 `vectorizeDiaryEntry` 重新生成和保存向量 Chunk。

### 5.2 向量相似度检索

我们需要支持两种场景：
1. **Chum 对话 RAG**：返回最相关的 5 个 Chunk 文本（`searchRelatedChunks`）。
2. **日记列表搜索**：返回包含匹配 Chunk 的完整 DiaryEntry 列表（`searchRelatedDiaries`）。

```ts
import { prisma } from '@/lib/db';
import { createEmbedding } from '@/lib/embedding/doubao';

// 场景 1：对话 RAG 检索（返回具体的 Chunk 文本）
export async function searchRelatedChunks(
  userId: string,
  query: string,
  limit = 5
): Promise<Array<{ entryId: string; chunkIndex: number; content: string; date: Date; title: string | null }>> {
  try {
    const { embedding: queryVector } = await createEmbedding(query);
    const vectorString = `[${queryVector.join(',')}]`;

    const results = await prisma.$queryRawUnsafe<any[]>`
      SELECT dc."entryId", dc."chunkIndex", dc.content, de.date, de.title
      FROM "DiaryChunk" dc
      JOIN "DiaryEntry" de ON dc."entryId" = de.id
      JOIN "DiaryBook" db ON de."bookId" = db.id
      WHERE db."userId" = ${userId}
      ORDER BY (dc.embedding <=> ${vectorString}::vector) * (1 + EXTRACT(EPOCH FROM (NOW() - de."updatedAt")) / 2592000.0) ASC
      LIMIT ${limit}
    `;

    return results;
  } catch (err) {
    console.error('Vector search failed', err);
    return []; // 降级处理等
  }
}

// 场景 2：日记列表搜索（返回完整的 DiaryEntry）
export async function searchRelatedDiaries(
  userId: string,
  query: string,
  limit = 5
): Promise<Array<{ id: string; title: string | null; content: string; date: Date; tags: string[] }>> {
  try {
    const { embedding: queryVector } = await createEmbedding(query);
    const vectorString = `[${queryVector.join(',')}]`;

    // 搜索 Chunk，并通过 entryId 去重，返回对应的 DiaryEntry
    const results = await prisma.$queryRawUnsafe<any[]>`
      SELECT DISTINCT ON (de.id) de.id, de.title, de.content, de.date, de.tags, 
             (dc.embedding <=> ${vectorString}::vector) as distance
      FROM "DiaryEntry" de
      JOIN "DiaryChunk" dc ON de.id = dc."entryId"
      JOIN "DiaryBook" db ON de."bookId" = db.id
      WHERE db."userId" = ${userId}
      ORDER BY de.id, distance ASC
      LIMIT ${limit}
    `;

    // 因为 DISTINCT ON 需要 ORDER BY id，我们在 JS 层或通过子查询再按照 distance 排序
    return results.sort((a, b) => a.distance - b.distance);
  } catch (err) {
    console.error('Vector search failed', err);
    return fallbackKeywordSearch(userId, query, limit);
  }
}

async function fallbackKeywordSearch(
  userId: string,
  query: string,
  limit: number
) {
  return prisma.diaryEntry.findMany({
    where: {
      book: { userId },
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: { id: true, title: true, content: true, date: true, tags: true },
  });
}
```

***

## 6. Core Memory 合并更新

### 6.1 LLM 提炼提示词

新建 `src/lib/memory/prompt.ts`：

```ts
import type { CoreMemory } from '@/app/types/core-memory';

export function buildMemoryExtractionPrompt(
  currentMemory: CoreMemory | null,
  diaryContent: string
): string {
  const memoryJson = currentMemory
    ? JSON.stringify(currentMemory, null, 2)
    : JSON.stringify({ version: '1.0' }, null, 2);

  return `你是一位记忆管理助手。请仔细阅读用户今日的日记内容，从中提炼可能对了解用户有帮助的信息，并以 JSON 格式返回。

【当前用户记忆（仅参考，不要直接复制）】
${memoryJson}

【今日日记内容】
${diaryContent}

【提炼要求】
请从日记中提炼以下信息，返回符合上述 JSON Schema 的增量数据（increment）：
- identity: 用户透露的姓名、昵称、职业、所在地等身份信息
- relationships: 日记中提到的重要人物及其关系
- life_facts: 用户分享的重要事实或经历
- preferences: 用户的喜好（likes）、厌恶（dislikes）、爱好（hobbies）、饮食习惯（dietary）、沟通风格（communication_style）
- goals: 用户的短期（short_term）和长期（long_term）目标
- emotional_context: 用户近期情绪趋势（recent_mood_trend）和重要事件（significant_events）
- memory_anchors: 日记中特别值得记忆的锚点（如具体日期事件、重要感悟）

【JSON 返回格式】
只返回纯 JSON，不要包含解释或 markdown 代码块包裹：
{"identity": {...}, "relationships": [...], ...}

【注意】
- 如果某个字段没有新信息，返回空数组（或空字符串）而非 null
- relationships 每条需要包含 name、relation、description 三个子字段
- 数组字段请追加而非覆盖
- 返回的 JSON 将与现有记忆执行合并`;
}
```

### 6.2 JSON Merge Patch 合并

新建 `src/lib/memory/merge.ts`：

```ts
import type { CoreMemory } from '@/app/types/core-memory';
import { CORE_MEMORY_CAPACITY, INITIAL_CORE_MEMORY } from '@/app/types/core-memory';

export function mergeCoreMemory(
  current: CoreMemory | null,
  increment: Partial<CoreMemory>
): CoreMemory {
  const base: CoreMemory = current ?? INITIAL_CORE_MEMORY;

  const merged: CoreMemory = JSON.parse(JSON.stringify(base));

  // 版本迁移：如果 increment 有 version 且与 base 不同，执行迁移
  if (increment.version && increment.version !== base.version) {
    // V1 -> V2 迁移逻辑可在此扩展
  }

  // 合并标量字段
  if (increment.identity) {
    merged.identity = { ...merged.identity, ...increment.identity };
  }
  if (increment.preferences) {
    merged.preferences = { ...merged.preferences, ...increment.preferences };
  }
  if (increment.emotional_context) {
    merged.emotional_context = {
      ...merged.emotional_context,
      ...increment.emotional_context,
    };
  }
  if (increment.goals) {
    merged.goals = {
      short_term: [...merged.goals.short_term, ...(increment.goals.short_term ?? [])],
      long_term: [...merged.goals.long_term, ...(increment.goals.long_term ?? [])],
    };
  }

  // 合并数组字段（追加）
  const arrayFields: (keyof CoreMemory)[] = [
    'relationships',
    'life_facts',
    'memory_anchors',
  ];

  for (const field of arrayFields) {
    if (increment[field] && Array.isArray(increment[field])) {
      const capKey = field;
      const capacity = CORE_MEMORY_CAPACITY[capKey] ?? Infinity;
      const existing = Array.isArray(merged[field]) ? merged[field] : [];
      const newItems = increment[field] as unknown[];
      const combined = [...existing, ...newItems];
      // 超出容量时裁剪最旧的（前 20 条保留）
      merged[field] = combined.slice(-capacity) as never;
    }
  }

  // emotional_context.significant_events 单独处理
  if (increment.emotional_context?.significant_events) {
    const capacity = CORE_MEMORY_CAPACITY['emotional_context.significant_events'];
    const existing = merged.emotional_context.significant_events;
    const combined = [...existing, ...increment.emotional_context.significant_events];
    merged.emotional_context.significant_events = combined.slice(-capacity);
  }

  return merged;
}
```

### 6.3 异步 Memory 更新任务

新建 `src/lib/memory/update.ts`：

```ts
'use server';

import { prisma } from '@/lib/db';
import { buildMemoryExtractionPrompt } from '@/lib/memory/prompt';
import { mergeCoreMemory } from '@/lib/memory/merge';
import { INITIAL_CORE_MEMORY, type CoreMemory } from '@/app/types/core-memory';

const MEMORY_EXTRACTION_MODEL = 'ep-20260325172108-n42bd'; // Doubao-Seed-1.6-lite

async function callLLMToExtract(systemPrompt: string, diaryContent: string): Promise<Partial<CoreMemory>> {
  const apiKey = process.env.HUOSHAN_MODEL_API_KEY;
  if (!apiKey) throw new Error('HUOSHAN_MODEL_API_KEY not configured');

  const res = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MEMORY_EXTRACTION_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `请根据以下日记提炼信息：\n\n${diaryContent}` },
      ],
      max_tokens: 1024,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM extraction failed: ${res.status} ${err}`);
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content ?? '{}';

  try {
    return JSON.parse(text);
  } catch {
    console.error('[memory/update] Failed to parse LLM response as JSON:', text);
    return {};
  }
}

export async function updateCoreMemoryFromDiary(
  userId: string,
  diaryContent: string
): Promise<void> {
  try {
    // 1. 获取当前 coreMemory（如果为 null，初始化为空结构）
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coreMemory: true },
    });

    const currentMemory: CoreMemory | null = user?.coreMemory as CoreMemory | null;

    // 2. 构建提炼 prompt
    const systemPrompt = buildMemoryExtractionPrompt(currentMemory, diaryContent);

    // 3. 调用 LLM 提炼增量信息
    const increment = await callLLMToExtract(systemPrompt, diaryContent);

    // 4. JSON Merge Patch 合并
    const merged = mergeCoreMemory(currentMemory, increment);

    // 5. 写回数据库
    await prisma.user.update({
      where: { id: userId },
      data: { coreMemory: merged },
    });

    console.log(`[memory/update] Core memory updated for user ${userId}`);
  } catch (err) {
    // 静默失败：记录错误但不向用户抛出
    console.error(`[memory/update] Failed to update core memory for user ${userId}:`, err);
  }
}
```

***

## 7. 日记保存与更新流程改造

修改 `src/app/actions/diary.ts` 中的 `createEntry` 和 `updateEntry`，在日记保存或正文更新成功后触发异步后台任务：

### 7.1 创建日记 (createEntry)
```ts
import { after } from 'next/server';
import { vectorizeDiaryEntry } from '@/lib/embedding/create';
import { updateCoreMemoryFromDiary } from '@/lib/memory/update';

export async function createEntry(input: CreateEntryInput): Promise<DiaryEntryDto> {
  // ... 现有逻辑（校验、写入 DiaryEntry）...

  const created = await prisma.diaryEntry.create({ /* ... */ });
  const entryId = created.id;
  const userId = /* 从 session 或 book 关联获取 */;

  // 异步后台任务（after 在 Next.js 15+ 可用）
  after(async () => {
    try {
      // ① 向量化
      await vectorizeDiaryEntry(entryId, input.content);
    } catch (err) {
      console.error('[async] vectorizeDiaryEntry failed:', err);
    }

    try {
      // ② 提炼并合并 Core Memory
      await updateCoreMemoryFromDiary(userId, input.content);
    } catch (err) {
      console.error('[async] updateCoreMemoryFromDiary failed:', err);
    }
  });

  // 立即返回 200 OK
  return entryFromPrisma(created);
}
```

### 7.2 更新日记 (updateEntry)
在更新日记时，需要判断正文 (`content`) 是否发生变更：
```ts
export async function updateEntry(id: string, updates: Partial<CreateEntryInput>) {
  // ... 获取已有日记 existing ...

  let contentChanged = false;
  const newContent = updates.content !== undefined ? updates.content.trim() : undefined;
  
  const data: any = { /* 组装更新数据 */ };
  
  if (newContent !== undefined && newContent !== existing.content) {
    data.content = newContent;
    data.vectorized = false; // 内容变更，重置向量化状态
    contentChanged = true;
  }

  const updated = await prisma.diaryEntry.update({ where: { id }, data });

  // 仅在正文发生变更时触发重新向量化和记忆提炼
  if (contentChanged && data.content) {
    after(async () => {
      try {
        await vectorizeDiaryEntry(updated.id, data.content!); // 内部会执行 DELETE 旧 Chunk
      } catch (err) {
        console.error('[async] vectorizeDiaryEntry failed on update:', err);
      }
      try {
        await updateCoreMemoryFromDiary(userId, data.content!);
      } catch (err) {
        console.error('[async] updateCoreMemoryFromDiary failed on update:', err);
      }
    });
  }

  return entryFromPrisma(updated);
}
```

> **备选方案**（若 `after()` 不稳定）：使用 Server Action 返回后，前端用 `navigator.sendBeacon` 调用一个新的 `POST /api/memory/tasks` 接口触发后台处理。

***

## 8. 对话上下文注入改造

### 8.1 加载 Core Memory 并格式化

新建 `src/lib/memory/format.ts`：

```ts
import type { CoreMemory } from '@/app/types/core-memory';

export function formatCoreMemoryForPrompt(memory: CoreMemory | null): string {
  if (!memory) return '';

  const lines: string[] = ['【用户记忆内核】'];

  if (memory.identity.name || memory.identity.nickname) {
    lines.push(`身份：${memory.identity.name || memory.identity.nickname}${memory.identity.occupation ? `（${memory.identity.occupation}）` : ''}${memory.identity.location ? `，位于${memory.identity.location}` : ''}`);
  }

  if (memory.relationships.length > 0) {
    const rels = memory.relationships.map((r) => `${r.name}（${r.relation}）`).join('、');
    lines.push(`重要关系：${rels}`);
  }

  if (memory.preferences.hobbies.length > 0) {
    lines.push(`兴趣爱好：${memory.preferences.hobbies.join('、')}`);
  }

  if (memory.goals.short_term.length > 0) {
    lines.push(`短期目标：${memory.goals.short_term.join('、')}`);
  }

  if (memory.goals.long_term.length > 0) {
    lines.push(`长期目标：${memory.goals.long_term.join('、')}`);
  }

  if (memory.emotional_context.recent_mood_trend) {
    lines.push(`近期情绪：${memory.emotional_context.recent_mood_trend}`);
  }

  if (memory.life_facts.length > 0) {
    lines.push(`重要事实：${memory.life_facts.slice(-5).join('；')}`);
  }

  return lines.join('\n');
}
```

### 8.2 扩展 API Route / 修改现有逻辑

在 `POST /api/chat` 中，扩展向量检索上下文注入：

修改 `src/app/api/chat/route.ts`：

```ts
import { searchRelatedDiaries } from '@/lib/embedding/search';
import { getCoreMemory } from '@/lib/memory/store';
import { formatCoreMemoryForPrompt } from '@/lib/memory/format';

// ─── 首次请求（打开对话框）：仅注入 Core Memory 前缀 ───
if (isFirstRequest) {
  const coreMemory = await getCoreMemory(session.user.id);
  const memoryPrompt = formatCoreMemoryForPrompt(coreMemory);
  const systemPrompt = memoryPrompt
    ? `${memoryPrompt}\n\n你是一位温暖的魔法日记伴侣「CHUM」...`
    : '你是一位温暖的魔法日记伴侣「CHUM」...';
  // 将 systemPrompt 传入首轮请求的 messages 中
} else {
  // ─── 后续每轮请求（用户发送消息）：向量检索日记上下文 ───
  const relatedChunks = await searchRelatedChunks(session.user.id, input, 2);
  const contextPrompt = formatRelatedChunksForPrompt(relatedChunks);
  // 将 contextPrompt 与用户输入拼接后作为 input
}
```

**关键点**：

- Core Memory 仅在首次请求时注入一次，后续方舟自动缓存
- 向量检索**不在首次请求执行**，仅在用户发送后续消息时执行
- 检索到的日记片段与用户当前输入进行拼接
- 通过 `previous_response_id` 串联后续请求（方舟缓存上下文）

新增 `src/lib/memory/store.ts`：

```ts
import { prisma } from '@/lib/db';
import type { CoreMemory } from '@/app/types/core-memory';
import { INITIAL_CORE_MEMORY } from '@/app/types/core-memory';

export async function getCoreMemory(userId: string): Promise<CoreMemory | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { coreMemory: true },
  });

  if (!user?.coreMemory) return null;
  return user.coreMemory as CoreMemory;
}
```

新增 `src/lib/embedding/search.ts`（参考第 5 节 `searchRelatedDiaries`）。

***

## 9. 文件结构

```
src/
├── app/
│   ├── actions/
│   │   └── diary.ts                  # 修改：createEntry 增加异步触发
│   ├── api/
│   │   └── chat/
│   │       └── route.ts              # 修改：增加向量检索上下文注入
│   └── types/
│       └── core-memory.ts            # CoreMemory 类型定义
├── lib/
│   ├── embedding/
│   │   ├── doubao.ts                 # Doubao Embedding API 调用封装
│   │   ├── chunk.ts                  # 日记分块策略
│   │   └── search.ts                 # 向量相似度检索
│   └── memory/
│       ├── prompt.ts                 # LLM 提炼 prompt
│       ├── merge.ts                  # JSON Merge Patch 合并
│       ├── format.ts                 # Core Memory 格式化
│       ├── store.ts                  # Core Memory 读取
│       └── update.ts                 # 异步 Core Memory 更新任务
└── app/
    └── types/
        └── core-memory.ts
```

***

## 10. 测试策略

| 层级  | 工具                 | 覆盖                                                                      |
| --- | ------------------ | ----------------------------------------------------------------------- |
| 单元  | Vitest             | `chunkText` 分块逻辑、`mergeCoreMemory` 合并逻辑、`formatCoreMemoryForPrompt` 格式化 |
| 单元  | Vitest             | `createEmbedding` mock 外部 API                                           |
| 集成  | Vitest + Supertest | `POST /api/chat` mock 火山方舟 + pgvector，验证向量检索上下文注入                       |
| 集成  | Vitest             | `createEntry` 修改后，验证 `after()` 触发异步任务（mock `after` 函数）                  |
| E2E | Playwright         | 保存日记 → 验证向量写入；与 Chum 对话 → 验证检索到相关日记                                     |

***

## 11. 环境变量清单

| 变量名                         | 说明                          | 来源                         |
| --------------------------- | --------------------------- | -------------------------- |
| `HUOSHAN_EMBEDDING_API_KEY` | 火山方舟 Embedding API Key      | 复用 `HUOSHAN_MODEL_API_KEY` |
| `HUOSHAN_EMBEDDING_MODEL`   | Embedding 模型名               | 默认 `doubao-embdding`       |
| `HUOSHAN_MODEL_API_KEY`     | 火山方舟 Chat/Responses API Key | 已有                         |
| `HUOSHAN_MODEL_ID`          | Doubao 模型 Endpoint ID       | 已有                         |

