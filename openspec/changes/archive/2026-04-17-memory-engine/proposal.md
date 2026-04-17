# 个人记忆引擎 · 变更提案

## 变更 ID

`memory-engine`

## 目标

为「魔法日记本」建设基于历史日记的**个人记忆引擎**：

1. **Core Memory（记忆内核）**：每个用户一个 JSON 格式的长期记忆，存储身份、关系、生活事实、偏好、目标、情绪上下文等，经由每次写日记时 LLM 提炼合并更新。
2. **日记向量化**：用户保存日记时，将日记内容（根据长度决定是否分块）调用 Doubao Embedding API 转为 1024 维向量，存入 Supabase PostgreSQL pgvector。
3. **RAG 对话上下文**：与「老朋友 Chum」对话时，加载 Core Memory 作为 system prompt 前缀，再从向量数据库检索相关性最高的最近 5 篇日记作为上下文注入，实现高度个性化的 AI 对话。

## 背景

当前「老朋友 Chum」对话功能的上下文依赖首页筛选条件或日记本内页的全部日记，无法语义检索历史记忆。用户问「我去年夏天那次旅行怎么样」，系统无法从语义层面找到相关内容。

通过引入 **向量数据库 + Core Memory** 两层记忆机制：
- **Core Memory**：长期、提炼的结构化记忆，每次日记保存时增量合并（JSON Merge Patch），不覆盖
- **向量检索**：将所有日记原文向量化，通过语义相似度召回历史上下文

**技术基础**：
- Supabase PostgreSQL 已开启 pgvector 扩展（`JSONB` 存储多块向量数组）
- 项目已有 Doubao（火山方舟）Embedding API 集成能力
- `createEntry` Server Action 支持修改，扩展异步任务
- 现有 `OldFriendChatDrawer` 组件可扩展 system prompt 注入逻辑

## 范围

### 本次实现

**1. 数据模型变更（Prisma）**
- `User` 模型：新增 `coreMemory`（Json）字段，默认 `null`
- `DiaryEntry` 模型：新增 `vectorized`（Boolean）字段，默认 `false`，用于标记该日记是否已成功向量化
- 新增 `DiaryChunk` 模型：一对多关联 `DiaryEntry`，包含 `chunkIndex`、`content` 和 `embedding`（`Unsupported("vector(1024)")`）字段，用于存储日记切块及其向量

**2. 日记保存与更新快慢路径**
- 快路径（同步）：现有 `createEntry` 和 `updateEntry` 逻辑，日记写入 PostgreSQL → 立即返回 200 OK
- 慢路径（异步）：日记保存（或正文更新）成功后，触发后台任务：
  - 调用 Doubao Embedding API 生成向量，将文本块及其对应的向量存入 `DiaryChunk` 表（更新时先清理旧 Chunk）
  - 调用 LLM 提炼日记核心信息，JSON Merge Patch 更新 `User.coreMemory`

**3. Doubao Embedding 集成**
- 模型：`doubao-embdding`，向量维度 1024，存在 `DiaryChunk` 表中
- API：火山方舟 Embedding API（`POST https://ark.cn-beijing.volces.com/api/v3/embeddings`）
- 分块策略：单篇日记超过 1000 字符时，按段落边界分块，每块分别向量化并落表
- 高可用兜底机制：
  - 自动重试：调用 Embedding API 失败时，引入指数退避重试（最多 3 次），抵抗网络抖动
  - 数据补偿标记：只有在所有分块成功插入 `DiaryChunk` 后，才将 `DiaryEntry.vectorized` 设为 `true`。后续可基于此字段做数据修补（Cron/Admin API）

**4. Core Memory 合并更新**
- LLM 提炼：使用火山方舟 Responses API（已有集成），system prompt 中说明 Core Memory JSON Schema，要求返回符合 Schema 的增量 JSON
- 合并策略：JSON Merge Patch（RFC 7396），数组字段追加，标量字段覆盖
- 容量约束：各数组字段有最大容量限制，超出时裁剪最旧条目
- Version 字段：`version` 字段用于未来 Schema 升级时检测旧格式并迁移

**5. 向量检索 RAG**
- 用户发送消息时，将用户消息向量化
- 在 pgvector 中执行余弦相似度搜索（对 `DiaryChunk.embedding` 执行 `ORDER BY embedding <=> $vector LIMIT 5`）
- 搜索范围限定当前用户（通过 DiaryChunk → DiaryEntry → DiaryBook → User 关联）
- 两种使用场景：
  - **Chum 对话 RAG**：返回最相关的 5 个 Chunk 文本（精准注入，节省 Token）
  - **日记列表搜索**：返回包含匹配 Chunk 的完整 DiaryEntry 列表
- 降级策略：向量检索失败时，降级为基于 `title`/`content` 的全文 `ILIKE` 搜索

**6. 对话上下文注入扩展**
- 首次打开对话框：Core Memory 格式化文本作为 system prompt 前缀
- 用户发送消息：向量检索 5 篇相关日记，格式化后作为上下文

### 不在此次范围

- Core Memory 的主动巩固（MemGPT 式定期回顾）——未来迭代
- 删除日记时的向量清理（软删除即可，向量可保留）
- Core Memory 的手动编辑界面

## 架构概览

```
用户保存日记
     │
     ▼
┌──────────────────────────────────────────────┐
│  createEntry Server Action                    │
│  ① 同步：写入 DiaryEntry（content, date...） │
│  ② 立即返回 200 OK + DiaryEntryDto           │
│  ③ 触发 after() 异步后台任务                 │
└──────────────────────────────────────────────┘
     │
     ▼异步
┌──────────────────────────────────────────────┐
│  后台任务                                      │
│  ┌────────────────┐  ┌─────────────────────┐ │
│  │ Doubao Embedding│→│ 存入 DiaryEntry.    │ │
│  │ API（分块）     │  │ embedding 字段      │ │
│  └────────────────┘  └─────────────────────┘ │
│  ┌────────────────┐  ┌─────────────────────┐ │
│  │ LLM 提炼核心信息 │→│ JSON Merge Patch    │ │
│  │（火山方舟API）  │  │ 更新 User.coreMemory│ │
│  └────────────────┘  └─────────────────────┘ │
└──────────────────────────────────────────────┘

用户打开「老朋友 Chum」对话框
     │
     ▼
┌──────────────────────────────────────────────┐
│  Core Memory JSON ← PostgreSQL User 表       │
│  格式化为 prompt 前缀文本                      │
└──────────────────────────────────────────────┘
     │
     ▼
  火山方舟 API（首次请求，人设+CoreMemory前缀）

用户发送消息
     │
     ▼
┌──────────────────────────────────────────────┐
│  用户消息 → Doubao Embedding API → 向量       │
│  pgvector 余弦相似度搜索（当前用户日记，K=5） │
│  → 5 篇相关日记（title/content/date/tags）   │
└──────────────────────────────────────────────┘
     │
     ▼
  火山方舟 API（CoreMemory前缀+人设+5篇日记+用户消息）
```

## 依赖

- 行为规格：`openspec/specs/memory-engine/spec.md`（本目录下新建）
- 行为规格：`openspec/specs/ai-chat/spec.md`（现有老朋友对话规格，检索到的日记上下文注入方式需对齐）
- 技术设计：见本 change 的 `design.md`
- 前置依赖：`diary-backend-persistence`（已上线，日记数据可写）和 `ai-chat-old-friend`（已上线，有火山方舟 API 集成）

## 环境变量

- `HUOSHAN_EMBEDDING_API_KEY`：火山方舟 Embedding API Key（与 `HUOSHAN_MODEL_API_KEY` 相同，可复用）
- `HUOSHAN_EMBEDDING_MODEL`：Embedding 模型名，默认为 `doubao-embdding`

## 协作约定

- 实现前先阅读 `spec.md` 与 `design.md`
- 按 TDD：先写测试（对应 spec 中的 Scenario），再实现直到通过
- 若实现中发现需求/设计需调整，优先更新 spec/design，再改代码
