# 日记数据后端持久化 · 技术设计

## 技术选型

沿用项目栈：Next.js 15 App Router + Prisma + PostgreSQL。日记与日记本数据通过 **Server Actions** 与后端交互，Prisma 负责 ORM 层。图片存储使用 **Supabase Storage**。

**选 Server Actions 的原因**：与 Next.js 深度集成，无需单独维护 API 路由；类型安全；表单场景天然支持。若需对外暴露或第三方调用，可再封装为 API Route。

**选 Supabase Storage 的原因**：与 Supabase 生态集成；支持公开/私有 bucket；提供预签名 URL；按需付费，适合 side project。

---

## 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│  Next.js App Router (Client Components)                          │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Zustand Store (useDiaryStore)                                │ │
│  │  - loadData() → 调用 Server Action / fetch API 拉取数据       │ │
│  │  - saveEntry / updateEntry / deleteEntry → 调用 Server Action │ │
│  │  - addBook / deleteBook → 调用 Server Action                  │ │
│  └────────────────────────────┬────────────────────────────────┘ │
└───────────────────────────────┼──────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Server Actions (src/app/actions/diary.ts)                         │
│  - getDiaryData(userId) → { books, entries }                      │
│  - createEntry(userId, entry)                                     │
│  - updateEntry(userId, entryId, updates)                          │
│  - deleteEntry(userId, entryId)                                   │
│  - createBook(userId, book)                                       │
│  - deleteBook(userId, bookId)                                     │
│  每个 Action 内部：auth() 校验 session，再调用 Prisma              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Prisma + PostgreSQL                                              │
│  - DiaryBook：id, userId, name, color, type, createdAt, updatedAt  │
│  - DiaryEntry：id, bookId, title?, content, date, tags, imageUrls│
│  - 外键：DiaryBook.userId → User.id；DiaryEntry.bookId → DiaryBook.id │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ 图片 URL 指向
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Supabase Storage                                                 │
│  - Bucket：diary-images（或按 userId 隔离）                         │
│  - 上传：base64/File → 生成 URL；返回 URL 存入 DiaryEntry.imageUrls │
└─────────────────────────────────────────────────────────────────┘
```

---

## 数据模型（Prisma）

```prisma
model DiaryBook {
  id        String      @id @default(cuid())
  userId    String
  name      String
  color     String?
  type      String?
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  user   User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  entries DiaryEntry[]

  @@index([userId])
}

model DiaryEntry {
  id         String   @id @default(cuid())
  bookId     String
  title      String?  // 非必填，可为空
  content    String
  date       DateTime
  tags       String[] // 非必填，可为空数组
  imageUrls  String[] // Supabase Storage 返回的 URL 数组
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  book DiaryBook @relation(fields: [bookId], references: [id], onDelete: Cascade)

  @@index([bookId])
}
```

**User 模型补充**：

```prisma
model User {
  // ... 现有字段
  books DiaryBook[]
}
```

**设计说明**：
- `onDelete: Cascade`：删除 User 时级联删除其日记本；删除 DiaryBook 时级联删除其日记
- `title String?`：标题非必填，可为空
- `imageUrls String[]`：存储 Supabase Storage 返回的图片 URL，不存 base64
- `tags String[]`：标签非必填，可为空数组

---

## API 设计（Server Actions）

| Action | 签名 | 说明 |
|--------|------|------|
| `getDiaryData()` | `Promise<{ books: DiaryBook[]; entries: DiaryEntry[] }>` | 获取当前用户全部日记本与日记；未登录抛错 |
| `createEntry(entry)` | `Promise<DiaryEntry>` | 创建日记；`entry` 不含 id，由服务端生成；content 必填；title、tags 可选；bookId 缺省时取第一个日记本；date 缺省时为当日 |
| `updateEntry(id, updates)` | `Promise<DiaryEntry>` | 更新日记；校验归属 |
| `deleteEntry(id)` | `Promise<void>` | 删除日记；校验归属 |
| `createBook(book)` | `Promise<DiaryBook>` | 创建日记本；`book` 不含 id |
| `deleteBook(bookId)` | `Promise<void>` | 删除日记本及其下所有日记；校验归属 |

**鉴权**：每个 Action 内部调用 `auth()`，无 session 则 `throw` 或返回 `{ error: 'Unauthorized' }`；有 session 则从 `session.user.id` 取 `userId`，所有 Prisma 查询均带 `userId` 或通过 `book.userId` 校验。

---

## 前端改造

### 1. Store 改造（`src/app/store.ts`）

- **移除**：localStorage、IndexedDB 读写逻辑；`idb-keyval` 依赖
- **保留**：Zustand 状态结构（`books`, `entries`, `isLoaded`）及类型定义
- **loadData**：调用 `getDiaryData()` Server Action，成功后 `setState`
- **saveEntry / addEntry / updateEntry / deleteEntry**：调用对应 Server Action，成功后更新本地 state（或重新 `loadData` 以保持一致性）
- **addBook / deleteBook**：同上

### 2. 调用方式

Server Actions 可从客户端直接 `import` 并调用：

```ts
'use client';
import { getDiaryData, createEntry } from '@/app/actions/diary';

// 在 loadData 中
const data = await getDiaryData();
setState({ books: data.books, entries: data.entries, isLoaded: true });
```

### 3. 错误处理

- 网络/服务端错误：在 Action 中返回 `{ error: string }` 或 `throw`，前端用 try/catch 或检查返回值，展示 toast 或内联错误
- 未登录：Action 内 `auth()` 为 null 时，可重定向至 `/login` 或返回错误，由前端统一处理

---

## 图片存储（Supabase Storage）

### 流程
1. **上传**：用户选择图片后，前端或 Server Action 将 base64/File 上传至 Supabase Storage
2. **路径**：建议 `{userId}/{entryId}/{filename}` 或 `{userId}/{timestamp}-{filename}`，便于按用户隔离
3. **存储**：上传成功后获得公开 URL 或预签名 URL，将 URL 存入 `DiaryEntry.imageUrls`
4. **删除**：删除日记时，可同步删除 Storage 中对应文件（可选，或依赖 Storage 生命周期策略）

### 环境变量
- `NEXT_PUBLIC_SUPABASE_URL`：Supabase 项目 URL
- `SUPABASE_SERVICE_ROLE_KEY`：服务端上传用（或使用 RLS + 用户 token）

### 依赖
- `@supabase/supabase-js`：Supabase 客户端

---

## 文件结构

```
src/
├── app/
│   ├── actions/
│   │   └── diary.ts          # Server Actions：getDiaryData, createEntry, ...
│   └── store.ts              # Zustand store，改为调用 Actions
├── lib/
│   └── supabase/
│       └── storage.ts        # 图片上传至 Supabase Storage 的封装
prisma/
└── schema.prisma             # 新增 DiaryBook、DiaryEntry，User 补充 relation
```

---

## 环境变量

| 变量 | 说明 |
|------|------|
| `DATABASE_URL`、`DIRECT_URL` | Prisma 迁移与连接（沿用现有） |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务端上传图片用（或 RLS + 用户 token） |

---

## 测试策略

| 层级 | 工具 | 覆盖 |
|------|------|------|
| 集成 | Vitest + Supertest 或直接测 Server Action | getDiaryData 返回当前用户数据；createEntry 创建成功；未登录时抛错 |
| E2E | Playwright | 登录后创建日记、创建日记本、删除日记本，刷新后数据仍在 |

每个 spec Scenario 对应至少一个测试用例。
