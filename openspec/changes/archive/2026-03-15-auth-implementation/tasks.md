# Auth 实现 · 任务清单

按执行顺序排列。每项任务完成后可勾选。

---

## 阶段 0：准备

- [x] **T0.1** 安装依赖：`pnpm add next-auth@beta bcryptjs zod @prisma/client`，`pnpm add -D prisma`
- [x] **T0.2** 初始化 Prisma：`pnpm prisma init`，配置 `DATABASE_URL`，创建 User 模型
- [x] **T0.3** 执行 `pnpm prisma migrate dev` 创建表
- [x] **T0.4** 生成 `AUTH_SECRET`：`npx auth secret`，写入 `.env.local`（无此变量时 middleware 鉴权可能异常）

---

## 阶段 1：基础设施

- [x] **T1.1** 创建 `src/lib/auth/password.ts`：bcrypt 哈希与校验
- [x] **T1.2** 创建 `src/lib/auth/validators.ts`：Zod 登录/注册 schema
- [x] **T1.3** 创建 `src/auth.ts`：Auth.js 配置，Credentials provider，JWT callbacks
- [x] **T1.4** 创建 `src/app/api/auth/[...nextauth]/route.ts`：导出 handlers
- [x] **T1.5** 创建 `middleware.ts`：路由保护，首页允许未登录访问（用于新用户引导），其他需鉴权路由未登录重定向 `/login?from=...`，已登录访问 login/register 重定向 `/`

---

## 阶段 2：注册 API

- [x] **T2.1** 创建 `POST /api/register`（Server Action）：校验邮箱唯一、两次密码一致、密码强度；创建 User；成功后 `signIn` 自动登录
- [ ] **T2.2** 为注册 API 编写 Vitest 集成测试（可选，或 E2E 覆盖）

---

## 阶段 3：登录页（先写测再实现）

- [x] **T3.1** 为登录流程编写 E2E 测试（Playwright）：未填邮箱、未填密码、错误凭证、成功登录、密码可见性、「切换到创建账号」
- [x] **T3.2** 创建 `src/app/components/auth/PasswordInput.tsx`：密码输入 + Eye/EyeOff 切换
- [x] **T3.3** 创建 `src/app/(auth)/login/page.tsx`：邮箱、密码、提交；前端校验空值；`signIn` 调用；错误展示；「切换到创建账号」链接
- [x] **T3.4** 登录成功后跳转 `from` 或 `/`

---

## 阶段 4：注册页

- [x] **T4.1** 为注册流程编写 E2E 测试：两次密码不一致、邮箱已存在、成功注册、「去登录」
- [x] **T4.2** 创建 `src/app/(auth)/register/page.tsx`：邮箱、密码、确认密码、昵称；前端校验两次密码一致；调用 `/api/register`；「去登录」链接
- [x] **T4.3** 注册成功后自动登录并跳转 `/`

---

## 阶段 5：登出与收尾

- [x] **T5.1** 在 AuthModal 中增加「登出」按钮，调用 `signOut`
- [x] **T5.2** 为 `/login`、`/register` 创建简化 layout（魔法风格与主应用一致）
- [ ] **T5.3** 更新 smoke E2E：未登录访问受保护路由应重定向至 `/login`
- [ ] **T5.4** 跑通全部 E2E 测试，确认与 spec 一致

---

## 阶段 6：前端登录态校验（扩展功能）

- [x] **T6.1** 创建 `src/app/components/auth/AuthModal.tsx`：登录/注册弹窗组件，支持 `initialMode` 参数
- [x] **T6.2** Dashboard 首页：保存日记时检查登录状态，未登录弹出登录/注册弹窗
- [x] **T6.3** Dashboard 首页：创建日记本时检查登录状态，未登录弹出注册弹窗，注册成功后自动创建日记本
- [x] **T6.4** Dashboard 首页：点击"老朋友"按钮时检查登录状态，未登录弹出登录弹窗
- [x] **T6.5** DiaryView（日记详情页）：保存日记时检查登录状态，未登录弹出登录弹窗
- [x] **T6.6** DiaryView（日记详情页）：点击"老朋友"按钮时检查登录状态，未登录弹出登录弹窗

---

## 验收标准

- 未登录访问 `/diary/:id`、`/book/:bookId` 时，重定向至 `/login`
- 首页 `/` 允许未登录访问（用于新用户引导）
- 已登录访问 `/login`、`/register` 时，重定向至 `/`
- 登录、注册、登出流程符合 `openspec/specs/auth/spec.md` 中各 Scenario
- 密码可见性切换正常工作
- 刷新页面后，有效 session 仍保持登录状态
- 前端各操作（保存日记、创建日记本、老朋友聊天）会检查登录状态，未登录时弹出登录/注册弹窗
