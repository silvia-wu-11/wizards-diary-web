# 基于日记数据的 AI 对话（老朋友）· 技术设计

## 技术选型

- **API 调用**：火山方舟（Volcengine Ark）Chat Completions API
- **URL**：`https://ark.cn-beijing.volces.com/api/v3/chat/completions`
- **鉴权**：`Authorization: Bearer {HUOSHAN_MODEL_API_KEY}`
- **模型**：通过 Endpoint ID 指定，环境变量 `HUOSHAN_MODEL_ID`
- **流式**：`stream: true`，响应为 SSE 格式，前端逐字展示

**选火山方舟的原因**：国内服务、延迟低；兼容 OpenAI 格式；支持流式输出，提升对话体验。

---

## 架构概览

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  前端：Dashboard / DiaryView                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  [老朋友] 按钮（首页：拟人形象 | 日记本：ActionButton）                         ││
│  │       ↓ 点击                                                                  ││
│  │  OldFriendChatDrawer（抽屉/浮层）                                             ││
│  │  - 前置上下文：filters + entries（从父组件传入）                                ││
│  │  - 初始消息：预设模板                                                           ││
│  │  - 用户输入 → chatApiRoute → 火山方舟 API（stream: true）                     ││
│  │  - 流式展示：SSE 流式响应 → 前端逐字追加展示                                    ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  API Route: POST /api/chat                                                        │
│  - 接收：messages, context                                                         │
│  - 构建 system prompt + 用户消息                                                    │
│  - 调用火山方舟 API（stream: true）                                                │
│  - 返回：ReadableStream（SSE 流式响应）                                              │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  火山方舟 Ark API                                                                  │
│  - URL: https://ark.cn-beijing.volces.com/api/v3/chat/completions                 │
│  - 环境变量：HUOSHAN_MODEL_API_KEY、HUOSHAN_MODEL_ID（或 SHUOSHAN_MODEL_ID）       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 入口布局

### 1. 首页（Dashboard）

- **位置**：筛选搜索栏（StickyToolbar / FilterBar）的**右侧**
- **调整**：筛选搜索栏适度缩短（如 `min-w` 从 500px 调整为 400px，或 `flex-1` 限制 max-width），为「老朋友」按钮留出空间
- **按钮形态**：拟人形象（头像/插画 + 文案「老朋友」），点击展开对话框
- **布局示意**：
  ```
  [ 搜索框 | 日期 | Tag | 日记本 ]  [ 老朋友 🧙 ]
  ```

### 2. 日记本内页（DiaryView）

- **书本闭合时**：footer 中 Search 按钮**左侧**，复用 `ActionButton` 组件，非拟人形象（图标 + "老朋友" 文案）
- **书本打开时**：不展示「老朋友」按钮（通过 `!isOpen` 条件渲染）

**实现要点**：DiaryView 的 footer 结构为 `[Trash(可选)] [Search] [Save/Edit] [Obliviate] [Add(可选)]`，在 Search 左侧插入 `[老朋友]`。

---

## 前置上下文构建

### 1. 上下文数据结构

```ts
interface OldFriendContext {
  filters: {
    dateFrom?: string;
    dateTo?: string;
    bookId?: string;
    bookName?: string;
    tag?: string;
    keyword?: string;
  };
  entries: Array<{
    id: string;
    title: string | null;
    content: string;
    date: string;
    tags: string[];
  }>;
  source: 'dashboard' | 'diary-book';  // 区分首页 vs 日记本内页
  currentBookId?: string;              // 日记本内页时
}
```

### 2. 首页上下文

- `filters`：来自 `selectedFilterDateRange`、`selectedFilterBook`、`selectedTag`、`debouncedSearchQuery`
- `entries`：`listEntries`（当前分页已加载的条目，或仅传首屏/前 N 条以控制 token 量）
- `source: 'dashboard'`

### 3. 日记本内页上下文

- `filters`：`keyword: searchKeyword`（若有），`bookId`、`bookName` 为当前本
- `entries`：`bookEntries`（经 searchKeyword 筛选后的当前本内日记）
- `source: 'diary-book'`，`currentBookId`

### 4. 注入到 Prompt 的方式

将 `filters` 与 `entries` 格式化为文本，放入 system prompt 或首条 user 消息中，例如：

```
你是一位温暖的「老朋友」，正在与用户聊天。用户最近写了一些日记，以下是筛选条件与日记摘要，请基于这些内容与用户对话，给出建议或引导。

【筛选条件】
- 日期范围：2025-01-01 至 2025-01-31
- 日记本：魔法笔记
- 标签：spell
- 关键词：wingardium

【日记内容】
1. [2025-01-15] 标题：学习漂浮咒 - 内容：今天终于学会了 Wingardium Leviosa...
2. ...
```

---

## 动态补充上下文

当用户问题涉及「前置上下文之外」的记忆时：

1. **触发条件**：可简化实现为「每次用户发送消息时，用用户消息中的关键词在日记库中搜索」
2. **补充逻辑**：调用 `searchEntriesForChat(keyword)`（新建 Server Action 或复用 `getEntriesPaginated` 的 keyword 搜索），拉取与用户问题相关的日记
3. **去重**：补充的日记若已在前置上下文中则跳过
4. **合并**：将补充的日记追加到 context，再次调用大模型

**简化方案（MVP）**：首版可不实现「智能识别是否需补充」，仅用前置上下文；后续迭代再增加「根据用户消息关键词搜索补充」逻辑。

---

## API 设计

### POST /api/chat

**请求体**：

```ts
interface ChatRequest {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  context: OldFriendContext;  // 前置上下文
}
```

**响应**：

- **成功**：`Content-Type: text/event-stream`，SSE 流式响应，每行 `data: {JSON}`，包含 `choices[0].delta.content`
- **失败**：`Content-Type: application/json`，`{ error: string }`

**服务端逻辑**：
1. 校验 session（未登录返回 401）
2. 将 `context` 格式化为 system prompt
3. 调用火山方舟 API：`POST https://ark.cn-beijing.volces.com/api/v3/chat/completions`，`stream: true`
4. 将火山方舟的 SSE 流式响应透传或转发给前端

---

## 火山方舟 API 调用示例

### 流式请求

```ts
const res = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.HUOSHAN_MODEL_API_KEY}`,
  },
  body: JSON.stringify({
    model: process.env.HUOSHAN_MODEL_ID // Endpoint ID
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    stream: true,
    max_tokens: 1024,
  }),
});

// res.body 为 ReadableStream，SSE 格式：data: {"choices":[{"delta":{"content":"..."}}]}
```

### SSE 响应格式（OpenAI 兼容）

```
data: {"id":"...","choices":[{"delta":{"content":"你"},"index":0}]}
data: {"id":"...","choices":[{"delta":{"content":"好"},"index":0}]}
data: [DONE]
```

**环境变量**：
- `HUOSHAN_MODEL_API_KEY`：火山方舟 API Key
- `HUOSHAN_MODEL_ID`：模型 Endpoint ID（如 `glm-4-7-251222`）

---

## 初始消息（引导性问题）

**方案 A**：由大模型生成  
- 首次展开时，调用一次 API，system prompt 中说明「请以老朋友身份，基于以下日记内容，给出 1～2 句引导性问题或打招呼」
- 将返回内容作为首条 assistant 消息展示

**方案 B**：预设模板  
- 从若干模板中随机或按条件选择，如：「好久不见，最近有什么想聊聊的吗？」「看到你写了不少日记，今天想聊点什么？」
- 无需首次 API 调用，实现简单

**推荐**：MVP 用方案 B，后续可改为方案 A 以增强个性化。

---

## 文件结构

```
src/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts           # POST /api/chat，调用火山方舟，流式响应
│   ├── components/
│   │   └── OldFriendChat/
│   │       ├── OldFriendChatDrawer.tsx   # 对话框抽屉
│   │       ├── OldFriendAvatar.tsx       # 拟人形象（首页用）
│   │       └── OldFriendButton.tsx       # 首页拟人按钮
│   └── pages/
│       ├── Dashboard.tsx          # 筛选栏右侧添加「老朋友」按钮
│       └── DiaryView.tsx          # footer Search 左侧添加 ActionButton「老朋友」
```

---

## 类型定义

```ts
// src/app/types/ai-chat.ts
export interface OldFriendContext {
  filters: {
    dateFrom?: string;
    dateTo?: string;
    bookId?: string;
    bookName?: string;
    tag?: string;
    keyword?: string;
  };
  entries: Array<{
    id: string;
    title: string | null;
    content: string;
    date: string;
    tags: string[];
  }>;
  source: 'dashboard' | 'diary-book';
  currentBookId?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
```

---

## 测试策略

| 层级 | 工具 | 覆盖 |
|------|------|------|
| 单元 | Vitest | 前置上下文格式化、prompt 构建逻辑 |
| 集成 | Vitest | /api/chat 路由：mock 火山方舟响应，校验请求体与流式返回 |
| E2E | Playwright | 首页点击「老朋友」展开对话框、发送消息收到回复；日记本内页闭合时点击「老朋友」、打开时不展示 |

---

## 安全与限额

- **鉴权**：/api/chat 必须校验 session，仅登录用户可调用
- **限流**：可后续增加 rate limit（如每用户每分钟 N 次），防止滥用
- **Token 控制**：前置上下文中日记条数/长度需限制，避免超出模型 context 窗口（如 8K tokens）
