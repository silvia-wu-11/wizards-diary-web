# OpenSpec · 魔法日记本

本目录存放需求规格与变更设计，供实现与测试时参考。

## 当前能力规格 (Specs)

| 领域 | 规格 | 说明 |
|------|------|------|
| auth | [specs/auth/spec.md](specs/auth/spec.md) | 登录、注册、登出、路由保护 |
| diary-entry | [specs/diary-entry/spec.md](specs/diary-entry/spec.md) | 日记创建、更新、删除、后端持久化 |
| diary-book | [specs/diary-book/spec.md](specs/diary-book/spec.md) | 日记本创建、删除、后端持久化 |
| diary-list | [specs/diary-list/spec.md](specs/diary-list/spec.md) | 日记列表分页、日期范围筛选、组合筛选、关键词搜索 |
| hybrid-search | [specs/hybrid-search/spec.md](specs/hybrid-search/spec.md) | 混合搜索：结合精确匹配与向量语义检索 |
| ai-chat | [specs/ai-chat/spec.md](specs/ai-chat/spec.md) | 基于日记数据的 AI 对话（老朋友） |
| memory-engine | [specs/memory-engine/spec.md](specs/memory-engine/spec.md) | 个人记忆引擎：Core Memory + 向量化 + RAG 对话 |
| onboarding | [specs/onboarding/spec.md](specs/onboarding/spec.md) | 新用户引导（注册/登录 → 创建日记本 → 创建第一篇日记） |

## 进行中的变更 (Changes)

| 变更 ID | 提案 | 设计 | 任务 |
|---------|------|------|------|
| **auth-implementation** | [proposal](changes/auth-implementation/proposal.md) | [design](changes/auth-implementation/design.md) | [tasks](changes/auth-implementation/tasks.md) |
| **diary-backend-persistence** | [proposal](changes/diary-backend-persistence/proposal.md) | [design](changes/diary-backend-persistence/design.md) | [tasks](changes/diary-backend-persistence/tasks.md) |
| **diary-list-pagination-search** | [proposal](changes/diary-list-pagination-search/proposal.md) | [design](changes/diary-list-pagination-search/design.md) | [tasks](changes/diary-list-pagination-search/tasks.md) |
| **onboarding-new-user-guide** | [proposal](changes/onboarding-new-user-guide/proposal.md) | [design](changes/onboarding-new-user-guide/design.md) | [tasks](changes/onboarding-new-user-guide/tasks.md) |

**开发 auth 时**：先读 `specs/auth/spec.md` 与 `changes/auth-implementation/design.md`，按 `tasks.md` 顺序执行，遵循 TDD（先写测再实现）。

**开发日记后端持久化时**：先读 `specs/diary-entry/spec.md`、`specs/diary-book/spec.md` 与 `changes/diary-backend-persistence/design.md`，按 `tasks.md` 顺序执行，遵循 TDD。

**开发日记列表分页与搜索时**：先读 `specs/diary-list/spec.md` 与 `changes/diary-list-pagination-search/design.md`，按 `tasks.md` 顺序执行，遵循 TDD。

**开发新用户引导时**：先读 `specs/onboarding/spec.md` 与 `changes/onboarding-new-user-guide/design.md`，按 `tasks.md` 顺序执行，遵循 TDD。

## 协作约定

- 实现前：读相关 spec 与 change 的 design
- 开发中：Scenario ↔ 测试用例一一对应
- 需求变更：优先更新 spec/design，再改代码
