---
name: "wizards-diary-workflow"
description: "执行 Wizards Diary 项目专属的 OpenSpec SDD+BDD+TDD 完整开发工作流。在开发新功能、修改核心业务逻辑或建立新的 OpenSpec Change 时调用。"
---

# 魔法日记本 · 专属开发工作流 (Wizards Diary Workflow)

这是一个结合了内置 OpenSpec 工具集与 SDD/BDD/TDD 理念的全栈开发工作流。专为 `Wizards Diary` 项目定制，高度契合 Next.js (App Router) + Prisma + AI SDK 技术栈，以及 Vibe Coding 的“小步快跑”开发理念和面试向设计原则。

## 触发场景 (When to Use)

当用户提出以下需求时，请立即触发并严格遵循本 Skill 的流程：

- "我要开发一个新功能..."
- "帮我实现 xxx 的接口..."
- "我们需要修改当前 xxx 模块的行为..."
- 任何涉及前后端打通的实质性开发任务（微调样式和文案除外）。

---

## 核心工作流规范 (Workflow Steps)

本工作流强依赖系统内置的 **OpenSpec** 系列 Skill（`openspec-explore`、`openspec-apply-change`、`openspec-archive-change`）。请按以下阶段依次推进：

### 1. 探索与设计阶段 (SDD & BDD)

在动手写代码前，必须先进行设计和任务规划：

- **核心动作**：直接调用 `openspec-explore` 进入探索模式，与用户探讨方案并生成/更新 OpenSpec 文档（`proposal.md`, `design.md`, `tasks.md`, `specs/`）。
- **UI 设计约束 (重要)**：凡是开发新功能，或对已有功能做调整且涉及页面、组件、交互、动效、文案等任何 UI 设计与实现，必须同步调用 `magic-diary-ui-guidelines` Skill，确保视觉风格、英文文案与交互体验符合项目统一规范。
- **项目专属规范 (BDD)**：在更新 `openspec/specs/<domain>/spec.md` 时，严格要求使用 **Requirement + GIVEN / WHEN / THEN** 的句式描述系统行为，作为后续测试用例的唯一事实来源。

### 2. 任务执行与 TDD 阶段

设计完成后，进入实际的开发阶段：

- **核心动作**：直接调用 `openspec-apply-change` 顺次执行 `tasks.md` 中的开发任务。
- **项目专属规范 (TDD 红绿重构)**：
  - **Red**：根据 BDD Spec，先写出测试用例（Vitest/Supertest/Playwright），确保测试失败。
  - **Green**：编写能让测试通过的最简单代码。
  - **Playwright E2E 约定 (重要)**：依赖登录态的业务 E2E 应复用项目既有的 `setup + storageState` 方案；测试账号统一来自根目录 `.env`，不要在 spec 中硬编码。
  - **面试定位 (重要)**：遇到后端/数据库/Auth等逻辑时，请提供“可直接复制”的示例代码，并主动用 1～3 句自然语言解释关键设计点，方便用户在面试中转述。
  - **Refactor**：优化代码结构、命名和文件拆分，使其“面试友好”。
- **文档同步**：若实现中发现设计需调整，应优先更新 spec/design（可配合 explore），再改代码，保持文档与代码绝对一致。

### 3. 归档与清理阶段

当 Change 的开发和验证全部完成：

- **核心动作**：直接调用 `openspec-archive-change` 执行归档操作。将新完成的能力同步至全局的 `openspec/README.md`，并清理该变更的开发状态。
- **项目门面同步 (按需)**：检查本次变更是否引入了新的**环境变量**、**npm 脚本**、**目录结构变化**或**核心产品特性**。如果有，**必须**同步更新根目录的 `README.md`，确保项目的对外说明与实际代码能力保持一致。

---

**给 Agent 的提示**：

1. **优先使用工具**：不要手动去创建和管理 OpenSpec 的目录与文件变更，请把底层的文件生成与状态流转交由 `openspec-*` 系列工具处理。
2. **遵守 Vibe Coding**：保持“小步快跑”，每次改动都确保可运行、可验证。先跑通清晰的 Happy Path，再补充错误处理和边界情况。
