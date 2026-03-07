# 日记数据后端持久化 · 变更提案

## 变更 ID
`diary-backend-persistence`

## 目标
将日记相关数据（日记保存、日记本创建、日记本删除）从浏览器端存储（localStorage / IndexedDB）迁移至基于 PostgreSQL 的后端服务，实现真正的数据持久化与多端同步能力。

## 背景
当前实现中：
- **日记条目**（DiaryEntry）：通过 Zustand store 写入 localStorage（文本元数据）和 IndexedDB（含 base64 图片）
- **日记本**（DiaryBook）：同样存储在 localStorage 与 IndexedDB
- 数据仅存在于单设备浏览器，换设备或清缓存即丢失；且与用户身份无关联

## 范围

### 本次实现
- **日记保存**：创建、更新、删除日记条目，持久化到 PostgreSQL
- **日记本创建**：创建新日记本，持久化到 PostgreSQL
- **日记本删除**：删除日记本及其下所有日记，持久化到 PostgreSQL
- **数据加载**：应用启动时从后端 API 拉取当前用户的日记本与日记列表
- **用户关联**：所有日记本与日记均关联到当前登录用户（User）
- **图片存储**：图片上传至 Supabase Storage，日记中存储图片 URL 数组

### 不在此次范围
- 从 localStorage/IndexedDB 到后端的**数据迁移**（用户可重新创建数据，或后续单独做迁移工具）
- 日记列表分页、搜索、筛选等高级能力

## 依赖
- 行为规格：`openspec/specs/diary-entry/spec.md`、`openspec/specs/diary-book/spec.md`
- 技术设计：见本 change 的 `design.md`
- 前置：Auth 已实现（用户登录后可获得 session，用于鉴权）

## 协作约定
- 实现前先阅读 `spec.md` 与 `design.md`
- 按 TDD：先写测试（对应 spec 中的 Scenario），再实现直到通过
- 若实现中发现需求/设计需调整，优先更新 spec/design，再改代码
