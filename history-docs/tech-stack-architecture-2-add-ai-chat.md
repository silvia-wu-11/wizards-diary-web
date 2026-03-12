# 魔法日记本 · 技术栈与架构总结（当前版）

> 文档生成时间：2025-03-08  
> 项目：wizards-diary-web（魔法氛围日记本）  
> 基准对比：`tech-stack-architecture.md`（2025-03-08 初版）

---

## 一、项目概述

「魔法日记本」是一个 AI native 的 Web 全栈应用，整体灵感来自魔法世界氛围。技术栈采用 Next.js 全栈 + PostgreSQL + Prisma，认证使用 NextAuth.js，样式为 Tailwind CSS。**已接入 AI 对话能力**（老朋友），基于火山方舟 Ark API 实现流式对话。

---

## 二、前端技术栈

### 核心框架

| 技术 | 版本 | 用途 |
|------|------|------|
| **Next.js** | 15.3.3 | App Router 全栈框架 |
| **React** | 18.3.1 | UI 库 |
| **TypeScript** | ^5 | 类型系统 |

### UI 与样式

| 技术 | 版本 | 用途 |
|------|------|------|
| **Tailwind CSS** | 4.1.12 | 原子化 CSS |
| **Radix UI** | 多组件 | 无障碍基础组件（accordion、dialog、dropdown、select 等） |
| **shadcn/ui 风格** | - | 基于 Radix + Tailwind 的 UI 组件库 |
| **Motion** | 12.23.24 | 动画库 |
| **Lucide React** | 0.487.0 | 图标库 |
| **next-themes** | 0.4.6 | 主题切换 |

### 自定义主题与字体

- **字体**：Cinzel（标题）、Crimson Text（正文）、Caveat（手写） via Google Fonts
- **颜色变量**：`castle-stone`、`parchment-white`、`vintage-burgundy`、`faded-gold` 等魔法风格主题色

### 状态管理与表单

| 技术 | 版本 | 用途 |
|------|------|------|
| **Zustand** | ^5.0.11 | 全局状态（日记本、日记列表等） |
| **React Hook Form** | 7.55.0 | 表单管理 |
| **Zod** | ^4.3.6 | 表单校验与 schema 验证 |

### 其他前端组件

| 技术 | 版本 | 用途 |
|------|------|------|
| **Recharts** | 2.15.2 | 图表 |
| **Embla Carousel** | 8.6.0 | 轮播 |
| **React Day Picker** | 8.10.1 | 日期选择 |
| **react-responsive-masonry** | 2.7.1 | 瀑布流布局 |
| **react-dnd** | 16.0.1 | 拖拽 |
| **Sonner** | 2.0.3 | Toast 通知 |

---

## 三、后端技术栈

### 核心框架

- **Next.js App Router**：服务端渲染、路由、API 路由
- **Server Actions**：`'use server'` 标记的 Server Actions，用于业务逻辑（如日记 CRUD、注册）

### 数据层

| 技术 | 版本 | 用途 |
|------|------|------|
| **PostgreSQL** | - | 数据库 |
| **Prisma** | ^5.22.0 | ORM 与迁移 |
| **Prisma Client** | ^5.22.0 | 数据库访问 |

### 认证

| 技术 | 版本 | 用途 |
|------|------|------|
| **NextAuth.js** | 5.0.0-beta.30 | 认证框架 |
| **Credentials Provider** | - | 邮箱 + 密码登录 |
| **bcryptjs** | ^3.0.3 | 密码哈希 |
| **JWT** | - | Session 策略，30 天有效期 |

### 存储

| 技术 | 版本 | 用途 |
|------|------|------|
| **Supabase Storage** | @supabase/supabase-js ^2.98.0 | 图片上传（base64 → 公开 URL） |
| **base64-arraybuffer** | ^1.0.2 | base64 解码 |

### AI 能力（新增）

| 技术 | 接入方式 | 用途 |
|------|----------|------|
| **火山方舟 Ark API** | 直接 fetch | 流式对话（Chat Completions API） |
| **SSE** | ReadableStream | 服务端流式响应，前端逐字展示 |

- **环境变量**：`HUOSHAN_MODEL_API_KEY`、`HUOSHAN_MODEL_ID`
- **说明**：未使用 Vercel AI SDK，直接调用火山方舟 API 并手动解析 SSE

### 校验与工具

- **Zod**：服务端 schema 校验（`signInSchema`、`registerSchema` 等）
- **uuid**：生成唯一 ID

---

## 四、技术架构

### 4.1 目录结构

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # 认证相关路由组（login, register）
│   ├── api/                # API 路由
│   │   ├── auth/           # /api/auth/[...nextauth]
│   │   └── chat/           # /api/chat（AI 流式对话）★ 新增
│   ├── actions/            # Server Actions（diary, auth）
│   ├── book/[bookId]/      # 日记本详情页
│   ├── diary/[id]/         # 单篇日记详情页
│   ├── components/         # UI 组件
│   │   └── OldFriendChat/  # 老朋友对话抽屉 ★ 新增
│   ├── lib/                # 应用内 store、storage 等
│   │   └── ai-chat/        # AI 上下文格式化 ★ 新增
│   ├── pages/              # 页面级组件（Dashboard, DiaryView 等）
│   ├── providers/          # AuthProvider 等
│   ├── types/              # 类型定义
│   │   └── ai-chat.ts      # OldFriendContext、ChatMessage ★ 新增
│   ├── layout.tsx
│   └── page.tsx
├── auth.ts                 # NextAuth 配置
├── lib/                    # 共享库
│   ├── auth/               # 密码、校验器
│   ├── db.ts               # Prisma 单例
│   └── supabase/           # storage 上传封装
├── middleware.ts           # 中间件（鉴权、重定向）
└── styles/                 # 全局样式
```

### 4.2 数据流（含 AI 对话）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            客户端 (Browser)                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  ┌────────────────┐ │
│  │  Zustand    │  │  React      │  │  AuthProvider    │  │ OldFriendChat  │ │
│  │  (useDiary) │  │  Components │  │  (SessionProvider)│  │ Drawer         │ │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  │ fetch + SSE 解析 │ │
│         │                │                  │          └────────┬───────────┘ │
└─────────┼────────────────┼──────────────────┼───────────────────┼────────────┘
          │                │                  │                   │
          │  Server Actions│                  │ NextAuth           │ POST /api/chat
          ▼                ▼                  ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            服务端 (Next.js)                                   │
│  ┌─────────────────────┐  ┌───────────────────────────────────────────────┐ │
│  │  app/actions/diary  │  │  auth.ts + /api/auth/[...nextauth]             │ │
│  │  app/actions/auth   │  │  Credentials + JWT Session                     │ │
│  └─────────┬───────────┘  └───────────────────────────────────────────────┘  │
│            │                                                                  │
│  ┌─────────▼───────────┐  ┌───────────────────────────────────────────────┐ │
│  │  /api/chat          │  │  火山方舟 Ark API（流式 SSE）                  │ │
│  │  formatContext +    │  │  HUOSHAN_MODEL_API_KEY 鉴权                    │ │
│  │  system prompt 注入 │  │  doubao 等模型                                │ │
│  └──────┬──────────────┘  └───────────────────────────────────────────────┘  │
│         │                                                                     │
│         ▼                                                                     │
│  ┌─────────────────────┐  ┌───────────────────────────────────────────────┐ │
│  │  Prisma Client      │  │  Supabase Storage                │ 火山方舟      │ │
│  │  (PostgreSQL)       │  │  (图片上传)                        │ (AI 对话)   │ │
│  └─────────────────────┘  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 认证与鉴权

- **Middleware**：拦截 `/`、`/diary`、`/book` 等受保护路由，未登录重定向至 `/login`
- **Auth 路由**：`/login`、`/register` 已登录时重定向至首页
- **Server Actions**：通过 `auth()` 获取 session，`requireAuth()` 校验用户 ID 后执行 Prisma 操作
- **API /chat**：`auth()` 校验，未登录返回 401  JSON

### 4.4 数据模型（Prisma）

```
User
  ├── id, email, passwordHash, name, createdAt, updatedAt
  └── books: DiaryBook[]

DiaryBook
  ├── id, userId, name, color, type, createdAt, updatedAt
  └── entries: DiaryEntry[]

DiaryEntry
  ├── id, bookId, title, content, date, tags, imageUrls[], createdAt, updatedAt
  └── book: DiaryBook
```

（无变化）

### 4.5 图片上传流程

1. 前端将图片转为 base64（`data:image/...;base64,...`）
2. Server Action 接收 base64 数组
3. `uploadImages()` 调用 Supabase Storage，路径为 `{userId}/{entryId}/img-{i}.{ext}`
4. 返回公开 URL 数组，写入 `DiaryEntry.imageUrls`

### 4.6 AI 对话流程（老朋友）

1. **入口**：Dashboard 筛选栏右侧「老朋友」按钮；DiaryView 书本闭合时 footer 中 Search 左侧
2. **上下文**：`OldFriendContext`（filters + entries（前 20 条））由父组件传入
3. **system prompt**：`formatContextForPrompt()` 将筛选条件与日记内容格式化为文本注入
4. **请求**：`POST /api/chat`，body: `{ messages, context }`
5. **流式**：火山方舟 `stream: true`，响应为 SSE，前端 `ReadableStream` + `TextDecoder` 逐行解析 `data:` 块
6. **展示**：`OldFriendChatDrawer` 内逐字追加 assistant 内容

---

## 五、测试技术栈

| 技术 | 用途 |
|------|------|
| **Vitest** | 单元测试、集成测试 |
| **@testing-library/react** | React 组件测试 |
| **jsdom** | 浏览器环境模拟 |
| **Supertest** | API 集成测试（在 Vitest 中） |
| **Playwright** | E2E 测试 |

- 测试目录：`e2e/`（Playwright）、`**/*.test.ts`（Vitest）
- 单测/集成测与 spec 中的 Scenario 对应，遵循 GIVEN/WHEN/THEN

---

## 六、构建与部署

- **包管理**：pnpm
- **构建**：`pnpm build`（先 `prisma generate`，再 `next build`）
- **环境变量**：`.env.local`、`.env`（dotenv-cli 加载）
- **关键变量**：`DATABASE_URL`、`DIRECT_URL`、`NEXTAUTH_SECRET`、`NEXT_PUBLIC_SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`HUOSHAN_MODEL_API_KEY`、`HUOSHAN_MODEL_ID`

---

## 七、与旧版架构对比（tech-stack-architecture.md）

### 7.1 主要变化

| 维度 | 旧版（2025-03-08 初版） | 当前版 |
|------|-------------------------|--------|
| **AI 能力** | 规划中 / 未实现（Vercel AI SDK） | ✅ 已接入；使用火山方舟 Ark API |
| **API 路由** | 仅 `/api/auth/[...nextauth]` | 新增 `/api/chat`（POST，流式 SSE） |
| **AI 依赖** | 无 | 无新增 npm 包，直接 fetch 火山方舟 |
| **前端** | 无 AI 对话 UI | 新增 `OldFriendChatDrawer` 组件 |
| **环境变量** | 5 个核心变量 | 新增 `HUOSHAN_MODEL_API_KEY`、`HUOSHAN_MODEL_ID` |

### 7.2 架构变更摘要

1. **AI 选型**：未采用 Vercel AI SDK，而是直接调用火山方舟 Chat Completions API。原因：国内服务、延迟低；兼容 OpenAI 格式；支持流式输出。
2. **流式实现**：服务端透传 SSE `ReadableStream`，前端通过 `ReadableStream.getReader()` + `TextDecoder` 手动解析 `data:` 行，逐字追加到 UI。
3. **上下文注入**：`OldFriendContext` 将当前筛选条件与日记条目传入 API，`formatContextForPrompt()` 生成 system prompt，实现「基于日记的对话」。
4. **目录结构**：新增 `app/api/chat/`、`app/lib/ai-chat/`、`app/types/ai-chat.ts`、`app/components/OldFriendChat/`。

### 7.3 保持不变

- 核心框架（Next.js、React、Prisma、NextAuth 等）版本与用法未变
- 数据模型（Prisma schema）未变
- 认证与鉴权流程未变
- 测试技术栈未变

---

## 八、技术选型要点（面试可讲）

1. **Next.js App Router + Server Actions**：前后端一体化，减少 REST API 样板，类型安全的数据流
2. **Prisma**：类型安全的 ORM，schema 即文档，迁移可追溯
3. **NextAuth Credentials + JWT**：无第三方 OAuth 依赖，适合自建账号体系
4. **Supabase Storage**：独立于主库的图片存储，公开 URL 便于 CDN 与前端直用
5. **Zustand**：轻量状态管理，与 Server Actions 配合，服务端为数据源、客户端做缓存与乐观更新
6. **火山方舟 + 自研 SSE 解析**：国内 AI 服务、低延迟；流式对话体验；未引入 Vercel AI SDK，保持依赖精简
