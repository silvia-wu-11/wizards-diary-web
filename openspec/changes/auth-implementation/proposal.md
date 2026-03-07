# Auth 实现 · 变更提案

## 变更 ID
`auth-implementation`

## 目标
基于 [openspec/specs/auth/spec.md](../../specs/auth/spec.md) 实现用户认证功能，使未登录用户无法访问日记等需鉴权功能，已登录用户可正常使用应用。

## 范围
- 登录（邮箱 + 密码）
- 注册（邮箱 + 密码 + 确认密码 + 昵称）
- 登出
- 路由保护（未登录重定向至登录页）
- Session 持久化

## 不在此次范围
- 忘记密码
- 邮箱验证
- OAuth 第三方登录（如 Google、GitHub）

## 依赖
- 行为规格：`openspec/specs/auth/spec.md`
- 技术设计：见本 change 的 `design.md`

## 协作约定
- 实现前先阅读 `spec.md` 与 `design.md`
- 按 TDD：先写测试（对应 spec 中的 Scenario），再实现直到通过
- 若实现中发现需求/设计需调整，优先更新 spec/design，再改代码
