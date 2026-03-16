# Auth 实现 · 技术设计

## 技术选型

**项目栈**：Next.js 15 App Router + TypeScript。采用 **Auth.js (NextAuth.js v5)** 实现认证，与 Next.js 深度集成，支持 Credentials 邮箱密码登录。

**选 Auth.js 的原因**：项目 context 指定 NextAuth.js；与 Next.js 原生集成；支持 Credentials provider；Session 管理完善；可与 Prisma 配合存储用户。

---

## 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│  Next.js App Router                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ LoginPage   │  │ RegisterPage│  │ Protected Routes         │  │
│  │ /login      │  │ /register   │  │ /, /diary/:id, /book/:id │  │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬──────────────┘  │
│         │                │                      │                │
│         └────────────────┼──────────────────────┘                │
│                          │ auth() / useSession()                   │
│                          ▼                                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Auth.js (next-auth@beta)                                    │ │
│  │  - Credentials provider (email + password)                   │ │
│  │  - signIn / signOut                                          │ │
│  │  - JWT session strategy                                       │ │
│  └────────────────────────────┬────────────────────────────────┘ │
└───────────────────────────────┼─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Prisma + PostgreSQL                                             │
│  - User 表：id, email, passwordHash, name                        │
│  - 注册：Server Action 创建用户                                   │
│  - 登录：authorize 校验 email + bcrypt 密码                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 路由与鉴权

| 路径 | 鉴权要求 | 未登录时 |
|------|----------|----------|
| `/login` | 公开 | 展示登录表单 |
| `/register` | 公开 | 展示注册表单 |
| `/` | 公开 | 展示首页（用于新用户引导，未登录时可通过弹窗登录/注册） |
| `/diary/:id` | 需登录 | 重定向至 `/login` |
| `/book/:bookId` | 需登录 | 重定向至 `/login` |

**实现方式**：在 `middleware.ts` 中调用 `auth()`，首页 `/` 允许未登录访问（用于新用户引导），其他需鉴权路由未登录时 `redirect('/login?from=...')`；已登录访问 `/login`、`/register` 时 `redirect('/')`。

**前端交互**：除路由层面的保护外，各页面组件（Dashboard、DiaryView）中也实现了登录状态检查：
- 保存日记、创建日记本、打开"老朋友"聊天等操作前检查 `session?.user`
- 未登录时弹出 `AuthModal` 登录/注册弹窗，引导用户登录

---

## 文件结构

```
src/
├── auth.ts                    # Auth.js 配置（Credentials、callbacks）
├── auth.config.ts             # 可选：pages、callbacks 拆分
├── lib/
│   └── auth/
│       ├── password.ts        # bcrypt 哈希与校验
│       └── validators.ts      # Zod 校验 schema
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts   # Auth.js 路由
│   ├── api/
│   │   └── register/
│   │       └── route.ts       # 注册 API（或 Server Action）
│   ├── (auth)/                # 登录/注册 route group
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   └── components/
│       └── auth/
│           └── PasswordInput.tsx  # 带可见性切换的密码输入
prisma/
├── schema.prisma              # User 模型
└── ...
middleware.ts                  # 路由保护
```

---

## 核心实现要点

### 1. Prisma User 模型

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

### 2. Auth.js 配置

- **Credentials provider**：`authorize` 中根据 email 查 User，用 bcrypt 校验 password
- **JWT strategy**：`session: { strategy: 'jwt' }`（Credentials 不持久化 session 到 DB）
- **callbacks**：`jwt` 将 user 写入 token；`session` 将 user 暴露给客户端

### 3. 注册

- **API Route** `POST /api/register` 或 **Server Action**：校验邮箱唯一、两次密码一致、密码强度；bcrypt 哈希后创建 User；创建成功后调用 `signIn('credentials', { email, password })` 自动登录

### 4. 登录

- 使用 `signIn('credentials', { email, password, redirectTo: from ?? '/' })`
- 前端校验：空邮箱、空密码时阻止提交并展示错误
- 失败时 Auth.js 返回 `CredentialsSignin`，前端展示「邮箱或密码错误」

### 5. 登出

```ts
import { signOut } from '@/auth';
await signOut({ redirectTo: '/login' });
```

### 6. Middleware

- 使用 `export { auth as middleware }` 或自定义 matcher 保护 `/diary/*`、`/book/*`
- **首页 `/` 允许未登录访问**（用于新用户引导，未登录用户可浏览首页并通过弹窗登录/注册）
- 未登录访问其他需鉴权路由 → `redirect('/login?from=' + pathname)`
- 已登录访问 `/login`、`/register` → `redirect('/')`

### 7. 密码可见性

- `PasswordInput` 组件：`type={showPassword ? 'text' : 'password'}`，按钮切换；图标用 `lucide-react` 的 `Eye` / `EyeOff`

### 8. AuthModal 弹窗组件

- `AuthModal` 组件：用于前端交互的登录/注册弹窗
- 支持 `initialMode` 参数指定初始显示模式（'login' | 'register'）
- 支持 `onSuccess` 回调用于登录/注册成功后的处理（如自动创建日记本）
- 支持 `onClose` 回调用于弹窗关闭时的处理
- 用于 Dashboard 和 DiaryView 中的登录态检查交互

---

## 环境变量

- `AUTH_SECRET`：`npx auth secret` 生成
- `DATABASE_URL`：Prisma 连接字符串（PostgreSQL）

---

## 测试策略

| 层级 | 工具 | 对应 spec |
|------|------|-----------|
| 单元/集成 | Vitest | 密码哈希、Zod 校验、注册 API |
| E2E | Playwright | 登录成功、注册成功、未登录重定向、登出、表单校验 |

每个 spec Scenario 对应至少一个测试用例。
