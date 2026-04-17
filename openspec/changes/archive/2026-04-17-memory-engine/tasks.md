# 个人记忆引擎 · 任务清单

> 本次迭代为 **Phase 1（V1）**，目标：完成向量化 + Core Memory 合并更新的核心链路，对话向量检索上下文注入可在 `ai-chat-old-friend` 已基础上扩展。

---

## 阶段一：基础设施（Foundation）

### 1.1 数据库 Migration

- [x] **1.1.1** 启用 pgvector 扩展：在 Supabase SQL Editor 执行 `CREATE EXTENSION IF NOT EXISTS vector;`（若尚未执行）✅
- [x] **1.1.2** 修改 `prisma/schema.prisma`：新增 `DiaryChunk` 模型以存储切块及其向量（`Unsupported("vector(1024)")`），并移除 `DiaryEntry.embedding` 字段，同时新增 `vectorized` 标记字段 
- [x] **1.1.3** 执行 `pnpm prisma db push` 同步 Schema 到 Supabase ✅
- [x] **1.1.4** 执行 `pnpm prisma generate` 更新 Prisma Client ✅

### 1.2 类型定义

- [x] **1.2.1** 新建 `src/app/types/core-memory.ts`：定义 `CoreMemory` 接口、`CORE_MEMORY_CAPACITY` 常量、`INITIAL_CORE_MEMORY` 空结构 ✅

---

## 阶段二：Embedding 服务（Embedding Service）

### 2.1 Doubao Embedding API 封装

- [x] **2.1.1** 新建 `src/lib/embedding/create.ts`（合并原 `doubao.ts` + `diary.ts` + `chunk.ts`）：`createEmbedding(text)` 和 `createEmbeddings(texts[])` 函数，调用火山方舟 Embedding API ✅
- [x] **2.1.2** 添加类型定义 `DoubaoEmbeddingResponse`、`EmbeddingResult` ✅
- [x] **2.1.3** 添加错误处理：API Key 未配置、响应异常、network error ✅
- [x] **2.1.4** 编写单元测试：`createEmbedding` mock 外部 fetch，验证请求参数与响应解析 ✅

### 2.2 日记分块策略

- [x] **2.2.1** `chunkText(text)` 函数已内联到 `create.ts` 中，实现按段落边界的 **1000 字符**分块 ✅
- [x] **2.2.2** 编写单元测试： ✅
  - 文本 < 1000 字符 → 返回单块 ✅
  - 文本 > 1000 字符 → 返回多块，段落边界对齐 ✅
  - 单段落超长 → 强制硬切（剩余字符继续处理，不丢弃）✅

### 2.3 向量存取

- [x] **2.3.1** `vectorizeDiaryEntry(entryId, content)` 已内联到 `create.ts`，实现分块 → 调用 Embedding → 存入 pgvector ✅
- [x] **2.3.2** 移除 `JSONB` 存储逻辑，使用 `prisma.$executeRaw` 存入 `DiaryChunk` 的 `vector(1024)` 列 ✅
- [x] **2.3.3** 实现 Embedding API 自动重试机制与数据补偿标记（`vectorized = true`） ✅
- [x] **2.3.4** 提供用于数据补偿修复的脚本 `scripts/compensate-vectors.ts` ✅

### 2.4 向量检索

- [x] **2.4.1** 更新 `src/lib/embedding/search.ts`：实现 `searchRelatedChunks(userId, query, limit=5)` 用于 Chum 对话上下文注入
- [x] **2.4.2** 更新 `src/lib/embedding/search.ts`：修改 `searchRelatedDiaries(userId, query, limit=5)` 返回完整的日记（包含去重逻辑）
- [x] **2.4.3** 搜索范围严格限定为当前用户（`WHERE db."userId" = $userId`）✅
- [x] **2.4.4** 实现降级逻辑：向量检索失败时降级为 `ILIKE` 全文搜索，按 `updatedAt` 倒序 ✅
- [x] **2.4.5** 编写单元测试：更新检索逻辑的 mock 测试

---

## 阶段三：Core Memory 服务（Core Memory Service）

### 3.1 Memory 合并逻辑

- [x] **3.1.1** 新建 `src/lib/memory/merge.ts`：`mergeCoreMemory(current, increment)` 函数，实现 RFC 7396 JSON Merge Patch 合并 ✅
- [x] **3.1.2** 实现数组字段追加 + 容量裁剪逻辑 ✅
- [x] **3.1.3** 编写单元测试： ✅
  - `relationships` 数组追加 ✅
  - `identity` 标量字段覆盖 ✅
  - 超出容量时裁剪最旧条目 ✅
  - `increment.version` 存在时触发版本检测（可 mock 旧版本数据）✅

### 3.2 Memory 格式化

- [x] **3.2.1** 新建 `src/lib/memory/format.ts`：`formatCoreMemoryForPrompt(memory)` 函数，将 CoreMemory JSON 转为可读 prompt 文本 ✅
- [x] **3.2.2** 编写单元测试：验证各字段正确格式化 ✅

### 3.3 Memory 读取

- [x] **3.3.1** 新建 `src/lib/memory/store.ts`：`getCoreMemory(userId)` 函数，从 `User.coreMemory` 字段读取并类型转换 ✅

### 3.4 LLM 提炼 Prompt

- [x] **3.4.1** 新建 `src/lib/memory/prompt.ts`：`buildMemoryExtractionPrompt(currentMemory, diaryContent)` 函数 ✅
- [x] **3.4.2** Prompt 中包含 CoreMemory JSON Schema、提炼要求、JSON 返回格式说明 ✅

### 3.5 异步 Memory 更新任务

- [x] **3.5.1** 新建 `src/lib/memory/update.ts`：`updateCoreMemoryFromDiary(userId, diaryContent)` 函数 ✅
- [x] **3.5.2** 逻辑：读取当前 memory → 调用 LLM 提炼 → JSON Merge Patch 合并 → 写回数据库 ✅
- [x] **3.5.3** 静默错误处理：异常捕获后 `console.error` 记录，不向调用方抛出 ✅
- [x] **3.5.4** 编写单元测试：mock Prisma + mock LLM API，验证 LLM 调用与数据库更新 ✅

---

## 阶段四：日记保存流程改造（Diary Save Flow）

### 4.1 createEntry 与 updateEntry 改造

- [x] **4.1.1** 修改 `src/app/actions/diary.ts` 的 `createEntry` 函数 ✅
- [x] **4.1.2** 日记保存成功后，从 `bookId` 关联查询 `userId` ✅
- [x] **4.1.3** 使用 `after()` 触发异步任务：`vectorizeDiaryEntry` + `updateCoreMemoryFromDiary` ✅
- [x] **4.1.4** 修改 `updateEntry` 函数，当修改了正文内容时重置 `vectorized` 并重新触发异步任务 ✅
- [x] **4.1.5** 备选方案：若 `after()` 不可用，实现 `sendBeacon` / API route 方案作为 fallback (已确认 Next.js 15.3 `after` 可用，跳过 fallback)
- [x] **4.1.6** 编写集成测试：mock `after`，验证异步任务在 diary 保存成功后被触发

---

## 阶段五：对话上下文注入（Chat Context Injection）

> **前提**：`ai-chat-old-friend` 功能已上线。本阶段在其基础上扩展向量检索上下文注入。

### 5.1 Core Memory 前缀注入

- [x] **5.1.1** 修改 `POST /api/chat` 首次请求处理逻辑 ✅
- [x] **5.1.2** 在发送首次请求前，先调用 `getCoreMemory(userId)` 获取 Core Memory ✅
- [x] **5.1.3** 将 Core Memory 格式化文本作为 system prompt 的**前缀**（在人设「你是一位温暖的魔法日记伴侣」之前）✅

### 5.2 向量检索上下文注入

- [x] **5.2.1** 在 `POST /api/chat` 用户消息处理逻辑中，在调用火山方舟 API **之前**：调用 `searchRelatedDiaries(userId, input, 5)` 获取 5 篇相关日记 ✅
- [x] **5.2.2** 实现 `formatDiaryContextForPrompt` 工具函数（将日记格式化为 `【日期】标题：内容摘要` 片段）✅
- [x] **5.2.3** **每轮用户消息都执行向量检索**（首次请求注入 Core Memory 一次，后续请求不重复注入，仅注入向量检索结果）✅
- [x] **5.2.4** 编写集成测试：mock `searchRelatedDiaries`，mock 火山方舟 API，验证检索到的日记被正确注入到每次请求中

---

## 阶段六：端到端验收（E2E Verification）

- [x] **6.1** 使用 Playwright 编写 E2E 测试：
  - 保存新日记 → 验证日记列表出现 → 验证后台无报错
  - 打开「老朋友 Chum」对话框 → 发送涉及日记内容的问题 → 验证 AI 回复中体现了相关日记上下文
- [x] **6.2** 手动验证场景：
  - 日记超过 1000 字符 → 验证向量分块存储
  - 无 Core Memory 用户首次保存日记 → 验证 Core Memory 自动初始化
  - 向量检索失败 → 验证降级为全文搜索

---

## 任务依赖关系

```
1.1 数据库 Migration
    ↓
1.2 类型定义
    ↓
2.1 Doubao Embedding API 封装 ──→ 2.3 向量存取 ──→ 4.1 createEntry 改造
                    │                                              ↑
2.2 日记分块 ───────────────────→ 2.4 向量检索 ──→ 5.2 向量上下文注入
                                                          ↑
3.1 Memory 合并逻辑 ←── 3.4 LLM 提炼 Prompt ←── 3.5 异步 Memory 更新
    ↑
3.2 Memory 格式化 ←── 3.3 Memory 读取 ←── 5.1 Core Memory 前缀注入
```

---

## 进度核对清单

- [x] 阶段一完成（数据库就绪）✅
- [x] 阶段二完成（Embedding 服务就绪）✅
- [x] 阶段三完成（Core Memory 服务就绪）✅
- [x] 阶段四完成（日记保存流程改造完成）✅
- [x] 阶段五完成（对话向量检索上下文注入完成）✅
- [x] 阶段六完成（E2E 验证通过）✅
