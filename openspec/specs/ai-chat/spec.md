# AI 对话（老朋友）· 行为规格

## Purpose
用户可通过「老朋友」入口与 AI 对话，AI 基于当前筛选条件下的日记数据作为上下文，提供回答建议或引导；若用户提及前置上下文之外的历史记忆，系统可动态补充相关日记到上下文中再调用大模型。

## Requirements

### Requirement: 用户可通过「老朋友」按钮唤起 AI 对话框
系统 SHALL 在指定位置提供「老朋友」入口按钮，用户点击后展开 AI 对话框。

#### Scenario: 首页用户点击「老朋友」按钮，展开对话框
- GIVEN 用户已登录且在首页（Dashboard）
- WHEN 用户点击筛选搜索栏右侧的「老朋友」拟人形象按钮
- THEN 系统展开 AI 对话框
- AND 对话框展示「老朋友」的初始问候或引导性问题

#### Scenario: 日记本闭合时，用户点击 footer 中的「老朋友」按钮
- GIVEN 用户在日记本内页（DiaryView）且书本处于闭合状态
- WHEN 用户点击 footer 中 Search 按钮左侧的「老朋友」按钮（非拟人形象，复用 ActionButton）
- THEN 系统展开 AI 对话框
- AND 对话框展示「老朋友」的初始问候或引导性问题

#### Scenario: 日记本打开时，不展示「老朋友」按钮
- GIVEN 用户在日记本内页且书本处于打开状态（isOpen=true）
- WHEN 用户查看页面
- THEN 系统不展示「老朋友」按钮
- AND footer 中仅展示 Search、Save/Edit、Obliviate 等既有按钮

---

### Requirement: AI 对话框以当前筛选条件与日记数据作为前置上下文
系统 SHALL 将首页或日记本内页的筛选条件（日期范围、日记本、tags、搜索词）及筛选出的日记数据，作为 AI 对话的「前置上下文」注入到云端大模型调用中。

#### Scenario: 首页对话时，前置上下文包含筛选条件与筛选结果
- GIVEN 用户已登录且在首页
- AND 用户已设置筛选条件：日期范围 2025-01-01 至 2025-01-31、tag "spell"、日记本 "魔法笔记"、关键词 "levitation"
- AND 筛选结果包含 5 条日记
- WHEN 用户点击「老朋友」并展开对话框
- THEN 系统将上述筛选条件与 5 条日记的 title、content、date、tags 作为前置上下文
- AND 云端大模型在回答时能基于这些日记内容给出建议或引导

#### Scenario: 日记本内页对话时，前置上下文为当前本内日记
- GIVEN 用户在日记本内页且书本闭合
- AND 当前日记本内有若干日记（若有 searchKeyword 则基于筛选后的 bookEntries）
- WHEN 用户点击「老朋友」并展开对话框
- THEN 系统将当前日记本内的日记数据（及可选搜索词）作为前置上下文
- AND 云端大模型在回答时能基于这些日记内容给出建议或引导

---

### Requirement: 对话框初始由「老朋友」给出引导性问题或打招呼
系统 SHALL 在对话框展开时，由 AI（老朋友）主动发送一条或多条初始消息，内容为引导性问题或简单打招呼。

#### Scenario: 对话框初次展开，展示引导性问题
- GIVEN 用户点击「老朋友」按钮
- WHEN 对话框展开
- THEN 系统展示「老朋友」的初始消息
- AND 初始消息为引导性问题（如「最近有什么想聊聊的吗？」）或简单打招呼（如「好久不见，今天想聊点什么？」）
- AND 初始消息由云端大模型基于前置上下文生成，或使用预设模板

---

### Requirement: 用户可输入问题并发送，AI 结合日记内容回答
系统 SHALL 在对话框底部提供输入框，用户输入问题并发送后，云端大模型结合用户问题与日记上下文给出回答或进一步引导。

#### Scenario: 用户发送问题，收到 AI 回答
- GIVEN 用户已展开 AI 对话框
- AND 前置上下文已注入
- WHEN 用户输入问题「上周我写的关于上学的那篇日记，你有什么看法？」并发送
- THEN 系统将用户问题与前置上下文一并发送至云端大模型
- AND 大模型返回回答后，系统在对话框中展示该回答
- AND 回答内容与日记相关，体现对日记的理解或引导

#### Scenario: 用户问题涉及前置上下文之外的日记
- GIVEN 用户已展开 AI 对话框
- AND 前置上下文仅包含当前筛选出的日记（如 5 条）
- WHEN 用户提及「去年夏天去魔法学院的那次旅行」
- THEN 系统识别用户提及了前置上下文之外的历史记忆
- AND 系统从日记库中按关键词/语义拉取相关日记数据
- AND 将补充的日记数据加入上下文后，再次调用云端大模型
- AND 大模型基于扩充后的上下文给出回答

---

### Requirement: 云端大模型使用火山方舟 API 调用，支持流式输出
系统 SHALL 使用火山方舟（Volcengine Ark）提供的 API 调用云端大模型；请求参数 `stream: true`，采用流式响应；前端对话框以流式方式逐字/逐段展示 AI 回复。

#### Scenario: 调用大模型成功，流式展示回复
- GIVEN 用户已发送问题
- AND 前置上下文已准备好
- WHEN 系统调用火山方舟 API（stream: true）
- THEN 系统将 messages（含 system、前置上下文摘要、用户问题）发送至 API
- AND 收到 SSE 流式响应后，前端逐字/逐段追加展示给用户
- AND 用户可实时看到 AI 回复的生成过程

#### Scenario: 调用大模型失败
- GIVEN 用户已发送问题
- WHEN 系统调用火山方舟 API 失败（网络错误、配额超限等）
- THEN 系统展示可理解的错误提示
- AND 用户可重试发送

---

### Requirement: 流式展示在思考阶段提供可见反馈并保持流畅
系统 SHALL 在流式响应仅包含推理字段时提供“思考中”的可见状态，并对高频分片做节流合并，避免空白与卡顿。

#### Scenario: 仅收到 reasoning_content 时展示“思考中”
- GIVEN 用户已发送问题
- AND 前端开始接收 SSE 流式响应
- WHEN SSE 分片仅包含 reasoning_content 且尚未出现 content
- THEN 前端展示“思考中”的临时状态
- AND 当首个 content 到达后切换为实际回复内容

#### Scenario: 高频单字分片节流合并
- GIVEN 用户已发送问题
- AND 前端正在接收高频单字分片
- WHEN 分片间隔很短（如 30–50ms 内连续到达）
- THEN 前端以节流方式合并分片更新
- AND 用户感知到流式输出连续且无明显卡顿

---

### Requirement: 系统记录流式性能指标
系统 SHALL 记录流式响应中的首分片到首 content 的时间，以及首 content 到完成的时间，用于定位模型与前端的时延来源。

#### Scenario: 记录首分片与首 content 时间
- GIVEN 用户已发送问题
- AND 前端开始接收 SSE 流式响应
- WHEN 首个分片到达且后续首个 content 出现
- THEN 系统记录“首分片到首 content”的耗时

#### Scenario: 记录首 content 到完成时间
- GIVEN 前端已接收到首个 content
- WHEN 流式响应结束
- THEN 系统记录“首 content 到完成”的耗时

---

## 实现入口

本规格的实现由 OpenSpec 变更驱动，详见：

- [openspec/changes/ai-chat-old-friend/](../../changes/ai-chat-old-friend/) — proposal、design、tasks
