---
alwaysApply: false
globs: *.ts,*.tsx
---

---

## alwaysApply: true

# 全栈代码约定（魔法日记本）

本文件约定**写代码时的具体做法**（风格、目录、API、测试写法等）；项目目标、技术栈清单、OpenSpec/TDD 协作流程见 **project-context**。

## 通用风格

- 默认使用 TypeScript，避免裸 `any`；类型和接口放在合适的位置：与业务强相关的可以放在同文件，通用类型可以抽到单独文件。
- 组件命名用 PascalCase；路由和文件命名遵循 Next.js 习惯（如 `page.tsx`, `layout.tsx`），业务文件可以使用简洁的 kebab-case。

## Next.js 使用方式

- 使用 App Router，在 `app/` 下\*\*按「功能 / 路由」\*\*组织结构，而不是把所有东西堆在一个文件夹里。
- 能做成服务端组件就优先用服务端组件；只有确实需要交互或浏览器 API 时，才加 `"use client"`。
- API 或后端逻辑放在 `app/api/*` 路由或 Server Actions 中，对外返回清晰的 HTTP 状态码和 JSON 结构，方便前端处理和排查问题。

## 数据与 Prisma

- 数据结构统一在 `prisma/schema.prisma` 里维护，修改后记得执行 `prisma generate`。
- 只在服务端（API 路由 / Server Actions / 专门的 service 模块）中调用 Prisma，不在客户端组件里直接操作数据库。
- 对涉及用户权限或隐私的数据访问，优先通过服务端封装好的函数来做，并明确检查当前用户身份。

## AI

- 人设提示词、系统 prompt 集中放在一处（例如 `lib/ai/prompt.ts`），便于维护与展示。

## 测试（遵循项目上下文中的 TDD、BDD 与测试框架约定）

- **测试框架**：Vitest（单测与集成测运行器）+ Supertest（在 Vitest 中测 HTTP API）+ Playwright（E2E）。单测/集成测用 Vitest 写；测 API 时用 Supertest 发请求并在 Vitest 里断言；E2E 用 Playwright 单独跑。
- **写测试时**：与 spec 中的 Scenario 一一对应（一个 Scenario 对应一个 `it(...)`）；GIVEN → 准备数据/环境，WHEN → 执行操作，THEN → 断言。
- 测试文件命名清晰，如 `*.test.ts` / `*.spec.ts`，可与源码同目录或放在 `__tests__` 中，保证「一眼能看出在测什么」。重要业务逻辑、数据处理和关键 API 必须有对应测试。

## 代码风格与可维护性

- 每个组件或模块尽量只负责一件事；可复用逻辑抽成自定义 hooks 或独立的 server / service 函数。
- 错误处理清楚：接口返回明确错误信息与状态码；前端在合适位置做基础反馈（toast / error message），避免静默失败。关键路径可加适度日志或 error boundary，便于排查。
- 关键技术选型与核心实现处，用简短注释说明「为什么这样选」和「这段在做什么」，保证代码的生产级健壮性与可维护性。
