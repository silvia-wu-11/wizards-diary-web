# 魔法日记本 · Wizard's Diary

AI native 的 Web 全栈日记应用，整体灵感来自魔法世界氛围。支持日记本管理、日记撰写、筛选搜索，以及基于日记上下文的 AI 对话（「老朋友」）。

## 在线预览

- **地址**：[https://wizards-diary-kvc3rjnbx-silvia11wu-9949s-projects.vercel.app?_vercel_share=GcjEROQHdGFLRQOcOGWzWnCm1hRqg4nd](https://wizards-diary-kvc3rjnbx-silvia11wu-9949s-projects.vercel.app?_vercel_share=GcjEROQHdGFLRQOcOGWzWnCm1hRqg4nd)
- **说明**：部署在 Vercel，需使用梯子（代理）访问国外域名。

## 产品设计与开发过程文档库

- **语雀文档知识库**：[https://www.yuque.com/wuyingying-0ydcv/dk553t](https://www.yuque.com/wuyingying-0ydcv/dk553t?#)

## 技术栈


| 层级    | 技术                             |
| ----- | ------------------------------ |
| 框架    | Next.js 15 (App Router)        |
| 样式    | Tailwind CSS 4                 |
| 数据    | PostgreSQL + Prisma ORM        |
| 认证    | NextAuth.js v5                 |
| AI 对话 | 火山方舟 Ark API（流式）               |
| 图片存储  | Supabase Storage               |
| 测试    | Vitest（单测/集成）+ Playwright（E2E） |


## 快速开始

### 1. 安装依赖

```bash
pnpm i
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```


| 变量                          | 说明                                                     |
| --------------------------- | ------------------------------------------------------ |
| `AUTH_SECRET`               | 运行 `npx auth secret` 生成                                |
| `DATABASE_URL`              | Supabase PostgreSQL 连接串（Transaction 模式，端口 6543）        |
| `DIRECT_URL`                | Supabase PostgreSQL 连接串（Session 模式，端口 5432，migrate 必需） |
| `NEXT_PUBLIC_SUPABASE_URL`  | Supabase 项目 URL                                        |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role 密钥                               |
| `HUOSHAN_MODEL_API_KEY`     | 火山方舟 API Key                                           |
| `HUOSHAN_MODEL_ID`          | 火山方舟模型 Endpoint ID（如 glm-4-7-251222）                   |


### 3. 初始化数据库

在 [Supabase Dashboard](https://supabase.com/dashboard) 创建项目后，将连接串写入 `.env.local`，然后：

```bash
pnpm db:migrate
```

### 4. 启动开发服务器

```bash
pnpm dev
```

## 常用脚本


| 命令                | 说明                   |
| ----------------- | -------------------- |
| `pnpm dev`        | 启动开发服务器              |
| `pnpm build`      | 构建生产版本               |
| `pnpm start`      | 启动生产服务器              |
| `pnpm test`       | 运行 Vitest 单测         |
| `pnpm test:e2e`   | 运行 Playwright E2E 测试 |
| `pnpm db:migrate` | 执行 Prisma 迁移         |
| `pnpm db:push`    | 将 schema 推送到数据库（开发用） |


## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # 登录/注册
│   ├── api/                # API 路由（含 AI 对话）
│   ├── diary/              # 单篇日记
│   ├── book/               # 日记本内页
│   └── components/         # 页面组件
├── lib/                    # 工具与 store
openspec/
├── specs/                  # 行为规格（auth、diary-*、ai-chat）
└── changes/                # 变更设计（proposal、design、tasks）
```

## 设计稿

- [Figma 设计稿](https://www.figma.com/design/k5fRdHqNSQQ2Bh3JW3fn1P/Wizard-s-Diary-Web-App)

## 致谢

- [shadcn/ui](https://ui.shadcn.com/)（MIT）
- [Unsplash](https://unsplash.com) 图片素材

