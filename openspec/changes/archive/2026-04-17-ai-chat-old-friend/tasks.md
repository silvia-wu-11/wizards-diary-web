# 基于日记数据的 AI 对话（老朋友）· 任务清单

按执行顺序排列。每项任务完成后可勾选。

---

## 阶段 0：基础设施

- [x] **T0.1** 安装依赖（已移除 HuggingFace，改用火山方舟）
- [x] **T0.2** 配置环境变量：`HUOSHAN_MODEL_API_KEY`、`HUOSHAN_MODEL_ID`
- [x] **T0.3** 新建 `src/app/types/ai-chat.ts`：定义 `OldFriendContext`、`ChatMessage` 等类型

---

## 阶段 1：API 路由

- [x] **T1.1** 新建 `src/app/api/chat/route.ts`：POST 处理，校验 session
- [x] **T1.2** 实现前置上下文格式化函数：`formatContextForPrompt(context: OldFriendContext): string`
- [x] **T1.3** 集成火山方舟 API：`stream: true`，透传 SSE 流式响应
- [x] **T1.4** 错误处理：网络失败、API 错误时返回可理解提示
- [x] **T1.5** 为 /api/chat 编写 Vitest 集成测试（mock HuggingFace 响应）

---

## 阶段 2：对话框组件

- [x] **T2.1** 新建 `OldFriendChatDrawer`：抽屉/浮层 UI，支持展开/收起
- [x] **T2.2** 实现消息列表展示：user / assistant 消息区分样式
- [x] **T2.3** 实现底部输入框 + 发送按钮
- [x] **T2.4** 初始消息：使用预设模板（如「好久不见，最近有什么想聊聊的吗？」）
- [x] **T2.5** 发送逻辑：调用 `/api/chat`，解析 SSE 流式响应，逐字追加展示
- [x] **T2.6** 流式展示：`streamingContent` 状态 + 闪烁光标，流结束后追加到 messages

---

## 阶段 3：首页入口

- [x] **T3.1** 新建 `OldFriendButton`（拟人形象）：头像/插画 + 「老朋友」文案
- [x] **T3.2** 调整 Dashboard 筛选栏布局：适度缩短，右侧留出空间
- [x] **T3.3** 在筛选栏右侧添加「老朋友」按钮
- [x] **T3.4** 点击按钮展开 `OldFriendChatDrawer`，传入首页的 `filters` 与 `listEntries`（或前 N 条）

---

## 阶段 4：日记本内页入口

- [x] **T4.1** 在 DiaryView footer 中，Search 按钮左侧添加「老朋友」ActionButton
- [x] **T4.2** 条件渲染：仅当 `!isOpen`（书本闭合）时展示
- [x] **T4.3** 点击展开 `OldFriendChatDrawer`，传入日记本内页的 `filters` 与 `bookEntries`

---

## 阶段 5：动态补充上下文（可选，后续迭代）

- [x] **T5.1** 分析用户消息中的关键词，调用 `getEntriesPaginated` 或新建 `searchEntriesForChat` 拉取相关日记 (已由 memory-engine 向量检索替代完成)
- [x] **T5.2** 去重后追加到 context，再次调用大模型 (已由 memory-engine 向量检索替代完成)
- [x] **T5.3** 在 UI 上可选展示「正在回忆更多...」等提示 (已由 memory-engine 向量检索替代完成)

---

## 阶段 6：测试与验收

- [x] **T6.1** E2E：首页点击「老朋友」→ 展开 → 发送消息 → 收到回复
- [x] **T6.2** E2E：日记本内页闭合时点击「老朋友」→ 展开；打开时不展示按钮
- [x] **T6.3** 手动验证：不同筛选条件下的前置上下文是否正确注入

---

## 验收标准

- 首页筛选栏右侧有「老朋友」拟人按钮，点击展开对话框
- 日记本内页书本闭合时 footer 有「老朋友」按钮（Search 左侧），书本打开时不展示
- 对话框展示初始引导消息，用户可输入问题并收到 AI 回复
- AI 回复基于当前筛选条件与日记数据
- 使用火山方舟 API 调用，流式输出（`stream: true`），前端逐字展示
