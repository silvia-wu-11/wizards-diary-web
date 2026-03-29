# 个人记忆引擎 · 行为规格

## Purpose

为每个用户提供一个长期存储的 **Core Memory（记忆内核）**，在用户写日记时异步地将日记向量化存入向量数据库、并从中提炼关键信息合并入 Core Memory；在与「老朋友 Chum」对话时，先加载 Core Memory，再从向量数据库中检索相关性最高的最近 5 篇日记作为上下文注入，以实现高度个人化的 AI 对话体验。

## Memory Kernel JSON Schema

Core Memory 以 JSON 格式存储在 PostgreSQL `User.coreMemory` 字段中：

```json
{
  "version": "1.0",
  "identity": {
    "name": "",
    "nickname": "",
    "occupation": "",
    "location": ""
  },
  "relationships": [],
  "life_facts": [],
  "preferences": {
    "likes": [],
    "dislikes": [],
    "hobbies": [],
    "dietary": [],
    "communication_style": ""
  },
  "goals": {
    "short_term": [],
    "long_term": []
  },
  "emotional_context": {
    "recent_mood_trend": "",
    "significant_events": []
  },
  "memory_anchors": []
}
```

**字段容量约束**（防止 JSON 膨胀）：

| 字段 | 最大条目数 |
|------|-----------|
| `relationships` | 20 |
| `life_facts` | 50 |
| `preferences.likes / dislikes / hobbies / dietary` | 各 10 |
| `goals.short_term / long_term` | 各 10 |
| `emotional_context.significant_events` | 20 |
| `memory_anchors` | 30 |

**`version` 字段作用**：未来若 JSON Schema 升级（如 1.0 → 2.0），代码可依据 `version` 检测旧格式数据，先执行迁移逻辑再合并新数据，避免字段丢失（类似数据库 Migration）。

---

## Requirements

### Requirement: 用户保存新日记时，日记内容同步存入数据库后立即返回成功

系统 SHALL 在用户点击「保存日记」后，先将日记内容同步写入 PostgreSQL（DiaryEntry），写入成功后**立即**返回 200 OK 给前端，页面提示「保存成功」。

#### Scenario: 用户保存一篇新日记
- GIVEN 用户已登录且有一个日记本
- WHEN 用户提交日记内容（content 必填，title/tags/date 可选）
- THEN 系统将日记同步写入 `DiaryEntry` 表
- AND 系统立即返回 200 OK
- AND 前端显示「保存成功」提示

#### Scenario: 保存日记时内容为空
- GIVEN 用户已登录
- WHEN 用户提交空内容（content 为空）
- THEN 系统拒绝保存
- AND 返回「内容不能为空」错误提示

---

### Requirement: 日记保存成功后，异步完成向量化和 Core Memory 更新

系统 SHALL 在日记保存成功返回后，在后台异步执行以下两项任务：

1. **向量化和存储**：调用 Doubao Embedding API 将日记内容（根据长度决定是否分块）转为向量，存入专门的 `DiaryChunk` 表中（保存对应的 chunkIndex、内容文本和向量），并更新 `DiaryEntry.vectorized = true`。包含失败重试机制。
2. **Core Memory 合并更新**：调用 LLM 从日记中提炼核心信息，合并更新到用户的 `User.coreMemory` JSON 字段中。

> **补充规则（更新日记）**：当用户修改已有日记时，系统 SHALL 检查 `content`（正文）是否发生变更。如果发生变更，系统需将 `DiaryEntry.vectorized` 状态重置为 `false`，并在保存成功后，再次触发上述异步的向量化（清理旧 Chunk，生成新 Chunk）和 Core Memory 提炼任务。如果仅修改标题、日期、标签等非正文内容，则不触发重新向量化。

#### Scenario: 日记保存后，异步完成向量化和记忆合并
- GIVEN 用户刚保存一篇日记，日记已写入 `DiaryEntry`
- WHEN 后台异步任务开始执行
- THEN 系统调用 Doubao Embedding API 生成日记文本向量
- AND 系统将文本块和向量作为新记录存入 `DiaryChunk` 表
- AND 系统将日记的 `vectorized` 标记更新为 `true`
- AND 系统调用 LLM 提炼日记中的核心信息
- AND 系统将提炼结果合并更新到该用户的 `coreMemory` 字段（JSON Merge Patch）

#### Scenario: 日记内容更新时，触发重新向量化和记忆合并
- GIVEN 用户修改了一篇已有的日记
- AND 修改的内容包含了正文（`content`）的变更
- WHEN 用户提交保存
- THEN 系统将日记的 `vectorized` 标记重置为 `false`
- AND 系统立即返回 200 OK
- AND 后台异步触发重新生成向量任务（清理旧的 `DiaryChunk` 记录，插入新的）
- AND 后台异步触发 Core Memory 的提炼更新任务

#### Scenario: 仅修改非正文内容时，不触发重新向量化
- GIVEN 用户修改了一篇已有的日记
- AND 仅修改了标题（`title`）或标签（`tags`），未修改正文（`content`）
- WHEN 用户提交保存
- THEN 系统的 `vectorized` 标记保持原状
- AND 不会触发后台的向量化和 Core Memory 更新任务

#### Scenario: 日记内容超过 1000 字符时，先分块再向量化
- GIVEN 用户保存一篇超过 1000 字符的日记
- WHEN 异步向量化任务开始
- THEN 系统将日记按约 1000 字符为单位分块（段落边界对齐）
- AND 对每块调用 Doubao Embedding API 生成向量
- AND 将每块文本及其向量作为一条独立的记录存入 `DiaryChunk` 表
- AND 最终更新该日记的 `vectorized` 状态为 `true`

#### Scenario: 向量化请求失败时的重试与降级
- GIVEN 用户保存了一篇日记，触发后台向量化任务
- WHEN 调用 Doubao Embedding API 遇到网络超时或错误
- THEN 系统 SHALL 自动进行指数退避重试（最多 3 次）
- AND 如果最终仍失败，系统保持该日记 `vectorized = false`（便于后续补偿脚本修复），仅输出错误日志，不影响日记的其他功能使用

#### Scenario: 异步任务失败时，不阻塞前端、不回滚日记
- GIVEN 日记已同步保存成功并返回前端
- WHEN 后台异步向量化或记忆合并任务执行失败
- THEN 系统记录错误日志
- AND 不回滚已保存的日记
- AND 不向用户展示错误（静默失败，前端已收到成功响应）

---

### Requirement: 与「老朋友 Chum」对话打开时，先加载 Core Memory 作为系统提示词前缀

系统 SHALL 在用户打开「老朋友 Chum」对话框时，先从数据库加载该用户的 `coreMemory`，将其格式化为 system prompt 的**前缀**（在老朋友人设提示词之前），再发送首次请求。

后续每轮对话中，火山方舟 Responses API 已缓存首次请求传入的 system prompt（含 Core Memory），因此**无需在每轮请求中重新注入 Core Memory**，但每轮用户消息都需要执行向量检索注入相关日记上下文。

#### Scenario: 对话框打开时，Core Memory 注入 system prompt 前缀
- GIVEN 用户点击「老朋友 Chum」按钮
- WHEN 对话框展开
- THEN 系统从数据库加载该用户的 `coreMemory` JSON
- AND 系统将 `coreMemory` 格式化为文本描述（如「用户叫小明，喜欢阅读和旅行...」）
- AND 系统将其作为 system prompt 的**第一段**（在人设提示词之前）
- AND 系统发送首次请求至火山方舟 API

#### Scenario: 用户无 Core Memory 时，使用默认 system prompt
- GIVEN 用户首次使用（coreMemory 为空或 null）
- WHEN 对话框打开
- THEN 系统跳过 Core Memory 前缀注入
- AND 系统仅使用默认的老朋友人设提示词发送首次请求

#### Scenario: 后续对话不重复注入 Core Memory，但继续注入向量检索日记
- GIVEN 用户已打开对话框并完成至少一次对话
- AND 火山方舟 Responses API 已缓存首次请求的 system prompt
- WHEN 用户发送第二条消息
- THEN 系统**不**在请求中再次注入 Core Memory（由方舟缓存实现）
- AND 系统执行向量检索，获取与用户消息最相关的 5 篇日记
- AND 将相关日记注入上下文后发送请求

---

### Requirement: 用户发送后续消息时，从向量数据库检索相关性最高的日记切块（Chunk）注入上下文

系统 SHALL 在用户每次发送**非首次**消息时，先从向量数据库中检索与用户消息**语义最相似**的日记切块（Chunk），将这些切块所属日记的 title、date 及其自身的 content 作为上下文注入请求，再调用大模型。
**第一次请求（初始化请求）** 不进行向量检索，仅依赖 Core Memory。

注：如果是日记列表搜索功能，则要求返回包含这些匹配切块的**完整**日记（`DiaryEntry`），而不是单一切块。

向量检索的排序策略为：**以余弦相似度为主排序因素，相关系数相近的条目再参考日记更新时间倒序**，确保既语义相关、又时效性强的日记优先召回。

日记检索范围**严格限定为当前用户自己写的日记**（通过 DiaryChunk → DiaryEntry → DiaryBook → User 关联过滤）。

#### Scenario: 第一次打开对话框（初始化请求）时，不执行向量检索
- GIVEN 用户已打开「老朋友 Chum」对话框
- WHEN 对话框自动发送首次初始化请求（无 previous_response_id）
- THEN 系统不调用 Embedding API
- AND 系统不执行向量检索
- AND 系统仅注入 Core Memory 到 system prompt

#### Scenario: 用户发送后续消息时，向量检索相关日记切块
- GIVEN 用户已打开「老朋友 Chum」对话框且完成首次初始化
- AND 用户输入「我最近感觉压力很大」并发送（携带 previous_response_id）
- WHEN 系统开始处理请求
- THEN 系统将用户消息转为向量（调用 Doubao Embedding API）
- AND 系统在 pgvector 中执行余弦相似度搜索
- AND 搜索范围限定为当前用户的日记（通过 entryId → bookId 关联 userId）
- AND 系统将检索到的最相关切块（所属日记 title、切块 content、date）格式化后与用户消息拼接作为输入
- AND 系统调用火山方舟 API

#### Scenario: 检索结果少于 5 篇时，返回全部可用结果
- GIVEN 用户发送消息，向量检索执行
- AND 该用户日记总数少于 5 篇
- WHEN 检索完成
- THEN 系统返回全部可用日记（少于 5 篇）
- AND 不需要填充空结果

#### Scenario: 向量检索失败时，降级为全文搜索
- GIVEN 用户发送消息，向量检索执行
- WHEN pgvector 检索失败或 embedding 服务不可用
- THEN 系统降级为基于关键词的全文搜索（在 `title` 和 `content` 上 `ILIKE` 搜索）
- AND 搜索结果同样取最多 5 篇，按创建时间倒序

---

### Requirement: Core Memory 使用 JSON Merge Patch 策略进行合并更新

系统 SHALL 在 Core Memory 更新时，采用 **JSON Merge Patch**（RFC 7396）策略：将 LLM 生成的增量 JSON 与现有 Core Memory 合并，**追加而非覆写**数组字段，防止灾难性遗忘。

#### Scenario: 增量 JSON 追加到现有 Core Memory
- GIVEN 用户 coreMemory 中 `relationships` 已有 3 条记录：`[{name: "小红", relation: "闺蜜", description: "..."}]`
- AND LLM 从新日记中提炼出 `relationships` 增量：`[{name: "老师李", relation: "恩师", description: "..."}]`
- WHEN 系统执行 JSON Merge Patch
- THEN 合并后 `relationships` 字段包含 4 条记录（原有 + 增量）
- AND `identity`、`` 等标量字段以增量中的新值覆盖旧值

#### Scenario: 字段容量超限时，裁剪最旧条目
- GIVEN `relationships` 已有 20 条记录（已达上限）
- AND LLM 返回 2 条新关系
- WHEN 系统执行合并
- THEN 系统保留最近的 20 条（原有中按某个标识符排序取最新）
- AND 丢弃最旧的条目以维持容量约束

---

### Requirement: 新用户首次保存日记时，自动初始化空 Core Memory

系统 SHALL 在用户**首次保存日记时**，若检测到 `coreMemory` 为 null，自动初始化为一个含 `version: "1.0"` 的空结构 JSON，再执行异步任务。

#### Scenario: 新用户首次保存日记，Core Memory 自动初始化
- GIVEN 用户 A 首次保存日记（coreMemory 为 null）
- WHEN 日记保存成功触发异步任务
- THEN 系统先将 `User.coreMemory` 初始化为 `{"version": "1.0", "identity": {}, "relationships": [], ...}`
- AND 再执行向量化和 Core Memory 更新逻辑

---

## 实现入口

本规格的实现由 OpenSpec 变更驱动，详见：

- [openspec/changes/memory-engine/](../../changes/memory-engine/) — proposal、design、tasks

---

## 技术依赖

- **行为规格**：`openspec/specs/ai-chat/spec.md`（现有老朋友对话规格，本规格在其基础上增加向量检索上下文注入）
- **向量数据库**：Supabase PostgreSQL + pgvector 扩展（`Jsonb` 列存储多块向量 JSON 数组，1024 维，Doubao embedding 一致）
- **Embedding API**：火山引擎 Doubao Embedding API（`doubao-embdding` 模型，1024 维，API Key 鉴权）
- **Async 机制**：Next.js `after()` 函数（或 Server Action 队列化）执行后台任务
- **JSON Merge Patch**：可使用 `fast-json-patch` 库或手动实现 RFC 7396 Merge Patch
