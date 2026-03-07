# OpenSpec · 魔法日记本

本目录存放需求规格与变更设计，供实现与测试时参考。

## 当前能力规格 (Specs)

| 领域 | 规格 | 说明 |
|------|------|------|
| auth | [specs/auth/spec.md](specs/auth/spec.md) | 登录、注册、登出、路由保护 |
| diary-entry | [specs/diary-entry/spec.md](specs/diary-entry/spec.md) | 日记创建、必填校验、用户关联 |

## 进行中的变更 (Changes)

| 变更 ID | 提案 | 设计 | 任务 |
|---------|------|------|------|
| **auth-implementation** | [proposal](changes/auth-implementation/proposal.md) | [design](changes/auth-implementation/design.md) | [tasks](changes/auth-implementation/tasks.md) |

**开发 auth 时**：先读 `specs/auth/spec.md` 与 `changes/auth-implementation/design.md`，按 `tasks.md` 顺序执行，遵循 TDD（先写测再实现）。

## 协作约定

- 实现前：读相关 spec 与 change 的 design
- 开发中：Scenario ↔ 测试用例一一对应
- 需求变更：优先更新 spec/design，再改代码
