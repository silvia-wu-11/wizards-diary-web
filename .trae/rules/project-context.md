---
description: 魔法日记本项目目标、技术栈与 Vibe Coding 上下文
alwaysApply: true
---

# 魔法日记本 · 项目上下文

## 我想做的项目

- **一句话**：这是一个 AI native 的 Web 全栈应用「魔法氛围日记本」，整体灵感来自魔法世界氛围，但会刻意避开直接使用哈利波特 IP，以避免侵权。
- **当前阶段**：项目已完成 0-1 的建设，MVP 版本功能已开发完毕。当前的重点是持续迭代功能、优化用户体验与代码质量。

## 已确定的技术栈

- **框架**：Next.js（App Router）全栈
- **AI 能力**：火山方舟 Ark API（流式、多轮对话）
- **样式**：Tailwind CSS
- **数据层**：PostgreSQL + Prisma ORM
- **认证**：NextAuth.js
- **测试框架**：Vitest（单测/集成）+ Supertest（API 集成）+ Playwright（E2E）
- **工程质量**：TDD（尽量让测试与实现同步推进）

## Vibe Coding 合作方式

- **小步快跑**：每次改动保持能运行、能验证，避免一次改很多导致难以排错。
- **先跑通再完善**：新功能先实现一条清晰的 happy path，再补充错误处理和边界情况。
- **代码质量**：在能做到的前提下，保持代码结构清晰、命名规范，合理拆分文件。

## 开发工作流

- 本项目采用 SDD + BDD + TDD 的全栈开发工作流。
- **核心约束**：在开发新功能、修改核心业务逻辑或建立新的 OpenSpec Change 时，**请直接调用 `wizards-diary-workflow` Skill**。
- 有关 `openspec/` 目录结构、`tasks.md` 任务拆解、BDD 规范说明以及红绿重构等具体执行细节，均已沉淀至该专属 Skill 中。
