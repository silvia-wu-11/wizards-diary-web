# 魔法日记本 · 技术栈与架构总结

> 文档生成时间：2025-03-08  
> 项目：wizards-diary-web（魔法氛围日记本）

---

## 一、项目概述

「魔法日记本」是一个 AI native 的 Web 全栈应用，整体灵感来自魔法世界氛围。技术栈采用 Next.js 全栈 + PostgreSQL + Prisma，认证使用 NextAuth.js，样式为 Tailwind CSS。

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
│   ├── api/                # API 路由（仅 /api/auth/[...nextauth]）
│   ├── actions/            # Server Actions（diary, auth）
│   ├── book/[bookId]/      # 日记本详情页
│   ├── diary/[id]/         # 单篇日记详情页
│   ├── components/         # UI 组件
│   ├── lib/                # 应用内 store、storage 等
│   ├── pages/              # 页面级组件（Dashboard, DiaryView 等）
│   ├── providers/          # AuthProvider 等
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

### 4.2 数据流

```
┌─────────────────────────────────────────────────────────────────┐
│                        客户端 (Browser)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Zustand    │  │  React      │  │  AuthProvider            │ │
│  │  (useDiary) │  │  Components │  │  (SessionProvider)       │ │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┬───────────┘ │
│         │                │                       │              │
└─────────┼────────────────┼───────────────────────┼──────────────┘
          │                │                       │
          │  Server Actions│                       │ NextAuth
          ▼                ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                        服务端 (Next.js)                            │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐  │
│  │  app/actions/diary  │  │  auth.ts + /api/auth/[...nextauth]│  │
│  │  app/actions/auth   │  │  Credentials + JWT Session       │  │
│  └─────────┬───────────┘  └─────────────────────────────────┘  │
│            │                                                      │
│            ▼                                                      │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐  │
│  │  Prisma Client      │  │  Supabase Storage                │  │
│  │  (PostgreSQL)       │  │  (图片上传)                        │  │
│  └─────────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 认证与鉴权

- **Middleware**：拦截 `/`、`/diary`、`/book` 等受保护路由，未登录重定向至 `/login`
- **Auth 路由**：`/login`、`/register` 已登录时重定向至首页
- **Server Actions**：通过 `auth()` 获取 session，`requireAuth()` 校验用户 ID 后执行 Prisma 操作

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

### 4.5 图片上传流程

1. 前端将图片转为 base64（`data:image/...;base64,...`）
2. Server Action 接收 base64 数组
3. `uploadImages()` 调用 Supabase Storage，路径为 `{userId}/{entryId}/img-{i}.{ext}`
4. 返回公开 URL 数组，写入 `DiaryEntry.imageUrls`

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
- **关键变量**：`DATABASE_URL`、`DIRECT_URL`、`NEXTAUTH_SECRET`、`NEXT_PUBLIC_SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`

---

## 七、规划中 / 未实现

| 能力 | 说明 |
|------|------|
| **Vercel AI SDK** | 项目上下文规划为 AI native，预期使用 `streamText`、`useChat` 等，当前 package.json 中尚未接入 |
| **AI Chat** | 流式、多轮对话能力，计划中 |

---

## 八、技术选型要点（面试可讲）

1. **Next.js App Router + Server Actions**：前后端一体化，减少 REST API 样板，类型安全的数据流
2. **Prisma**：类型安全的 ORM，schema 即文档，迁移可追溯
3. **NextAuth Credentials + JWT**：无第三方 OAuth 依赖，适合自建账号体系
4. **Supabase Storage**：独立于主库的图片存储，公开 URL 便于 CDN 与前端直用
5. **Zustand**：轻量状态管理，与 Server Actions 配合，服务端为数据源、客户端做缓存与乐观更新
